import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, AlertCircle, X, CheckCircle } from 'lucide-react'
import { supabase } from '../supabase/supabase'
import { formatDate, formatCurrency } from '../utils/formatting'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Predefined categories for dropdown
const INCOME_CATEGORIES = [
  'Egg Sales',
  'Bird Sales',
  'Manure Sales',
  'Other Income'
]

const EXPENSE_CATEGORIES = [
  'Feed',
  'Medicine/Vaccines',
  'Equipment',
  'Labor',
  'Utilities',
  'Transportation',
  'Maintenance',
  'Other Expense'
]

const fetchTransactions = async () => {
  const { data, error } = await supabase
    .from('finances')
    .select('*')
    .order('date', { ascending: false })
    .limit(50)
  
  if (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }
  return data
}

const createTransaction = async (transaction) => {
  console.log('Creating transaction:', transaction)
  const { data, error } = await supabase
    .from('finances')
    .insert([transaction])
    .select()
  
  if (error) {
    console.error('Error creating transaction:', error)
    throw error
  }
  console.log('Transaction created:', data)
  return data[0]
}

const updateTransaction = async ({ id, ...updates }) => {
  console.log('Updating transaction:', id, updates)
  const { data, error } = await supabase
    .from('finances')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating transaction:', error)
    throw error
  }
  return data[0]
}

const deleteTransaction = async (id) => {
  const { error } = await supabase
    .from('finances')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

export default function SalesAccounting() {
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [notification, setNotification] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'expense',
    category: '',
    quantity: '1',
    amount: '',
    description: ''
  })

  const queryClient = useQueryClient()

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const { data: transactions, isLoading: loadingTransactions, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions
  })

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: (data) => {
      console.log('Create success:', data)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finances'] })
      setShowModal(false)
      resetForm()
      showNotification('Transaction saved successfully!')
    },
    onError: (error) => {
      console.error('Create error:', error)
      showNotification(`Error saving transaction: ${error.message}`, 'error')
    }
  })

  const updateMutation = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finances'] })
      setShowModal(false)
      setEditingTransaction(null)
      resetForm()
      showNotification('Transaction updated successfully!')
    },
    onError: (error) => {
      showNotification(`Error updating transaction: ${error.message}`, 'error')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finances'] })
      showNotification('Transaction deleted successfully!')
    },
    onError: (error) => {
      showNotification(`Error deleting transaction: ${error.message}`, 'error')
    }
  })

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      transaction_type: 'expense',
      category: '',
      quantity: '1',
      amount: '',
      description: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    
    const transactionData = {
      ...formData,
      quantity: parseInt(formData.quantity) || 1,
      amount: parseFloat(formData.amount)
    }
    
    console.log('Sending to database:', transactionData)
    
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, ...transactionData })
    } else {
      createMutation.mutate(transactionData)
    }
  }

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      date: transaction.date,
      transaction_type: transaction.transaction_type,
      category: transaction.category,
      quantity: transaction.quantity?.toString() || '1',
      amount: transaction.amount.toString(),
      description: transaction.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate(id)
    }
  }

  // Get categories based on transaction type
  const getCategories = () => {
    return formData.transaction_type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  }

  // Calculate stats
  const income = transactions
    ?.filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0
  
  const expenses = transactions
    ?.filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  const balance = income - expenses

  // Category breakdown for chart
  const categoryData = transactions?.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
    return acc
  }, {})

  const chartData = Object.entries(categoryData || {}).map(([name, value]) => ({
    name,
    value
  }))

  return (
    <div className="sales-accounting">
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
          <h1>Sales & Accounting</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage sales and track your finances.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingTransaction(null)
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus size={18} />
          Add Transaction
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
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={28} color="var(--color-secondary)" />
            {loadingTransactions ? '...' : formatCurrency(income)}
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingDown size={28} color="var(--status-error)" />
            {loadingTransactions ? '...' : formatCurrency(expenses)}
          </div>
        </div>

        <div className={`stat-card ${balance >= 0 ? 'success' : 'danger'}`}>
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={28} color={balance >= 0 ? 'var(--color-secondary)' : 'var(--status-error)'} />
            {loadingTransactions ? '...' : formatCurrency(balance)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions Table */}
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Recent Transactions</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingTransactions ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : transactions?.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <DollarSign className="empty-state-icon" />
                        <div className="empty-state-title">No transactions yet</div>
                        <p className="empty-state-description">
                          Add your first transaction to start tracking your finances.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions?.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.date)}</td>
                      <td>
                        <span className={`badge badge-${transaction.transaction_type === 'income' ? 'success' : 'danger'}`}>
                          {transaction.category}
                        </span>
                      </td>
                      <td>{transaction.quantity || 1}</td>
                      <td>{formatCurrency(transaction.amount)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          style={{ marginRight: '0.5rem' }}
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(transaction.id)}
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
        </div>

        {/* Category Chart */}
        <div className="chart-container">
          <div className="card-header">
            <h3 className="card-title">Spending by Category</h3>
          </div>
          <div style={{ height: '300px' }}>
            {loadingTransactions ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="empty-state">
                <p>No data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={24} />
              </button>
            </div>
            
            {(createMutation.error || updateMutation.error) && (
              <div style={{ 
                padding: '1rem', 
                marginBottom: '1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid var(--status-error)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--status-error)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} />
                <span>Error: {(createMutation.error || updateMutation.error)?.message}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Type *</label>
                <select
                  className="form-select"
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value, category: '' })}
                  required
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Select a category</option>
                  {getCategories().map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="1"
                  required
                  placeholder="Enter quantity (e.g., bags of feed, number of eggs)"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                  placeholder="Enter total amount"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  placeholder="Enter additional details"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                      Saving...
                    </>
                  ) : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}