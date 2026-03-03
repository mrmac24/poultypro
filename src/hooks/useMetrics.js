import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase/supabase'

// Calculate Feed Conversion Ratio (FCR)
// FCR = Total feed consumed / Total egg production (or meat weight)
// Lower is better (less feed per unit of output)
export const calculateFCR = (totalFeedKg, totalEggs) => {
  if (!totalEggs || totalEggs === 0) return 0
  return parseFloat((totalFeedKg / totalEggs).toFixed(2))
}

// Calculate Lay Rate Percentage
// Lay Rate = (Eggs collected / Current flock size) * 100
export const calculateLayRate = (eggsCollected, flockSize) => {
  if (!flockSize || flockSize === 0) return 0
  return parseFloat(((eggsCollected / flockSize) * 100).toFixed(1))
}

// Calculate Mortality Rate
// Mortality Rate = (Cumulative deaths / Initial flock size) * 100
export const calculateMortalityRate = (deaths, initialFlockSize) => {
  if (!initialFlockSize || initialFlockSize === 0) return 0
  return parseFloat(((deaths / initialFlockSize) * 100).toFixed(1))
}

// Calculate Average Daily Gain (for broilers)
export const calculateADG = (weightGain, days) => {
  if (!days || days === 0) return 0
  return parseFloat((weightGain / days).toFixed(2))
}

// Fetch data needed for advanced metrics
const fetchAdvancedMetrics = async (days = 30) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  // Fetch egg production data
  const { data: eggData, error: eggError } = await supabase
    .from('daily_records')
    .select('eggs_collected, eggs_broken, date')
    .gte('date', startDateStr)

  if (eggError) throw eggError

  // Fetch feed consumption data
  const { data: feedData, error: feedError } = await supabase
    .from('feed_consumption')
    .select('amount_consumed_kg, date')
    .gte('date', startDateStr)

  if (feedError) throw feedError

  // Fetch flock data
  const { data: flockData, error: flockError } = await supabase
    .from('flocks')
    .select('id, type, current_quantity, initial_quantity, status, date_added')
    .eq('status', 'active')

  if (flockError) throw flockError

  // Fetch health records (mortality)
  const { data: healthData, error: healthError } = await supabase
    .from('health_records')
    .select('description, date, record_type')
    .eq('record_type', 'Mortality')
    .gte('date', startDateStr)

  if (healthError) throw healthError

  // Calculate metrics
  const totalEggs = eggData?.reduce((sum, r) => sum + (r.eggs_collected || 0), 0) || 0
  const totalFeed = feedData?.reduce((sum, r) => sum + (r.amount_consumed_kg || 0), 0) || 0
  
  // Get hen count for lay rate calculation
  const henCount = flockData
    ?.filter(f => f.type === 'Hen')
    ?.reduce((sum, f) => sum + (f.current_quantity || f.initial_quantity || 0), 0) || 0

  // Calculate total initial flock size
  const totalInitialFlock = flockData?.reduce((sum, f) => 
    sum + (f.initial_quantity || f.current_quantity || 0), 0
  ) || 0

  // Calculate deaths in period
  const periodDeaths = healthData?.reduce((sum, r) => {
    const match = r.description?.match(/Lost (\d+) bird/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0) || 0

  // Calculate cumulative deaths (all time)
  const { data: allHealthData } = await supabase
    .from('health_records')
    .select('description')
    .eq('record_type', 'Mortality')

  const cumulativeDeaths = allHealthData?.reduce((sum, r) => {
    const match = r.description?.match(/Lost (\d+) bird/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0) || 0

  // Get total initial flock size from all flocks ever created
  const { data: allFlocks } = await supabase
    .from('flocks')
    .select('initial_quantity')

  const allTimeInitialFlock = allFlocks?.reduce((sum, f) => 
    sum + (f.initial_quantity || 0), 0
  ) || totalInitialFlock

  return {
    // Raw data
    totalEggs,
    totalFeedKg: totalFeed,
    currentHenCount: henCount,
    totalCurrentFlock: flockData?.reduce((sum, f) => 
      sum + (f.current_quantity || 0), 0
    ) || 0,
    periodDeaths,
    cumulativeDeaths,
    allTimeInitialFlock,
    
    // Calculated metrics
    fcr: calculateFCR(totalFeed, totalEggs),
    layRate: calculateLayRate(totalEggs, henCount),
    mortalityRate: calculateMortalityRate(cumulativeDeaths, allTimeInitialFlock),
    avgDailyEggs: Math.round(totalEggs / days),
    avgDailyFeed: parseFloat((totalFeed / days).toFixed(2)),
    
    // For charts
    dailyData: eggData?.map(r => ({
      date: r.date,
      eggs: r.eggs_collected || 0,
      broken: r.eggs_broken || 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date)),
    
    // Flock breakdown
    flockBreakdown: flockData?.map(f => ({
      id: f.id,
      type: f.type,
      current: f.current_quantity || 0,
      initial: f.initial_quantity || 0,
      dateAdded: f.date_added
    }))
  }
}

// Fetch environmental correlation data
const fetchEnvironmentalCorrelation = async (days = 30) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  // Get environmental data
  const { data: envData, error: envError } = await supabase
    .from('environmental_logs')
    .select('date, avg_temperature, humidity_percentage')
    .gte('date', startDateStr)

  if (envError) throw envError

  // Get egg production data
  const { data: eggData, error: eggError } = await supabase
    .from('daily_records')
    .select('date, eggs_collected')
    .gte('date', startDateStr)

  if (eggError) throw eggError

  // Merge data by date
  const mergedData = []
  const allDates = new Set([
    ...envData.map(d => d.date),
    ...eggData.map(d => d.date)
  ])

  allDates.forEach(date => {
    const env = envData.find(d => d.date === date)
    const egg = eggData.find(d => d.date === date)
    
    mergedData.push({
      date,
      temperature: env?.avg_temperature || null,
      humidity: env?.humidity_percentage || null,
      eggs: egg?.eggs_collected || 0
    })
  })

  // Calculate correlations
  const validTempData = mergedData.filter(d => d.temperature !== null && d.eggs > 0)
  const validHumidityData = mergedData.filter(d => d.humidity !== null && d.eggs > 0)

  return {
    data: mergedData.sort((a, b) => new Date(a.date) - new Date(b.date)),
    avgTemp: validTempData.length > 0 
      ? validTempData.reduce((sum, d) => sum + d.temperature, 0) / validTempData.length 
      : null,
    avgHumidity: validHumidityData.length > 0
      ? validHumidityData.reduce((sum, d) => sum + d.humidity, 0) / validHumidityData.length
      : null,
    dataPoints: mergedData.length
  }
}

export function useAdvancedMetrics(days = 30) {
  return useQuery({
    queryKey: ['advancedMetrics', days],
    queryFn: () => fetchAdvancedMetrics(days),
    staleTime: 1000 * 60 * 2,
    enabled: days > 0
  })
}

export function useEnvironmentalCorrelation(days = 30) {
  return useQuery({
    queryKey: ['environmentalCorrelation', days],
    queryFn: () => fetchEnvironmentalCorrelation(days),
    staleTime: 1000 * 60 * 5
  })
}

// Calculation functions are already exported above
