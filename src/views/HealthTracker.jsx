import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Heart, 
  Calendar as CalendarIcon, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  X,
  Users,
  Clock,
  Syringe,
  Activity,
  Trash2
} from 'lucide-react'
import { supabase } from '../supabase/supabase'
import { useHealthRecords, useUpcomingVaccinations } from '../hooks/useHealth'
import { formatDate } from '../utils/formatting'

// Fetch flocks for mortality form
const fetchFlocks = async () => {
  const { data, error } = await supabase
    .from('flocks')
    .select('id, type, current_quantity, initial_quantity')
    .eq('status', 'active')

  if (error) throw error
  return data
}

// Calendar Component
const Calendar = ({ records, onDateClick, selectedDate }) => {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const daysInMonth = new Date(
    currentMonth.getFullYear(), 
    currentMonth.getMonth() + 1, 
    0
  ).getDate()
  
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(), 
    currentMonth.getMonth(), 
    1
  ).getDay()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getRecordsForDate = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return records?.filter(r => r.date === dateStr) || []
  }

  const days = []
  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty" />)
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayRecords = getRecordsForDate(day)
    const hasVaccination = dayRecords.some(r => r.record_type === 'Vaccination')
    const hasMortality = dayRecords.some(r => r.record_type === 'Mortality')
    const isToday = 
      day === today.getDate() && 
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isSelected = selectedDate === dateStr

    days.push(
      <button
        key={day}
        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => onDateClick(dateStr)}
      >
        <span className="day-number">{day}</span>
        {dayRecords.length > 0 && (
          <div className="day-indicators">
            {hasVaccination && <span className="indicator vaccination" />}
            {hasMortality && <span className="indicator mortality" />}
            {!hasVaccination && !hasMortality && <span className="indicator other" />}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button 
          className="btn btn-sm btn-outline"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        >
          ←
        </button>
        <h3>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
        <button 
          className="btn btn-sm btn-outline"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        >
          →
        </button>
      </div>
      
      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>
      
      <div className="calendar-grid">
        {days}
      </div>
      
      <div className="calendar-legend">
        <span><span className="indicator vaccination" /> Vaccination</span>
        <span><span className="indicator mortality" /> Mortality</span>
        <span><span className="indicator other" /> Other</span>
      </div>
    </div>
  )
}

