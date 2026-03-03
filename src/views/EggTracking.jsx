import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit2, Trash2, Egg, Calendar, AlertCircle, X, CheckCircle } from 'lucide-react'
import { supabase } from '../supabase/supabase'
import { formatDate } from '../utils/formatting'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

const fetchDailyRecords = async () => {
  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .order('date', { ascending: false })
    .limit(30)
  
  if (error) throw error
  return data
}

const createDailyRecord = async (record) => {
  const { data, error } = await supabase
    .from('daily_records')
    .insert([record])
    .select()
  
  if (error) throw error
  return data[0]
}

const updateDailyRecord = async ({ id, ...updates }) => {
  const { data, error } = await supabase
    .from('daily_records')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

const deleteDailyRecord = async (id) => {
  const { error } = await supabase
    .from('daily_records')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export default function EggTracking() {
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [notification, setNotification] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    eggs_collected: '',
    eggs_broken: ''
  })

  const queryClient = useQueryClient()

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const { data: records, isLoading, error } = useQuery({
    queryKey: ['dailyRecords'],
    queryFn: fetchDailyRecords
  })

  const createMutation = useMutation({
    mutationFn: createDailyRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRecords'] })
      queryClient.invalidateQueries({ queryKey: ['todaysEggs'] })
      queryClient.invalidateQueries({ queryKey: ['eggProduction'] })
      setShowModal(false)
      resetForm()
      showNotification('Record saved successfully!')
    },
    onError: (error) => {
      showNotification(`Error saving record: ${error.message}`, 'error')
    }
  })

  const updateMutation = useMutation({
    mutationFn: updateDailyRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRecords'] })
      queryClient.invalidateQueries({ queryKey: ['todaysEggs'] })
      queryClient.invalidateQueries({ queryKey: ['eggProduction'] })
      setShowModal(false)
      setEditingRecord(null)
      resetForm()
      showNotification('Record updated successfully!')
    },
    onError: (error) => {
      showNotification(`Error updating record: ${error.message}`, 'error')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDailyRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRecords'] })
      queryClient.invalidateQueries({ queryKey: ['todaysEggs'] })
      queryClient.invalidateQueries({ queryKey: ['eggProduction'] })
      showNotification('Record deleted successfully!')
    },
    onError: (error) => {
      showNotification(`Error deleting record: ${error.message}`, 'error')
    }
  })

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      eggs_collected: '',
      eggs_broken: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const recordData = {
      ...formData,
      eggs_collected: parseInt(formData.eggs_collected) || 0,
      eggs_broken: parseInt(formData.eggs_broken) || 0
    }
    
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, ...recordData })
    } else {
      createMutation.mutate(recordData)
    }
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    setFormData({
      date: record.date,
      eggs_collected: record.eggs_collected,
      eggs_broken: record.eggs_broken
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(id)
    }
  }

  // Calculate stats
  const totalCollected = records?.reduce((sum, r) => sum + r.eggs_collected, 0) || 0
  const totalBroken = records?.reduce((sum, r) => sum + r.eggs_broken, 0) || 0
  const avgPerDay = records?.length ? (totalCollected / records.length).toFixed(1) : 0

  // Prepare chart data (last 14 days)
  const chartData = records?.slice(0, 14).reverse().map(record => ({
    date: new Date(record.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    collected: record.eggs_collected,
    broken: record.eggs_broken
  })) || []

  return (
    <div className="egg-tracking">
      {/* Notification */}
      {notification && (
        <div 
          className={`toast toast-${notification.type}`}
          style={{ 
            position: 'fixed', 
            top: '1rem', 
            right: '1rem', 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {notification.message}
          <button 
            onClick={() => setNotification(null)}
            style={{ 
              marginLeft: '0.5rem', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Egg Tracking</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track daily egg collection and monitor production.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingRecord(null)
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus size={18} />
          Add Record
        </button>
      </header>

      {error && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--status-error)', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-error)' }}>
            <AlertCircle size={18} />
            <span><strong>Database Error:</strong> {error.message}. Please check your Supabase configuration.</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card success">
          <div className="stat-label">Total Collected (30 days)</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Egg size={28} color="var(--color-secondary)" />
            {isLoading ? '...' : totalCollected.toLocaleString()}
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">Total Broken (30 days)</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={28} color="var(--color-accent)" />
            {isLoading ? '...' : totalBroken.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Daily Average</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={28} color="var(--color-primary)" />
            {isLoading ? '...' : avgPerDay}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3 className="card-title">Production Trend (Last 14 Days)</h3>
        </div>
        <div style={{ height: '300px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                <Line 
                  type="monotone" 
                  dataKey="collected" 
                  stroke="var(--color-secondary)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-secondary)' }}
                  name="Collected"
                />
                <Line 
                  type="monotone" 
                  dataKey="broken" 
                  stroke="var(--color-accent)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-accent)' }}
                  name="Broken"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Eggs Collected</th>
              <th>Eggs Broken</th>
              <th>Good Eggs</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : records?.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="empty-state">
                    <Egg className="empty-state-icon" />
                    <div className="empty-state-title">No records yet</div>
                    <p className="empty-state-description">
                      Start tracking your daily egg production.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              records?.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.date)}</td>
                  <td>{record.eggs_collected.toLocaleString()}</td>
                  <td>{record.eggs_broken.toLocaleString()}</td>
                  <td>{(record.eggs_collected - record.eggs_broken).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginRight: '0.5rem' }}
                      onClick={() => handleEdit(record)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(record.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>
              {editingRecord ? 'Edit Record' : 'Add Daily Record'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Eggs Collected</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.eggs_collected}
                  onChange={(e) => setFormData({ ...formData, eggs_collected: e.target.value })}
                  min="0"
                  required
                  placeholder="Enter number of eggs collected"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Eggs Broken</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.eggs_broken}
                  onChange={(e) => setFormData({ ...formData, eggs_broken: e.target.value })}
                  min="0"
                  required
                  placeholder="Enter number of broken eggs"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}