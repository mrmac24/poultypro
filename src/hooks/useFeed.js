import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase/supabase'

// Feed Inventory Hooks
const fetchFeedInventory = async () => {
  const { data, error } = await supabase
    .from('feed_inventory')
    .select('*')
    .order('feed_type', { ascending: true })

  if (error) throw error
  return data
}

const updateFeedInventory = async ({ id, ...updates }) => {
  const { data, error } = await supabase
    .from('feed_inventory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()

  if (error) throw error
  return data[0]
}

const restockFeed = async ({ id, amount, costPerKg }) => {
  const { data: current } = await supabase
    .from('feed_inventory')
    .select('quantity_kg, cost_per_kg')
    .eq('id', id)
    .single()

  const newQuantity = (current?.quantity_kg || 0) + amount
  
  // Calculate weighted average cost
  const currentTotalCost = (current?.quantity_kg || 0) * (current?.cost_per_kg || 0)
  const newTotalCost = amount * costPerKg
  const weightedAvgCost = newQuantity > 0 ? (currentTotalCost + newTotalCost) / newQuantity : costPerKg

  const { data, error } = await supabase
    .from('feed_inventory')
    .update({
      quantity_kg: newQuantity,
      cost_per_kg: weightedAvgCost,
      last_restocked: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()

  if (error) throw error
  return data[0]
}

export function useFeedInventory() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['feedInventory'],
    queryFn: fetchFeedInventory,
    staleTime: 1000 * 60 * 2 // 2 minutes
  })

  const updateMutation = useMutation({
    mutationFn: updateFeedInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedInventory'] })
    }
  })

  const restockMutation = useMutation({
    mutationFn: restockFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedInventory'] })
    }
  })

  // Helper to check if any feed is low on stock
  const lowStockItems = query.data?.filter(item => 
    item.quantity_kg <= (item.minimum_threshold_kg || 50)
  ) || []

  const isLowStock = lowStockItems.length > 0

  return {
    ...query,
    updateMutation,
    restockMutation,
    lowStockItems,
    isLowStock
  }
}

// Feed Consumption Hooks
const fetchFeedConsumption = async (flockId, limit = 30) => {
  let query = supabase
    .from('feed_consumption')
    .select('*, flock:flocks(type, current_quantity)')
    .order('date', { ascending: false })
    .limit(limit)

  if (flockId) {
    query = query.eq('flock_id', flockId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

const logFeedConsumption = async ({ flockId, feedType, amount, date, notes }) => {
  // Start a transaction to log consumption and deduct from inventory
  const { data: inventory } = await supabase
    .from('feed_inventory')
    .select('*')
    .eq('feed_type', feedType)
    .single()

  if (!inventory) throw new Error(`Feed type ${feedType} not found in inventory`)
  
  if (inventory.quantity_kg < amount) {
    throw new Error(`Insufficient ${feedType} in stock. Available: ${inventory.quantity_kg}kg, Requested: ${amount}kg`)
  }

  // Insert consumption record
  const { data: consumption, error: consumptionError } = await supabase
    .from('feed_consumption')
    .insert([{
      flock_id: flockId,
      date: date || new Date().toISOString().split('T')[0],
      feed_type: feedType,
      amount_consumed_kg: amount,
      notes
    }])
    .select()

  if (consumptionError) throw consumptionError

  // Deduct from inventory
  const { error: inventoryError } = await supabase
    .from('feed_inventory')
    .update({
      quantity_kg: inventory.quantity_kg - amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', inventory.id)

  if (inventoryError) throw inventoryError

  return consumption[0]
}

export function useFeedConsumption(flockId = null, limit = 30) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['feedConsumption', flockId, limit],
    queryFn: () => fetchFeedConsumption(flockId, limit),
    staleTime: 1000 * 60 * 2
  })

  const logMutation = useMutation({
    mutationFn: logFeedConsumption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedConsumption'] })
      queryClient.invalidateQueries({ queryKey: ['feedInventory'] })
    }
  })

  // Calculate total consumption for the period
  const totalConsumption = query.data?.reduce((sum, record) => 
    sum + (record.amount_consumed_kg || 0), 0
  ) || 0

  return {
    ...query,
    logMutation,
    totalConsumption
  }
}