export default function HealthTracker() {
  const [activeTab, setActiveTab] = useState('timeline')
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showMortalityModal, setShowMortalityModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [notification, setNotification] = useState(null)
  
  // Form states
  const [recordForm, setRecordForm] = useState({
    flockId: '',
    recordType: 'Vaccination',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    veterinarianName: '',
    nextDueDate: ''
  })

  const [mortalityForm, setMortalityForm] = useState({
    flockId: '',
    count: '',
    date: new Date().toISOString().split('T')[0],
    cause: '',
    notes: ''
  })

  const { 
    data: healthRecords, 
    isLoading: loadingRecords,
    createMutation,
    deleteMutation,
    mortalityMutation,
    totalDeaths
  } = useHealthRecords()

  const { 
    data: upcomingVaccinations, 
    isLoading: loadingVaccinations 
  } = useUpcomingVaccinations(30)

  const { data: flocks } = useQuery({
    queryKey: ['flocks'],
    queryFn: fetchFlocks
  })

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleAddRecord = async (e) => {
    e.preventDefault()
    
    try {
      await createMutation.mutateAsync({
        flock_id: recordForm.flockId,
        record_type: recordForm.recordType,
        date: recordForm.date,
        description: recordForm.description,
        cost: parseFloat(recordForm.cost) || 0,
        veterinarian_name: recordForm.veterinarianName,
        next_due_date: recordForm.nextDueDate || null
      })
      showNotification('Health record added successfully!')
      setShowRecordModal(false)
      setRecordForm({
        flockId: '',
        recordType: 'Vaccination',
        date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
        veterinarianName: '',
        nextDueDate: ''
      })
    } catch (error) {
      showNotification(error.message, 'error')
    }
  }

  const handleLogMortality = async (e) => {
    e.preventDefault()
    
    try {
      await mortalityMutation.mutateAsync({
        flockId: mortalityForm.flockId,
        count: parseInt(mortalityForm.count),
        date: mortalityForm.date,
        cause: mortalityForm.cause,
        notes: mortalityForm.notes
      })
      showNotification('Mortality logged successfully!')
      setShowMortalityModal(false)
      setMortalityForm({
        flockId: '',
        count: '',
        date: new Date().toISOString().split('T')[0],
        cause: '',
        notes: ''
      })
    } catch (error) {
      showNotification(error.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteMutation.mutateAsync(id)
        showNotification('Record deleted successfully!')
      } catch (error) {
        showNotification(error.message, 'error')
      }
    }
  }

  const getRecordIcon = (type) => {
    switch (type) {
      case 'Vaccination': return <Syringe size={18} />
      case 'Mortality': return <Heart size={18} />
      case 'Medication': return <Activity size={18} />
      case 'Vet Visit': return <Users size={18} />
      default: return <CalendarIcon size={18} />
    }
  }

  const getRecordColor = (type) => {
    switch (type) {
      case 'Vaccination': return 'var(--status-success)'
      case 'Mortality': return 'var(--status-error)'
      case 'Medication': return 'var(--color-accent)'
      case 'Vet Visit': return 'var(--status-info)'
      default: return 'var(--text-muted)'
    }
  }

  return (
    <div className="health-tracker">
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
        <h1>Health Tracker</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Monitor vaccinations, health events, and track mortality rates.
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Deaths (30 days)</div>
          <div className="stat-value" style={{ color: 'var(--status-error)' }}>
            <Heart size={28} />
            {loadingRecords ? '...' : totalDeaths}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            Birds lost to mortality
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-label">Upcoming Vaccinations</div>
          <div className="stat-value">
            <Syringe size={28} />
            {loadingVaccinations ? '...' : upcomingVaccinations?.length || 0}
          </div>
          <div className="stat-change positive">
            Next 30 days
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">Total Health Records</div>
          <div className="stat-value">
            <Activity size={28} />
            {loadingRecords ? '...' : healthRecords?.length || 0}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            All time records
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['timeline', 'calendar'].map(tab => (
            <button
              key={tab}
              className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'timeline' ? <Clock size={18} /> : <CalendarIcon size={18} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-outline"
            onClick={() => setShowMortalityModal(true)}
            style={{ borderColor: 'var(--status-error)' }}
          >
            <Heart size={18} />
            Log Mortality
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowRecordModal(true)}
          >
            <Plus size={18} />
            Add Record
          </button>
        </div>
      </div>

      {/* Timeline View */}
      {activeTab === 'timeline' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Recent Health Events</h3>
          
          {loadingRecords ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : healthRecords?.length === 0 ? (
            <div className="empty-state">
              <Heart className="empty-state-icon" />
              <div className="empty-state-title">No health records yet</div>
              <p className="empty-state-description">
                Start tracking health events by adding your first record.
              </p>
            </div>
          ) : (
            <div className="timeline">
              {healthRecords?.map(record => (
                <div key={record.id} className="timeline-item">
                  <div 
                    className="timeline-icon"
                    style={{ 
                      background: `${getRecordColor(record.record_type)}20`,
                      borderColor: getRecordColor(record.record_type)
                    }}
                  >
                    {getRecordIcon(record.record_type)}
                  </div>
                  
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div>
                        <span 
                          className="badge"
                          style={{ 
                            background: `${getRecordColor(record.record_type)}20`,
                            color: getRecordColor(record.record_type),
                            borderColor: getRecordColor(record.record_type)
                          }}
                        >
                          {record.record_type}
                        </span>
                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                          {record.flock?.type} Flock
                        </span>
                      </div>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <p style={{ margin: '0.5rem 0' }}>{record.description}</p>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span>{formatDate(record.date)}</span>
                      {record.cost > 0 && <span>Cost: ${record.cost}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div>
          <Calendar 
            records={healthRecords}
            onDateClick={(date) => {
              setSelectedDate(date)
              setShowRecordModal(true)
              setRecordForm({ ...recordForm, date })
            }}
            selectedDate={selectedDate}
          />

          {/* Upcoming Vaccinations */}
          <div style={{ marginTop: '2rem' }}>
            <h3>Upcoming Vaccinations</h3>
            
            {loadingVaccinations ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" />
              </div>
            ) : upcomingVaccinations?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No upcoming vaccinations in the next 30 days.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingVaccinations?.map(vax => (
                  <div key={vax.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Syringe size={20} color="var(--status-success)" />
                      <strong>{vax.flock?.type} Vaccination</strong>
                    </div>
                    <p>{vax.description}</p>
                    <div style={{ 
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: 'var(--glass-bg)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem'
                    }}>
                      <Clock size={14} style={{ marginRight: '0.5rem', display: 'inline' }} />
                      Due: <strong>{formatDate(vax.next_due_date)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showRecordModal && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Health Record</h2>
            
            <form onSubmit={handleAddRecord}>
              <div className="form-group">
                <label className="form-label">Select Flock</label>
                <select
                  className="form-select"
                  value={recordForm.flockId}
                  onChange={e => setRecordForm({ ...recordForm, flockId: e.target.value })}
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
                <label className="form-label">Record Type</label>
                <select
                  className="form-select"
                  value={recordForm.recordType}
                  onChange={e => setRecordForm({ ...recordForm, recordType: e.target.value })}
                  required
                >
                  <option value="Vaccination">Vaccination</option>
                  <option value="Medication">Medication</option>
                  <option value="Vet Visit">Vet Visit</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={recordForm.date}
                  onChange={e => setRecordForm({ ...recordForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={recordForm.description}
                  onChange={e => setRecordForm({ ...recordForm, description: e.target.value })}
                  rows="3"
                  required
                  placeholder="Describe the health event..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cost ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={recordForm.cost}
                  onChange={e => setRecordForm({ ...recordForm, cost: e.target.value })}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Veterinarian Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={recordForm.veterinarianName}
                  onChange={e => setRecordForm({ ...recordForm, veterinarianName: e.target.value })}
                  placeholder="Dr. ..."
                />
              </div>

              {recordForm.recordType === 'Vaccination' && (
                <div className="form-group">
                  <label className="form-label">Next Due Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={recordForm.nextDueDate}
                    onChange={e => setRecordForm({ ...recordForm, nextDueDate: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowRecordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mortality Modal */}
      {showMortalityModal && (
        <div className="modal-overlay" onClick={() => setShowMortalityModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'var(--status-error)' }}><Heart size={24} style={{ marginRight: '0.5rem' }} />Log Mortality</h2>
            
            <form onSubmit={handleLogMortality}>
              <div className="form-group">
                <label className="form-label">Select Flock</label>
                <select
                  className="form-select"
                  value={mortalityForm.flockId}
                  onChange={e => setMortalityForm({ ...mortalityForm, flockId: e.target.value })}
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
                <label className="form-label">Number of Birds Lost</label>
                <input
                  type="number"
                  className="form-input"
                  value={mortalityForm.count}
                  onChange={e => setMortalityForm({ ...mortalityForm, count: e.target.value })}
                  min="1"
                  required
                  placeholder="Enter number of birds"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={mortalityForm.date}
                  onChange={e => setMortalityForm({ ...mortalityForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cause of Death (Optional)</label>
                <select
                  className="form-select"
                  value={mortalityForm.cause}
                  onChange={e => setMortalityForm({ ...mortalityForm, cause: e.target.value })}
                >
                  <option value="">Select cause...</option>
                  <option value="Disease">Disease</option>
                  <option value="Predator">Predator Attack</option>
                  <option value="Accident">Accident</option>
                  <option value="Unknown">Unknown</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={mortalityForm.notes}
                  onChange={e => setMortalityForm({ ...mortalityForm, notes: e.target.value })}
                  rows="2"
                  placeholder="Additional details..."
                />
              </div>

              <div 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid var(--status-error)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  marginBottom: '1rem'
                }}
              >
                <AlertTriangle size={16} style={{ color: 'var(--status-error)', marginRight: '0.5rem', display: 'inline' }} />
                <span style={{ fontSize: '0.875rem' }}>
                  This will automatically reduce the flock count. This action cannot be undone.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowMortalityModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  disabled={mortalityMutation.isPending}
                >
                  {mortalityMutation.isPending ? 'Logging...' : 'Log Mortality'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .calendar {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--space-2);
          margin-bottom: var(--space-2);
        }

        .weekday {
          text-align: center;
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          padding: var(--space-2);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--space-2);
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
        }

        .calendar-day:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }

        .calendar-day.empty {
          background: transparent;
          border: none;
          cursor: default;
        }

        .calendar-day.today {
          border-color: var(--color-primary);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }

        .calendar-day.selected {
          background: var(--gradient-primary);
          border-color: var(--color-primary);
        }

        .day-number {
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .day-indicators {
          display: flex;
          gap: 2px;
          margin-top: 2px;
        }

        .indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .indicator.vaccination {
          background: var(--status-success);
        }

        .indicator.mortality {
          background: var(--status-error);
        }

        .indicator.other {
          background: var(--color-accent);
        }

        .calendar-legend {
          display: flex;
          gap: var(--space-4);
          margin-top: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--glass-border);
          font-size: var(--text-sm);
          color: var(--text-muted);
        }

        .calendar-legend span {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .timeline {
          position: relative;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 20px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--glass-border);
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-4);
          padding: var(--space-4) 0;
          position: relative;
        }

        .timeline-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid;
          background: var(--glass-bg);
          z-index: 1;
          flex-shrink: 0;
        }

        .timeline-content {
          flex: 1;
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-2);
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  )
}
