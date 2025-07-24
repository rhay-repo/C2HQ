# Google Access Token Refresh System

This document explains how the automatic Google access token refresh system works in C2HQ.

## Overview

The system automatically handles Google access token expiration by:
1. Storing refresh tokens securely in Supabase's `auth.flow_state` table
2. Providing a backend endpoint to refresh tokens using the stored refresh token
3. Offering a frontend token manager that handles token caching and automatic refresh
4. Updating all YouTube API endpoints to use the new token system

## Architecture

### Backend Components

#### 1. Token Refresh Endpoint (`/api/auth/refresh-google-token`)

**Location:** `api/src/routes/auth.ts`

**Purpose:** Refreshes Google access tokens using stored refresh tokens

**How it works:**
- Validates the user's Supabase session
- Retrieves the refresh token from `auth.flow_state` table
- Calls Google's OAuth2 token endpoint with `grant_type=refresh_token`
- Updates the access token in `user_platforms` table
- Returns the new access token to the frontend

**Example response:**
```json
{
  "access_token": "ya29.a0AfH6SMC...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### 2. Updated YouTube API Routes

**Location:** `api/src/routes/youtube.ts`

**Changes:**
- All endpoints now use `getValidAccessToken()` helper function
- Automatic token refresh before making YouTube API calls
- Proper error handling for expired refresh tokens

**Updated endpoints:**
- `GET /api/youtube/channel/:userId`
- `GET /api/youtube/comments/:userId`
- `POST /api/youtube/sync-comments/:userId`

### Frontend Components

#### 1. Google Token Manager

**Location:** `frontend/src/lib/google-token-manager.ts`

**Features:**
- Singleton pattern for token caching
- Automatic token refresh when expired (with 5-minute buffer)
- Prevents multiple simultaneous refresh requests
- Handles re-authentication when refresh tokens expire

**Key methods:**
- `getValidAccessToken()`: Returns a valid access token, refreshing if needed
- `clearCache()`: Clears the token cache (useful on logout)
- `isTokenExpired()`: Checks if a token is expired or will expire soon

#### 2. Utility Functions

**`makeAuthenticatedGoogleRequest<T>()`:**
- Makes authenticated requests to Google APIs
- Automatically handles token refresh
- Returns typed responses

**`handleGoogleApiError()`:**
- Handles Google API errors
- Triggers re-authentication when needed
- Redirects to login page for expired refresh tokens

#### 3. Example Component

**Location:** `frontend/src/components/YouTubeDataFetcher.tsx`

**Demonstrates:**
- How to use the token manager in React components
- Error handling for Google API requests
- Token cache management

## Database Schema

### Tables Used

#### `auth.flow_state` (Supabase Auth)
- Stores `provider_refresh_token` for Google OAuth
- Managed by Supabase Auth system
- Secure storage of refresh tokens

#### `user_platforms` (Custom Table)
```sql
CREATE TABLE public.user_platforms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter')),
    platform_user_id TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, platform)
);
```

## Usage Examples

### 1. Making Authenticated Google API Requests

```typescript
import { makeAuthenticatedGoogleRequest, handleGoogleApiError } from '@/lib/google-token-manager';

// Fetch YouTube channel data
try {
  const channelData = await makeAuthenticatedGoogleRequest<YouTubeChannel>(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true'
  );
  console.log('Channel:', channelData);
} catch (error) {
  handleGoogleApiError(error);
}
```

### 2. Using the Token Manager Directly

```typescript
import { googleTokenManager } from '@/lib/google-token-manager';

// Get a valid access token
const token = await googleTokenManager.getValidAccessToken();

