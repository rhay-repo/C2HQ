# 🔐 Google OAuth Setup for C2HQ

This guide walks you through setting up Google OAuth with YouTube scopes for creator authentication.

## 📋 Prerequisites

- Supabase project created
- Google Cloud Console access
- C2HQ project running locally

## 🚀 Step-by-Step Setup

### 1. Google Cloud Console Setup

#### A. Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
5. Choose **Web application** as the application type
6. Name it: `C2HQ Authentication`

#### B. Configure Authorized Redirect URIs
Add these URLs in the **Authorized redirect URIs** section:

**For Local Development:**
```
http://localhost:54321/auth/v1/callback
```

**For Production:**
```
https://your-project-ref.supabase.co/auth/v1/callback
```

#### C. Enable Required APIs
1. Go to **APIs & Services** → **Library**
2. Search and enable these APIs:
   - **YouTube Data API v3**
   - **Google+ API** (for user info)

#### D. Get Your Credentials
After creating the OAuth client, copy:
- **Client ID** 
- **Client Secret**

### 2. Supabase Auth Configuration

#### A. Enable Google Provider
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your C2HQ project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and toggle it **ON**

#### B. Configure Google Settings
Fill in the following fields:

**Client ID:** `your_google_client_id`
**Client Secret:** `your_google_client_secret`

**Additional Scopes:**
```
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

#### C. Site URL Configuration
In **Authentication** → **URL Configuration**, set:

**Site URL:** `http://localhost:3000` (for development)
**Redirect URLs:** 
```
http://localhost:3000/auth/callback
http://localhost:3000/demo
```

### 3. Environment Variables Setup

#### A. Frontend Environment (.env.local)
Create `frontend/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001

# Google OAuth (Optional - handled by Supabase)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

#### B. API Environment (.env)
Create `api/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google APIs
GOOGLE_PERSPECTIVE_API_KEY=your_perspective_api_key
YOUTUBE_API_KEY=your_youtube_api_key

# ML Service
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=your_ml_service_api_key

# JWT
JWT_SECRET=your_jwt_secret_key
```

### 4. Create Auth Callback Handler

The auth callback is handled by Supabase, but you may want to create a custom handler for redirects.

Create `frontend/src/app/auth/callback/route.ts`:

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(redirectTo, request.url))
}
```

### 5. Testing the Setup

#### A. Test OAuth Flow
1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click "Continue with Google"
4. Should redirect to Google OAuth consent screen
5. After consent, should redirect back to your app

#### B. Test Demo Flow
1. Go to `http://localhost:3000/login?redirectTo=/demo`
2. Login with Google
3. Should redirect to `/demo` and show personalized data

#### C. Verify User Data
In your Supabase dashboard, check:
1. **Authentication** → **Users** - should see the logged-in user
2. User metadata should include YouTube channel info

### 6. Production Deployment

When deploying to production:

1. **Update Google Console:**
   - Add production redirect URI: `https://your-domain.com/auth/callback`
   - Add your production Supabase URL

2. **Update Supabase:**
   - Change Site URL to your production domain
   - Update redirect URLs

3. **Environment Variables:**
   - Update all URLs to production values
   - Ensure all secrets are properly configured

## 🔍 Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" Error:**
   - Check that redirect URIs match exactly in Google Console and Supabase

2. **"access_denied" Error:**
   - Verify YouTube API is enabled in Google Console
   - Check OAuth consent screen is configured

3. **"invalid_client" Error:**
   - Verify Client ID and Secret are correct
   - Check that OAuth client is for "Web application"

4. **User Not Redirected After Login:**
   - Check `redirectTo` parameter is properly encoded
   - Verify callback handler is working

### Debug Steps:
1. Check browser developer tools for errors
2. Verify environment variables are loaded
3. Check Supabase Auth logs in dashboard
4. Test with a simple redirect first (no custom redirectTo)

## 🎯 Next Steps

After OAuth is working:
1. Test the demo flow with real creator accounts
2. Set up email templates for magic links
3. Configure user profiles to store channel information
4. Implement YouTube API integration for comment fetching

---

Need help? Check the [Supabase Auth docs](https://supabase.com/docs/guides/auth) or [Google OAuth docs](https://developers.google.com/identity/protocols/oauth2). 