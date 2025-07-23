'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have hash parameters (OAuth callback)
        if (window.location.hash) {
          // Handle the OAuth callback with hash parameters
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Auth error:', error)
          } else if (data.session) {
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)
            // Redirect to demo dashboard
            router.push('/demo-dashboard')
            return
          }
        }

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // User is already authenticated, redirect to demo dashboard
          router.push('/demo-dashboard')
          return
        }
      } catch (error) {
        console.error('Error handling auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-4 mx-auto"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C2</span>
            </div>
            <span className="text-xl font-bold text-gray-900">C2HQ</span>
          </div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Master Your Comment Sections with{' '}
            <span className="text-indigo-600">AI-Powered Insights</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            C2HQ helps creators understand, manage, and engage with their comment sections across YouTube, Instagram, and more. 
            Get sentiment analysis, toxicity detection, and actionable insights to build stronger communities.
          </p>
          <div className="space-x-4">
            <Link href="/signup">
              <Button size="lg" className="px-8 py-3">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login?redirectTo=/demo-dashboard">
              <Button variant="outline" size="lg" className="px-8 py-3">
                View Your Data
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="secondary" size="lg" className="px-8 py-3">
                Sample Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Sentiment Analysis</h3>
            <p className="text-gray-600">
              Understand how your audience really feels about your content with advanced AI sentiment detection.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Toxicity Detection</h3>
            <p className="text-gray-600">
              Automatically identify and filter harmful comments to maintain a positive community environment.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Theme Insights</h3>
            <p className="text-gray-600">
              Discover what topics your audience cares about most with intelligent theme extraction.
            </p>
          </div>
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Connect Your Platforms
          </h2>
          <div className="flex justify-center space-x-8 items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">YT</span>
              </div>
              <span className="text-lg font-medium">YouTube</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">IG</span>
              </div>
              <span className="text-lg font-medium">Instagram</span>
            </div>
            <div className="flex items-center space-x-2 opacity-50">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">TT</span>
              </div>
              <span className="text-lg font-medium">TikTok (Coming Soon)</span>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="mt-20 bg-white rounded-2xl p-12 shadow-lg">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              See C2HQ in Action
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Experience the power of AI-driven comment analysis with your own YouTube data or explore our sample demo.
            </p>
            <div className="space-x-4">
              <Link href="/login?redirectTo=/demo-dashboard">
                <Button size="lg" className="px-8 py-3">
                  🔗 Connect Your YouTube Channel
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  📊 View Sample Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Your real data demo shows actual YouTube channel stats, latest videos, and Google profile information.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
