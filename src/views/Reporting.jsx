import { useQuery } from '@tanstack/react-query'
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
  AreaChart,
  Area
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Egg,
  Users,
  Calendar,
  Download
} from 'lucide-react'
import { supabase } from '../supabase/supabase'
import { formatCurrency } from '../utils/formatting'

const fetchProductionData = async (days = 30) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) throw error
  return data?.map(record => ({
    date: new Date(record.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    collected: record.eggs_collected,
    broken: record.eggs_broken,
    good: record.eggs_collected - record.eggs_broken
  })) || []
}

const fetchFinancialData = async (days = 30) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('finances')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) throw error
  return data
}

const fetchFlockSummary = async () => {
  const { data, error } = await supabase
    .from('flocks')
    .select('type, current_quantity, initial_quantity, status')

  if (error) throw error

  const summary = {
    total: 0,
    active: 0,
    byType: {}
  }

  data?.forEach(flock => {
    const qty = flock.current_quantity || flock.initial_quantity || 0
    summary.total += qty
    if (flock.status === 'active') {
      summary.active += qty
    }
    summary.byType[flock.type] = (summary.byType[flock.type] || 0) + qty
  })

  return summary
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

export default function Reporting() {
  const { data: productionData, isLoading: loadingProduction } = useQuery({
    queryKey: ['productionReport'],
    queryFn: () => fetchProductionData(30)
  })

  const { data: financialData, isLoading: loadingFinancial } = useQuery({
    queryKey: ['financialReport'],
    queryFn: () => fetchFinancialData(30)
  })

  const { data: flockSummary, isLoading: loadingFlock } = useQuery({
    queryKey: ['flockSummary'],
    queryFn: fetchFlockSummary
  })

  // Process financial data
  const incomeData = financialData
    ?.filter(t => t.transaction_type === 'income')
    .reduce((acc, t) => {
      const date = new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      acc[date] = (acc[date] || 0) + Number(t.amount)
      return acc
    }, {})

  const expenseData = financialData
    ?.filter(t => t.transaction_type === 'expense')
    .reduce((acc, t) => {
      const date = new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      acc[date] = (acc[date] || 0) + Number(t.amount)
      return acc
    }, {})

  const allDates = [...new Set([...Object.keys(incomeData || {}), ...Object.keys(expenseData || {})])].sort()

  const financialChartData = allDates.map(date => ({
    date,
    income: incomeData?.[date] || 0,
    expense: expenseData?.[date] || 0
  }))

  const totalIncome = Object.values(incomeData || {}).reduce((a, b) => a + b, 0)
  const totalExpenses = Object.values(expenseData || {}).reduce((a, b) => a + b, 0)
  const netProfit = totalIncome - totalExpenses

  // Flock distribution data
  const flockChartData = Object.entries(flockSummary?.byType || {}).map(([name, value]) => ({
    name,
    value
  }))

  return (
    <div className="reporting">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-muted)' }}>Comprehensive insights into your poultry farm performance.</p>
        </div>
        <button className="btn btn-outline">
          <Download size={18} />
          Export Report
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Birds</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="var(--color-primary)" />
            {loadingFlock ? '...' : flockSummary?.total.toLocaleString()}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            {flockSummary?.active.toLocaleString()} active
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-label">Eggs (30 days)</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Egg size={28} color="var(--color-secondary)" />
            {loadingProduction ? '...' : productionData?.reduce((sum, d) => sum + d.collected, 0).toLocaleString()}
          </div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            Production
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={28} color="var(--color-accent)" />
            {loadingFinancial ? '...' : formatCurrency(totalIncome)}
          </div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            Revenue
          </div>
        </div>

        <div className={`stat-card ${netProfit >= 0 ? 'success' : 'danger'}`}>
          <div className="stat-label">Net Profit</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {netProfit >= 0 ? <TrendingUp size={28} color="var(--color-secondary)" /> : <TrendingDown size={28} color="var(--status-error)" />}
            {loadingFinancial ? '...' : formatCurrency(netProfit)}
          </div>
          <div className={`stat-change ${netProfit >= 0 ? 'positive' : 'negative'}`}>
            {netProfit >= 0 ? 'Profit' : 'Loss'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Chart */}
        <div className="chart-container">
          <div className="card-header">
            <h3 className="card-title">Egg Production Trend</h3>
          </div>
          <div style={{ height: '300px' }}>
            {loadingProduction ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            ) : productionData?.length === 0 ? (
              <div className="empty-state">
                <p>No production data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionData}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-lg)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="var(--color-secondary)"
                    fillOpacity={1}
                    fill="url(#colorCollected)"
                    name="Eggs Collected"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Financial Chart */}
        <div className="chart-container">
          <div className="card-header">
            <h3 className="card-title">Income vs Expenses</h3>
          </div>
          <div style={{ height: '300px' }}>
            {loadingFinancial ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            ) : financialChartData.length === 0 ? (
              <div className="empty-state">
                <p>No financial data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-lg)'
                    }}
                  />
                  <Bar dataKey="income" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="var(--status-error)" radius={[4, 4, 0, 0]} name="Expense" />
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
            {loadingFlock ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            ) : flockChartData.length === 0 ? (
              <div className="empty-state">
                <p>No flock data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={flockChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {flockChartData.map((entry, index) => (
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

        {/* Summary Stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Summary</h3>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Average Daily Production</span>
              <span style={{ fontWeight: 600 }}>
                {loadingProduction ? '...' : Math.round(productionData?.reduce((sum, d) => sum + d.collected, 0) / (productionData?.length || 1)).toLocaleString()} eggs
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Broken Eggs</span>
              <span style={{ fontWeight: 600, color: 'var(--status-error)' }}>
                {loadingProduction ? '...' : productionData?.reduce((sum, d) => sum + d.broken, 0).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Profit Margin</span>
              <span style={{ fontWeight: 600, color: totalIncome > 0 ? 'var(--status-success)' : 'var(--text-muted)' }}>
                {loadingFinancial ? '...' : totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Flocks</span>
              <span style={{ fontWeight: 600 }}>
                {loadingFlock ? '...' : flockSummary?.active.toLocaleString()} birds
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
