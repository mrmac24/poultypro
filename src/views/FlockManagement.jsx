import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit2, Trash2, Users, AlertCircle, X, CheckCircle } from 'lucide-react'
import { supabase } from '../supabase/supabase'
import { formatDate } from '../utils/formatting'

const fetchFlocks = async () => {
  const { data, error } = await supabase
    .from('flocks')
    .select('*')
    .order('date_added', { ascending: false })

  if (error) throw error
  return data
}

const createFlock = async (flock) => {
  const { data, error } = await supabase
    .from('flocks')
    .insert([flock])
    .select()

  if (error) throw error
  return data[0]
}

const updateFlock = async ({ id, ...updates }) => {
  const { data, error } = await supabase
    .from('flocks')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  return data[0]
}

const deleteFlock = async (id) => {
  const { error } = await supabase
    .from('flocks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function FlockManagement() {
  const [showModal, setShowModal] = useState(false)
  const [editingFlock, setEditingFlock] = useState(null)
  const [notification, setNotification] = useState(null)
  const [formData, setFormData] = useState({
    type: 'Hen',
    initial_quantity: '',
    date_added: new Date().toISOString().split('T')[0],
    status: 'active'
  })

  const queryClient = useQueryClient()

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const { data: flocks, isLoading, error } = useQuery({
    queryKey: ['flocks'],
    queryFn: fetchFlocks
  })

  const createMutation = useMutation({
    mutationFn: createFlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flocks'] })
      queryClient.invalidateQueries({ queryKey: ['totalBirds'] })
      queryClient.invalidateQueries({ queryKey: ['flockDistribution'] })
      setShowModal(false)
      resetForm()
      showNotification('Flock saved successfully!')
    },
    onError: (error) => {
      showNotification(`Error saving flock: ${error.message}`, 'error')
    }
  })


  const updateMutation = useMutation({
    mutationFn: updateFlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flocks'] })
      queryClient.invalidateQueries({ queryKey: ['totalBirds'] })
      queryClient.invalidateQueries({ queryKey: ['flockDistribution'] })
      setShowModal(false)
      setEditingFlock(null)
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flocks'] })
      queryClient.invalidateQueries({ queryKey: ['totalBirds'] })
      queryClient.invalidateQueries({ queryKey: ['flockDistribution'] })
    }
  })

  const resetForm = () => {
    setFormData({
      type: 'Hen',
      initial_quantity: '',
      date_added: new Date().toISOString().split('T')[0],
      status: 'active'
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const flockData = {
      ...formData,
      initial_quantity: parseInt(formData.initial_quantity) || 0,
      current_quantity: parseInt(formData.initial_quantity) || 0 // New flocks full capacity
    }

    if (editingFlock) {
      updateMutation.mutate({ id: editingFlock.id, ...flockData })
    } else {
      createMutation.mutate(flockData)
    }
  }

  const handleEdit = (flock) => {
    setEditingFlock(flock)
    setFormData({
      type: flock.type,
      initial_quantity: flock.initial_quantity,
      date_added: flock.date_added,
      status: flock.status
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this flock?')) {
      deleteMutation.mutate(id)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'badge-success',
      sold: 'badge-info',
      slaughtered: 'badge-warning',
      deceased: 'badge-danger'
    }
    return <span className={`badge ${styles[status] || 'badge-info'}`}>{status}</span>
  }

  return (
    <div className="flock-management">
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
          <h1>Flock Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your bird batches and track their status.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingFlock(null)
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus size={18} />
          Add Flock
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

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Quantity</th>
              <th>Date Added</th>
              <th>Status</th>
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
            ) : flocks?.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="empty-state">
                    <Users className="empty-state-icon" />
                    <div className="empty-state-title">No flocks yet</div>
                    <p className="empty-state-description">
                      Add your first flock to get started with tracking your birds.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              flocks?.map((flock) => (
                <tr key={flock.id}>
                  <td>{flock.type}</td>
                  <td>{(flock.current_quantity || flock.initial_quantity).toLocaleString()}</td>
                  <td>{formatDate(flock.date_added)}</td>
                  <td>{getStatusBadge(flock.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginRight: '0.5rem' }}
                      onClick={() => handleEdit(flock)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(flock.id)}
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
              {editingFlock ? 'Edit Flock' : 'Add New Flock'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="Broiler">Broiler</option>
                  <option value="Hen">Hen</option>
                  <option value="Rooster">Rooster</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                  min="1"
                  required
                  placeholder="Enter quantity"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date Added</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date_added}
                  onChange={(e) => setFormData({ ...formData, date_added: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="active">Active</option>
                  <option value="sold">Sold</option>
                  <option value="slaughtered">Slaughtered</option>
                  <option value="deceased">Deceased</option>
                </select>
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