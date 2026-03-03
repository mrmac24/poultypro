import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Minus, 
  TrendingDown,
  CheckCircle,
  X,
  Scale,
  Calendar
} from 'lucide-react'
import { supabase } from '../supabase/supabase'
import { useFeedInventory, useFeedConsumption } from '../hooks/useFeed'
import { formatDate, formatCurrency } from '../utils/formatting'

// Fetch flocks for consumption form
const fetchFlocks = async () => {
  const { data, error } = await supabase
    .from('flocks')
    .select('id, type, current_quantity')
    .eq('status', 'active')

  if (error) throw error
  return data
}

// Circular Progress Component
const CircularProgress = ({ value, max, size = 120, strokeWidth = 10, color = 'var(--color-primary)' }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / max, 1)
  const dashoffset = circumference - progress * circumference
  const isLow = value <= max * 0.25

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isLow ? 'var(--status-error)' : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isLow ? 'var(--status-error)' : 'var(--text-primary)' }}>
          {Math.round(progress * 100)}%
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {value.toFixed(1)}kg
        </div>
      </div>
    </div>
  )
}

export default function FeedManagement() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [showConsumeModal, setShowConsumeModal] = useState(false)
  const [selectedFeed, setSelectedFeed] = useState(null)
  const [notification, setNotification] = useState(null)
  
  // Form states
  const [restockForm, setRestockForm] = useState({ amount: '', costPerKg: '' })
  const [consumeForm, setConsumeForm] = useState({
    flockId: '',
    feedType: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const {
    data: inventory,
    isLoading: loadingInventory,
    isLowStock,
    lowStockItems,
    restockMutation
  } = useFeedInventory()

  const { 
    data: consumptionHistory, 
    isLoading: loadingConsumption,
    logMutation,
    totalConsumption
  } = useFeedConsumption(null, 30)

  const { data: flocks } = useQuery({
    queryKey: ['flocks'],
    queryFn: fetchFlocks
  })

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleRestock = async (e) => {
    e.preventDefault()
    if (!selectedFeed) return

    try {
      await restockMutation.mutateAsync({
        id: selectedFeed.id,
        amount: parseFloat(restockForm.amount),
        costPerKg: parseFloat(restockForm.costPerKg) || selectedFeed.cost_per_kg
      })
      showNotification(`Restocked ${selectedFeed.feed_type} successfully!`)
      setShowRestockModal(false)
      setRestockForm({ amount: '', costPerKg: '' })
      setSelectedFeed(null)
    } catch (error) {
      showNotification(error.message, 'error')
    }
  }

  const handleConsume = async (e) => {
    e.preventDefault()
    
    try {
      await logMutation.mutateAsync({
        flockId: consumeForm.flockId,
        feedType: consumeForm.feedType,
        amount: parseFloat(consumeForm.amount),
        date: consumeForm.date,
        notes: consumeForm.notes
      })
      showNotification('Feed consumption logged successfully!')
      setShowConsumeModal(false)
      setConsumeForm({
        flockId: '',
        feedType: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
    } catch (error) {
      showNotification(error.message, 'error')
    }
  }

  const totalInventoryValue = inventory?.reduce((sum, item) => 
    sum + (item.quantity_kg * (item.cost_per_kg || 0)), 0
  ) || 0

  const totalStock = inventory?.reduce((sum, item) => sum + (item.quantity_kg || 0), 0) || 0

  return (
    <div className="feed-management">
      {/* Notification */}
      {notification && (
        <div className={`toast toast-${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {notification.message}
          <button onClick={() => setNotification(null)}><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <h1>Feed Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Track inventory, log consumption, and monitor feed costs.
        </p>
      </header>

      {/* Low Stock Alerts */}
      {isLowStock && (
        <div 
          className="card danger"
          style={{ 
            marginBottom: '1.5rem', 
            border: '2px solid var(--status-error)',
            animation: 'pulse 2s infinite'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--status-error)' }}>
            <AlertTriangle size={24} />
            <div>
              <strong>Low Stock Alert!</strong>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                {lowStockItems.length} feed type(s) below minimum threshold: {lowStockItems.map(i => i.feed_type).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Stock</div>
          <div className="stat-value">
            <Scale size={28} />
            {loadingInventory ? '...' : `${totalStock.toFixed(1)} kg`}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            Across {inventory?.length || 0} feed types
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">Inventory Value</div>
          <div className="stat-value">
            {formatCurrency(totalInventoryValue)}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            Current valuation
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-label">30-Day Consumption</div>
          <div className="stat-value">
            <TrendingDown size={28} />
            {loadingConsumption ? '...' : `${totalConsumption.toFixed(1)} kg`}
          </div>
          <div className="stat-change positive">
            Daily average: {loadingConsumption ? '...' : `${(totalConsumption / 30).toFixed(1)} kg`}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '0.5rem'
      }}>
        {['inventory', 'consumption'].map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'inventory' ? <Package size={18} /> : <Scale size={18} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Current Inventory</h3>
          </div>

          {loadingInventory ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {inventory?.map(feed => {
                const isLow = feed.quantity_kg <= (feed.minimum_threshold_kg || 50)
                const maxDisplay = Math.max(feed.quantity_kg, feed.minimum_threshold_kg * 2)
                
                return (
                  <div 
                    key={feed.id} 
                    className={`card ${isLow ? 'danger' : ''}`}
                    style={{ 
                      borderColor: isLow ? 'var(--status-error)' : undefined,
                      boxShadow: isLow ? '0 0 20px rgba(239, 68, 68, 0.3)' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0 }}>{feed.feed_type}</h4>
                      {isLow && <AlertTriangle size={20} color="var(--status-error)" />}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                      <CircularProgress 
                        value={feed.quantity_kg} 
                        max={maxDisplay}
                        color={isLow ? 'var(--status-error)' : 'var(--color-secondary)'}
                      />
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {feed.quantity_kg.toFixed(1)} kg
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {formatCurrency(feed.cost_per_kg)}/kg
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setSelectedFeed(feed)
                          setShowRestockModal(true)
                        }}
                      >
                        <Plus size={14} />
                        Restock
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setConsumeForm({ ...consumeForm, feedType: feed.feed_type })
                          setShowConsumeModal(true)
                        }}
                      >
                        <Minus size={14} />
                        Use
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Consumption Tab */}
      {activeTab === 'consumption' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Recent Consumption</h3>
            <button 
              className="btn btn-primary"
              onClick={() => setShowConsumeModal(true)}
            >
              <Plus size={18} />
              Log Consumption
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Flock</th>
                  <th>Feed Type</th>
                  <th>Amount (kg)</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loadingConsumption ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : consumptionHistory?.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <p>No consumption records yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  consumptionHistory?.map(record => (
                    <tr key={record.id}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.flock?.type || 'Unknown'}</td>
                      <td>{record.feed_type}</td>
                      <td>{record.amount_consumed_kg.toFixed(2)} kg</td>
                      <td>{record.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedFeed && (
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Restock {selectedFeed.feed_type}</h2>
            
            <form onSubmit={handleRestock}>
              <div className="form-group">
                <label className="form-label">Current Stock: {selectedFeed.quantity_kg.toFixed(1)} kg</label>
              </div>

              <div className="form-group">
                <label className="form-label">Amount to Add (kg)</label>
                <input
                  type="number"
                  className="form-input"
                  value={restockForm.amount}
                  onChange={e => setRestockForm({ ...restockForm, amount: e.target.value })}
                  min="0.1"
                  step="0.1"
                  required
                  placeholder="Enter amount"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cost per kg ({formatCurrency(selectedFeed.cost_per_kg)} current)</label>
                <input
                  type="number"
                  className="form-input"
                  value={restockForm.costPerKg}
                  onChange={e => setRestockForm({ ...restockForm, costPerKg: e.target.value })}
                  min="0"
                  step="0.01"
                  placeholder="Leave empty to use current cost"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowRestockModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={restockMutation.isPending}
                >
                  {restockMutation.isPending ? 'Restocking...' : 'Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consume Modal */}
      {showConsumeModal && (
        <div className="modal-overlay" onClick={() => setShowConsumeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Log Feed Consumption</h2>
            
            <form onSubmit={handleConsume}>
              <div className="form-group">
                <label className="form-label">Select Flock</label>
                <select
                  className="form-select"
                  value={consumeForm.flockId}
                  onChange={e => setConsumeForm({ ...consumeForm, flockId: e.target.value })}
                  required
                >
                  <option value="">Choose a flock...</option>
                  {flocks?.map(flock => (
                    <option key={flock.id} value={flock.id}>
                      {flock.type} ({flock.current_quantity} birds)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Feed Type</label>
                <select
                  className="form-select"
                  value={consumeForm.feedType}
                  onChange={e => setConsumeForm({ ...consumeForm, feedType: e.target.value })}
                  required
                >
                  <option value="">Choose feed type...</option>
                  {inventory?.map(feed => (
                    <option key={feed.id} value={feed.feed_type}>
                      {feed.feed_type} ({feed.quantity_kg.toFixed(1)} kg available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Consumed (kg)</label>
                <input
                  type="number"
                  className="form-input"
                  value={consumeForm.amount}
                  onChange={e => setConsumeForm({ ...consumeForm, amount: e.target.value })}
                  min="0.1"
                  step="0.1"
                  required
                  placeholder="Enter amount consumed"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={consumeForm.date}
                  onChange={e => setConsumeForm({ ...consumeForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={consumeForm.notes}
                  onChange={e => setConsumeForm({ ...consumeForm, notes: e.target.value })}
                  rows="2"
                  placeholder="Any observations..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowConsumeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={logMutation.isPending}
                >
                  {logMutation.isPending ? 'Logging...' : 'Log Consumption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