// Make a custom request
const response = await fetch('https://www.googleapis.com/youtube/v3/videos', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### 3. Backend Token Refresh

```typescript
// In your API route
import { getValidAccessToken } from '../utils/token-helpers';

router.get('/youtube/data/:userId', async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.params.userId);
    // Use the token for YouTube API calls
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});
```

## Authentication Flow

### 1. Initial Login
1. User signs in with Google OAuth
2. Supabase stores access token and refresh token in `auth.flow_state`
3. Tokens are also stored in `user_platforms` table for easy access

### 2. Token Usage
1. Frontend requests data from backend
2. Backend calls `getValidAccessToken()` helper
3. If token is expired, refresh token is used to get new access token
4. New token is stored and returned
5. API request proceeds with valid token

### 3. Token Expiration Handling
1. When access token expires, refresh token is used automatically
2. If refresh token is also expired, user is redirected to login
3. New tokens are stored and cached for future use

## Error Handling

### Common Error Scenarios

#### 1. Access Token Expired
- **Detection:** 401 Unauthorized from Google API
- **Action:** Automatically refresh using stored refresh token
- **User Experience:** Seamless, no interruption

#### 2. Refresh Token Expired
- **Detection:** 400 Bad Request from Google OAuth endpoint
- **Action:** Clear token cache and redirect to login
- **User Experience:** User needs to re-authenticate

#### 3. Network Errors
- **Detection:** Network timeouts or connection errors
- **Action:** Retry with exponential backoff
- **User Experience:** Show loading state, retry automatically

### Error Response Format

```json
{
  "error": "Authentication failed",
  "details": "Refresh token expired. Please sign in again.",
  "suggestion": "Please sign out and sign in again to refresh your access",
  "requiresReauth": true
}
```

## Security Considerations

### 1. Token Storage
- Refresh tokens are stored securely in Supabase's `auth.flow_state` table
- Access tokens are cached in memory only (not persisted)
- Tokens are never exposed to the client-side

### 2. Token Rotation
- Supabase handles refresh token rotation automatically
- Old refresh tokens are invalidated when new ones are issued
- Prevents token reuse attacks

### 3. Scope Management
- Only necessary scopes are requested during OAuth
- Tokens are scoped to specific Google APIs (YouTube, etc.)
- Minimal permissions principle is followed

## Environment Variables

### Required Backend Variables
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Required Frontend Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing

### 1. Test Token Refresh
```bash
# Test the refresh endpoint
curl -X POST http://localhost:3001/api/auth/refresh-google-token \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Test YouTube API Integration
```bash
# Test channel endpoint
curl http://localhost:3001/api/youtube/channel/YOUR_USER_ID
```

### 3. Frontend Testing
- Use the `YouTubeDataFetcher` component to test token management
- Check browser network tab for token refresh requests
- Verify error handling with expired tokens

## Troubleshooting

### Common Issues

#### 1. "No refresh token found" Error
- **Cause:** User hasn't authenticated with Google or refresh token was lost
- **Solution:** Have user sign out and sign in again

#### 2. "Refresh token expired" Error
- **Cause:** Refresh token has expired (usually after 6 months)
- **Solution:** User needs to re-authenticate with Google

#### 3. YouTube API Permission Errors
- **Cause:** Missing YouTube Data API v3 scopes
- **Solution:** Ensure OAuth scopes include `https://www.googleapis.com/auth/youtube.readonly`

#### 4. Token Cache Issues
- **Cause:** Stale tokens in memory cache
- **Solution:** Call `googleTokenManager.clearCache()` or restart the app

### Debug Steps

1. Check Supabase Auth logs for token storage
2. Verify Google OAuth scopes in Supabase config
3. Test token refresh endpoint directly
4. Check browser console for token-related errors
5. Verify environment variables are set correctly

## Migration Guide

### From Old Token System

If you're migrating from the old token system:

1. **Update API calls:** Replace direct token usage with `getValidAccessToken()`
2. **Update frontend:** Use `makeAuthenticatedGoogleRequest()` for Google API calls
3. **Test thoroughly:** Verify all YouTube API endpoints work with new system
4. **Monitor logs:** Check for any token-related errors during migration

### Backward Compatibility

The new system maintains backward compatibility:
- Existing OAuth flows continue to work
- Old tokens are automatically refreshed when needed
- No breaking changes to existing API contracts

## Performance Considerations

### 1. Token Caching
- Access tokens are cached in memory for 55 minutes (5-minute buffer)
- Reduces API calls to Google's token endpoint
- Improves response times for subsequent requests

### 2. Concurrent Requests
- Multiple simultaneous requests share the same token refresh
- Prevents duplicate refresh requests
- Uses Promise-based locking mechanism

### 3. Error Recovery
- Failed requests are retried automatically
- Exponential backoff prevents API rate limiting
- Graceful degradation when services are unavailable

## Future Enhancements

### 1. Token Monitoring
- Add metrics for token refresh frequency
- Monitor token expiration patterns
- Alert on unusual token usage

### 2. Multi-Platform Support
- Extend system to support other OAuth providers
- Unified token management across platforms
- Platform-specific error handling

### 3. Advanced Caching
- Redis-based token caching for distributed systems
- Token pre-refresh for critical operations
- Intelligent token refresh scheduling 