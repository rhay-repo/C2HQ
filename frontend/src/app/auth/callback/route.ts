import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    try {
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(new URL('/login?error=auth_error', request.url))
      }

      // Create user profile if it doesn't exist
      if (session?.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              email: session.user.email || 'unknown@example.com',
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'YouTube User',
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          if (profileError) {
            console.error('Error creating user profile:', profileError)
            // Don't fail the auth flow, just log the error
          } else {
            console.log(`✅ Profile created/updated for user ${session.user.id}`)
          }

          // Store Google OAuth tokens in user_platforms table
          if (session.provider_token && session.provider_refresh_token) {
            try {
              const { error: platformError } = await supabase
                .from('user_platforms')
                .upsert({
                  user_id: session.user.id,
                  platform: 'youtube',
                  platform_user_id: session.user.user_metadata?.sub || session.user.id,
                  platform_username: session.user.user_metadata?.name || 'YouTube User',
                  access_token: session.provider_token,
                  refresh_token: session.provider_refresh_token,
                  token_expires_at: new Date(Date.now() + (3600 * 1000)).toISOString(), // 1 hour from now
                  connected_at: new Date().toISOString(),
                  is_active: true
                }, {
                  onConflict: 'user_id,platform'
                })

              if (platformError) {
                console.error('Error storing platform tokens:', platformError)
                // Don't fail the auth flow, just log the error
              } else {
                console.log(`✅ Platform tokens stored for user ${session.user.id}`)
              }
            } catch (tokenError) {
              console.error('Error in token storage:', tokenError)
              // Don't fail the auth flow, just log the error
            }
          }
        } catch (profileError) {
          console.error('Error in profile creation:', profileError)
          // Don't fail the auth flow, just log the error
        }
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login?error=auth_error', request.url))
    }
  }

  // Redirect to the intended destination
  return NextResponse.redirect(new URL(redirectTo, request.url))
} 