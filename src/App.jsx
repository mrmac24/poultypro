import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './supabase/supabase'
import Auth from './views/Auth'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './views/Dashboard'
import FlockManagement from './views/FlockManagement'
import EggTracking from './views/EggTracking'
import SalesAccounting from './views/SalesAccounting'
import Reporting from './views/Reporting'
import Profile from './views/Profile'
import FeedManagement from './views/FeedManagement'
import HealthTracker from './views/HealthTracker'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (!session) {
    return <Auth />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/flocks" element={<FlockManagement />} />
            <Route path="/eggs" element={<EggTracking />} />
            <Route path="/sales" element={<SalesAccounting />} />
            <Route path="/reports" element={<Reporting />} />
            <Route path="/feed" element={<FeedManagement />} />
            <Route path="/health" element={<HealthTracker />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Layout>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App