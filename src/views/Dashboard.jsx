import { useQuery } from '@tanstack/react-query'
import {
  Egg,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Scale,
  Target,
  User
} from 'lucide-react'
import { supabase } from '../supabase/supabase'
import { formatCurrency } from '../utils/formatting'
import { useAdvancedMetrics, useEnvironmentalCorrelation } from '../hooks/useMetrics'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area
} from 'recharts'

// Fetch functions
const fetchTotalBirds = async () => {
  const { data, error } = await supabase
    .from('flocks')
    .select('current_quantity, initial_quantity, type')
    .eq('status', 'active')

  if (error) throw error

  const breakdown = {}
  let total = 0

  data?.forEach(flock => {
    const quantity = flock.current_quantity || flock.initial_quantity || 0
    total += quantity
    breakdown[flock.type] = (breakdown[flock.type] || 0) + quantity
  })

  return { total, breakdown }
}

const fetchTodaysEggs = async () => {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('daily_records')
    .select('eggs_collected, eggs_broken')
    .eq('date', today)

  if (error) throw error
  if (!data || data.length === 0) return { eggs_collected: 0, eggs_broken: 0 }

  return data.reduce((acc, curr) => ({
    eggs_collected: acc.eggs_collected + curr.eggs_collected,
    eggs_broken: acc.eggs_broken + curr.eggs_broken
  }), { eggs_collected: 0, eggs_broken: 0 })
}

const fetchFinancialBalance = async () => {
  const { data, error } = await supabase
    .from('finances')
    .select('transaction_type, amount')

  if (error) throw error

  const income = data
    ?.filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  const expenses = data
    ?.filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  return { income, expenses, balance: income - expenses }
}

const fetchRecentEggProduction = async () => {
  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .order('date', { ascending: false })
    .limit(7)

  if (error) throw error
  return data?.reverse() || []
}

const fetchFlockDistribution = async () => {
  const { data, error } = await supabase
    .from('flocks')
    .select('type, current_quantity, initial_quantity')
    .eq('status', 'active')

  if (error) throw error

  const distribution = {}
  data?.forEach(flock => {
    distribution[flock.type] = (distribution[flock.type] || 0) + (flock.current_quantity || flock.initial_quantity || 0)
  })

  return Object.entries(distribution).map(([name, value]) => ({ name, value }))
}

const fetchUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Try to get from profiles table first
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      return { ...profile, email: user.email }
    }

    // Fallback to auth metadata
    return {
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      business_name: user.user_metadata?.business_name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      email: user.email
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

// Chicken Icon Component
const ChickenIcon = ({ size = 28, color = "var(--color-primary)" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Chicken head outline */}
    <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-3c1-1 2-3 2-5 0-4-3-7-7-7z" />
    {/* Eye */}
    <circle cx="9" cy="8" r="1.5" fill={color} />
    {/* Beak */}
    <path d="M12 11l2 1.5-2 1.5" />
    {/* Comb (red part on top) */}
    <path d="M8 4c0-1 1-2 2-2s2 1 2 2" />
    <path d="M12 3c0-1 1-1.5 1.5-1s.5 1 .5 1.5" />
  </svg>
)

export default function Dashboard() {
  const { data: totalBirds, isLoading: loadingBirds } = useQuery({
    queryKey: ['totalBirds'],
    queryFn: fetchTotalBirds
  })

  const { data: todaysEggs, isLoading: loadingEggs } = useQuery({
    queryKey: ['todaysEggs'],
    queryFn: fetchTodaysEggs
  })

  const { data: finances, isLoading: loadingFinances } = useQuery({
    queryKey: ['finances'],
    queryFn: fetchFinancialBalance
  })

  const { data: eggProduction, isLoading: loadingProduction } = useQuery({
    queryKey: ['eggProduction'],
    queryFn: fetchRecentEggProduction
  })

  const { data: flockDistribution, isLoading: loadingDistribution } = useQuery({
    queryKey: ['flockDistribution'],
    queryFn: fetchFlockDistribution
  })

  // Advanced metrics
  const { data: metrics, isLoading: loadingMetrics } = useAdvancedMetrics(30)
  const { data: envCorrelation, isLoading: loadingEnv } = useEnvironmentalCorrelation(30)

  // User profile
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile
  })

  const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}`.trim() : 'User'
  const businessName = userProfile?.business_name || 'Poultry Manager'

  return (
    <div className="dashboard">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Welcome back, {userName}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Here's what's happening with your {businessName.toLowerCase()} today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt="Profile"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--color-primary)'
              }}
            />
          ) : (
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <User size={24} />
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Metrics Groups - Side by Side Inline Blocks */}
      <div className="dashboard-sections" style={{ display: 'flex', gap: '1.5rem', marginBottom: '3rem', flexWrap: 'wrap' }}>

        {/* Section 1: Performance Metrics */}
        <section style={{ flex: '1 1 450px', minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Activity size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Performance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card" style={{ padding: '1.5rem 1rem' }}>
              <div className="stat-label" style={{ fontSize: '0.7rem' }}>Lay Rate</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.5rem' }}>
                <Target size={24} color="var(--color-primary)" />
                {loadingMetrics ? '...' : `${metrics?.layRate || 0}%`}
              </div>
              <div className="stat-change positive" style={{ fontSize: '0.75rem' }}>
                30-day avg
              </div>
            </div>

            <div className="stat-card success" style={{ padding: '1.5rem 1rem' }}>
              <div className="stat-label" style={{ fontSize: '0.7rem' }}>FCR</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.5rem' }}>
                <Scale size={24} color="var(--color-secondary)" />
                {loadingMetrics ? '...' : metrics?.fcr || 0}
              </div>
              <div className="stat-change" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                kg / egg
              </div>
            </div>

            <div className="stat-card warning" style={{ padding: '1.5rem 1rem' }}>
              <div className="stat-label" style={{ fontSize: '0.7rem' }}>Balance</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.25rem' }}>
                <DollarSign size={20} color="var(--color-accent)" />
                {loadingFinances ? '...' : formatCurrency(finances?.balance || 0).split('.')[0]}
              </div>
              <div className={`stat-change ${finances?.balance >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.75rem' }}>
                {finances?.balance >= 0 ? 'Profit' : 'Loss'}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Operations & Health */}
        <section style={{ flex: '1 1 450px', minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Activity size={18} color="var(--color-secondary)" />
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Operations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card" style={{ padding: '1.5rem 1rem' }}>
              <div className="stat-label" style={{ fontSize: '0.7rem' }}>Birds</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.5rem' }}>
                <ChickenIcon size={24} />
                {loadingBirds ? '...' : totalBirds?.total?.toLocaleString()}
              </div>
              <div className="stat-change positive" style={{ fontSize: '0.75rem' }}>
                Active
              </div>
            </div>

            <div className="stat-card danger" style={{ padding: '1.5rem 1rem' }}>
              <div className="stat-label" style={{ fontSize: '0.7rem' }}>Mortality</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-error)', fontSize: '1.5rem' }}>
                <Heart size={24} color="var(--status-error)" />
                {loadingMetrics ? '...' : `${metrics?.mortalityRate || 0}%`}
              </div>
              <div className="stat-change" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {metrics?.cumulativeDeaths || 0} deaths
              </div>
            </div>

            <div className="stat-card success" style={{ padding: '1.5rem 1rem' }}>
              <div className="stat-label" style={{ fontSize: '0.7rem' }}>Today</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.5rem' }}>
                <Egg size={24} color="var(--color-secondary)" />
                {loadingEggs ? '...' : todaysEggs?.eggs_collected}
              </div>
              <div className="stat-change" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {todaysEggs?.eggs_collected} collect
              </div>
            </div>
          </div>
        </section>
      </div>


      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Egg Production Chart */}
        <div className="chart-container">
          <div className="card-header">
            <h3 className="card-title">Egg Production (Last 7 Days)</h3>
          </div>
          <div style={{ height: '300px' }}>
            {loadingProduction ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eggProduction}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en', { weekday: 'short' })}
                    stroke="var(--text-muted)"
                  />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-lg)'
                    }}
                  />
                  <Bar dataKey="eggs_collected" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Flock Distribution */}
        <div className="chart-container">
          <div className="card-header">
            <h3 className="card-title">Flock Distribution</h3>
          </div>
          <div style={{ height: '300px' }}>
            {loadingDistribution ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            ) : flockDistribution?.length === 0 ? (
              <div className="empty-state">
                <p>No flock data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={flockDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {flockDistribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-lg)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Environmental Correlation Chart */}
      {envCorrelation?.data?.length > 0 && (
        <div className="chart-container" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Environmental Impact on Production</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <span>Avg Temp: {envCorrelation.avgTemp?.toFixed(1) || 'N/A'}°C</span>
              <span>Avg Humidity: {envCorrelation.avgHumidity?.toFixed(1) || 'N/A'}%</span>
            </div>
          </div>
          <div style={{ height: '300px' }}>
            {loadingEnv ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={envCorrelation.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    stroke="var(--text-muted)"
                  />
                  <YAxis yAxisId="left" stroke="var(--text-muted)" />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--color-accent)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-lg)'
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="eggs"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.3}
                    name="Eggs Collected"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="temperature"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    dot={false}
                    name="Temperature (°C)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    stroke="var(--status-info)"
                    strokeWidth={2}
                    dot={false}
                    name="Humidity (%)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
