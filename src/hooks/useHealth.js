import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase/supabase'

// Health Records Hooks
const fetchHealthRecords = async (flockId = null, recordType = null, limit = 100) => {
  let query = supabase
    .from('health_records')
    .select('*, flock:flocks(type, current_quantity, initial_quantity)')
    .order('date', { ascending: false })
    .limit(limit)

  if (flockId) {
    query = query.eq('flock_id', flockId)
  }

  if (recordType) {
    query = query.eq('record_type', recordType)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

const createHealthRecord = async (record) => {
  const { data, error } = await supabase
    .from('health_records')
    .insert([record])
    .select()

  if (error) throw error
  return data[0]
}

const updateHealthRecord = async ({ id, ...updates }) => {
  const { data, error } = await supabase
    .from('health_records')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  return data[0]
}

const deleteHealthRecord = async (id) => {
  const { error } = await supabase
    .from('health_records')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Log mortality and update flock count
const logMortality = async ({ flockId, count, date, cause, notes }) => {
  // Get current flock data
  const { data: flock, error: flockError } = await supabase
    .from('flocks')
    .select('current_quantity, initial_quantity')
    .eq('id', flockId)
    .single()

  if (flockError) throw flockError

  const currentQty = flock.current_quantity || flock.initial_quantity || 0
  const newQty = Math.max(0, currentQty - count)

  // Update flock quantity
  const { error: updateError } = await supabase
    .from('flocks')
    .update({ 
      current_quantity: newQty,
      updated_at: new Date().toISOString()
    })
    .eq('id', flockId)

  if (updateError) throw updateError

  // Create health record for mortality
  const { data: record, error: recordError } = await supabase
    .from('health_records')
    .insert([{
      flock_id: flockId,
      date: date || new Date().toISOString().split('T')[0],
      record_type: 'Mortality',
      description: `Lost ${count} bird(s). ${cause || ''} ${notes || ''}`.trim(),
      cost: 0
    }])
    .select()

  if (recordError) throw recordError

  return { record: record[0], newQuantity: newQty }
}

// Fetch upcoming vaccinations
const fetchUpcomingVaccinations = async (days = 30) => {
  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  const { data, error } = await supabase
    .from('health_records')
    .select('*, flock:flocks(type)')
    .eq('record_type', 'Vaccination')
    .gte('next_due_date', today)
    .lte('next_due_date', futureDate.toISOString().split('T')[0])
    .order('next_due_date', { ascending: true })

  if (error) throw error
  return data
}

export function useHealthRecords(flockId = null, recordType = null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['healthRecords', flockId, recordType],
    queryFn: () => fetchHealthRecords(flockId, recordType),
    staleTime: 1000 * 60 * 2
  })

  const createMutation = useMutation({
    mutationFn: createHealthRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] })
      queryClient.invalidateQueries({ queryKey: ['upcomingVaccinations'] })
    }
  })

  const updateMutation = useMutation({
    mutationFn: updateHealthRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] })
      queryClient.invalidateQueries({ queryKey: ['upcomingVaccinations'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHealthRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] })
    }
  })

  const mortalityMutation = useMutation({
    mutationFn: logMortality,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] })
      queryClient.invalidateQueries({ queryKey: ['flocks'] })
      queryClient.invalidateQueries({ queryKey: ['totalBirds'] })
      queryClient.invalidateQueries({ queryKey: ['flockDistribution'] })
    }
  })

  // Calculate mortality stats
  const mortalityRecords = query.data?.filter(r => r.record_type === 'Mortality') || []
  const totalDeaths = mortalityRecords.reduce((sum, r) => {
    const match = r.description?.match(/Lost (\d+) bird/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0)

  return {
    ...query,
    createMutation,
    updateMutation,
    deleteMutation,
    mortalityMutation,
    mortalityRecords,
    totalDeaths
  }
}

export function useUpcomingVaccinations(days = 30) {
  return useQuery({
    queryKey: ['upcomingVaccinations', days],
    queryFn: () => fetchUpcomingVaccinations(days),
    staleTime: 1000 * 60 * 5
  })
}

// Environmental Logs Hooks
const fetchEnvironmentalLogs = async (days = 30) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('environmental_logs')
    .select('*, recorder:profiles(first_name, last_name)')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .order('time_of_day', { ascending: false })

  if (error) throw error
  return data
}

const createEnvironmentalLog = async (log) => {
  const { data, error } = await supabase
    .from('environmental_logs')
    .insert([log])
    .select()

  if (error) throw error
  return data[0]
}

export function useEnvironmentalLogs(days = 30) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['environmentalLogs', days],
    queryFn: () => fetchEnvironmentalLogs(days),
    staleTime: 1000 * 60 * 2
  })

  const createMutation = useMutation({
    mutationFn: createEnvironmentalLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmentalLogs'] })
    }
  })

  // Calculate averages
  const logs = query.data || []
  const avgTemperature = logs.length > 0 
    ? logs.reduce((sum, l) => sum + (l.avg_temperature || 0), 0) / logs.length 
    : 0
  const avgHumidity = logs.length > 0 
    ? logs.reduce((sum, l) => sum + (l.humidity_percentage || 0), 0) / logs.length 
    : 0

  return {
    ...query,
    createMutation,
    avgTemperature,
    avgHumidity
  }
}
