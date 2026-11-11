"use client"
import { useEffect, useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabase'
import Dashboard from './dashboard' 

export default function Home() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          
          {/* Logo replaces the plain text H1 here */}
          <img 
            src="/Good_Exit_Logo.png" 
            alt="Good Exit Logo" 
            className="h-16 w-auto mx-auto mb-8 object-contain" 
          />
          
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      </div>
    )
  }

  // If logged in, show the main app
  return <Dashboard session={session} />
}