'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          router.push('/login?error=auth_failed')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          await supabase.from('profiles').insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name ||
                       session.user.user_metadata?.name ||
                       session.user.email?.split('@')[0] ||
                       'Student',
            role: 'student',
            subscription_status: 'explorer',
          })
        }

        router.push('/onboarding')
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/login?error=auth_failed')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-deep-blue">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Completing sign in...</h1>
        <p className="text-gray-300">Please wait while we set up your account.</p>
      </div>
    </div>
  )
}
