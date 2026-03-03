import { useState, useEffect } from 'react'
import { supabase } from '../supabase/supabase'
import { User, Mail, Calendar, Building2, Edit2, Save, X, Camera, Upload } from 'lucide-react'
import './Profile.css'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    business_name: '',
    avatar_url: '',
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (error) {
            if (error.code === 'PGRST116') {
              console.log('Profile not found, using auth metadata')
            } else if (error.code === '42P01' || error.message?.includes('schema cache')) {
              console.warn('Profiles table does not exist yet')
              setMessage({
                text: 'Profile system not ready. Please run database migrations.',
                type: 'warning'
              })
            } else {
              throw error
            }
          }

          if (data) {
            setProfile(data)
            setFormData({
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              date_of_birth: data.date_of_birth || '',
              business_name: data.business_name || '',
              avatar_url: data.avatar_url || '',
            })
          } else if (user.user_metadata) {
            const metadata = user.user_metadata
            setFormData({
              first_name: metadata.first_name || '',
              last_name: metadata.last_name || '',
              date_of_birth: metadata.date_of_birth || '',
              business_name: metadata.business_name || '',
              avatar_url: metadata.avatar_url || '',
            })
          }
        } catch (dbError) {
          console.error('Database error:', dbError)
          if (user.user_metadata) {
            const metadata = user.user_metadata
            setFormData({
              first_name: metadata.first_name || '',
              last_name: metadata.last_name || '',
              date_of_birth: metadata.date_of_birth || '',
              business_name: metadata.business_name || '',
              avatar_url: metadata.avatar_url || '',
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ text: 'Error loading profile', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(e) {
    e.preventDefault()
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('No user found')

      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        const profileData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          business_name: formData.business_name,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString(),
        }

        if (existingProfile) {
          const { error } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', user.id)

          if (error && error.code !== '42P01') throw error
        } else {
          const { error } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              ...profileData,
              created_at: new Date().toISOString(),
            })

          if (error && error.code !== '42P01') throw error
        }
      } catch (dbError) {
        console.warn('Could not update profiles table:', dbError.message)
      }

      await supabase.auth.updateUser({
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          business_name: formData.business_name,
          avatar_url: formData.avatar_url,
        }
      })

      setProfile({ ...profile, ...formData, email: user.email })
      setEditing(false)
      setMessage({ text: 'Profile updated successfully!', type: 'success' })

      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ text: error.message || 'Error updating profile', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function uploadAvatar(event) {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setFormData({ ...formData, avatar_url: publicUrl })
      setMessage({ text: 'Avatar uploaded successfully!', type: 'success' })

      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setMessage({ text: error.message || 'Error uploading avatar', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  if (loading && !profile) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>{formData.first_name ? `${formData.first_name}'s Profile` : 'My Profile'}</h1>
        <p>Manage your account information</p>
      </div>

      {message.text && (
        <div className={`profile-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-avatar">
          <div className="avatar-container">
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="Profile"
                className="avatar-image"
              />
            ) : (
              <div className="avatar-circle">
                <User size={48} />
              </div>
            )}
            {editing && (
              <label className="avatar-upload-button" htmlFor="avatar-upload">
                <Camera size={20} />
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
          {editing && uploading && (
            <p className="upload-status">Uploading...</p>
          )}
          <h2>{profile ? `${profile.first_name} ${profile.last_name}` : 'User'}</h2>
          <p className="profile-role">{profile?.business_name || 'Poultry Manager'}</p>
        </div>

        {editing ? (
          <form onSubmit={updateProfile} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">
                  <User size={16} />
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="last_name">
                  <User size={16} />
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="date_of_birth">
                <Calendar size={16} />
                Date of Birth
              </label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="business_name">
                <Building2 size={16} />
                Business Name
              </label>
              <input
                type="text"
                id="business_name"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(false)
                  setFormData({
                    first_name: profile?.first_name || '',
                    last_name: profile?.last_name || '',
                    date_of_birth: profile?.date_of_birth || '',
                    business_name: profile?.business_name || '',
                    avatar_url: profile?.avatar_url || '',
                  })
                }}
                disabled={loading}
              >
                <X size={16} />
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                <Save size={16} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="info-group">
              <div className="info-item">
                <User size={20} />
                <div>
                  <label>Full Name</label>
                  <p>{profile ? `${profile.first_name} ${profile.last_name}` : 'Not set'}</p>
                </div>
              </div>

              <div className="info-item">
                <Mail size={20} />
                <div>
                  <label>Email</label>
                  <p>{profile?.email || 'Not available'}</p>
                </div>
              </div>

              <div className="info-item">
                <Calendar size={20} />
                <div>
                  <label>Date of Birth</label>
                  <p>{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}</p>
                </div>
              </div>

              <div className="info-item">
                <Building2 size={20} />
                <div>
                  <label>Business Name</label>
                  <p>{profile?.business_name || 'Not set'}</p>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button
                className="btn-primary"
                onClick={() => setEditing(true)}
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="profile-meta">
        <p>Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}</p>
        <p>Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}</p>
      </div>
    </div>
  )
}
