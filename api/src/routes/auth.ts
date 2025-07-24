import express from 'express';
import { supabase } from '../services/supabase';
import { getSupabaseAdmin } from '../services/supabase';
import axios from 'axios';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// OAuth callback handler
router.post('/oauth/callback', async (req, res) => {
  try {
    const { provider, code, state } = req.body;
    
    // Handle OAuth callback based on provider
    switch (provider) {
      case 'youtube':
        // Handle YouTube OAuth
        break;
      case 'instagram':
        // Handle Instagram OAuth
        break;
      default:
        return res.status(400).json({ error: 'Unsupported provider' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Signout failed' });
  }
});

// Refresh Google access token
router.post('/refresh-google-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get the user's refresh token from user_platforms table
    const { data: platformData, error: platformError } = await supabaseAdmin
      .from('user_platforms')
      .select('refresh_token')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .single();

    if (platformError || !platformData?.refresh_token) {
      console.error('No refresh token found for user:', user.id);
      return res.status(404).json({ error: 'No YouTube account connected. Please connect your YouTube account.' });
    }

    // Exchange refresh token for new access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: platformData.refresh_token,
      grant_type: 'refresh_token'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, expires_in } = tokenResponse.data;

    // Update the stored access token in user_platforms table
    const { error: updateError } = await supabaseAdmin
      .from('user_platforms')
      .update({
        access_token: access_token,
        token_expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString()
      })
      .eq('user_id', user.id)
      .eq('platform', 'youtube');

    if (updateError) {
      console.error('Error updating access token:', updateError);
      // Don't fail the request, just log the error
    }

    res.json({
      access_token,
      expires_in,
      token_type: 'Bearer'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      // Invalid refresh token - user needs to re-authenticate
      return res.status(401).json({ 
        error: 'Refresh token expired. Please sign in again.',
        requiresReauth: true
      });
    }
    
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Check and store YouTube platform data from OAuth session
router.post('/setup-youtube-platform', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('🔍 Setting up YouTube platform for user:', user.id);
    console.log('User metadata:', JSON.stringify(user.user_metadata, null, 2));
    console.log('User identities:', JSON.stringify(user.identities, null, 2));
    console.log('User app_metadata:', JSON.stringify(user.app_metadata, null, 2));

    // Check if user already has YouTube platform data
    const { data: existingPlatform, error: checkError } = await supabaseAdmin
      .from('user_platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .single();

    if (existingPlatform) {
      console.log('✅ YouTube platform already exists for user:', user.id);
      return res.json({ 
        success: true, 
        message: 'YouTube platform already connected',
        platformData: {
          platformUserId: existingPlatform.platform_user_id,
          platformUsername: existingPlatform.platform_username,
          connectedAt: existingPlatform.connected_at
        }
      });
    }

    // Extract YouTube tokens from user metadata
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    // Try to get tokens from request body first (sent from frontend)
    if (req.body?.provider_token) {
      accessToken = req.body.provider_token;
      console.log('✅ Found access token in request body');
    }
    if (req.body?.provider_refresh_token) {
      refreshToken = req.body.provider_refresh_token;
      console.log('✅ Found refresh token in request body');
    }

    // Try to get tokens from user metadata
    if (!accessToken && user.user_metadata?.provider_token) {
      accessToken = user.user_metadata.provider_token;
      console.log('✅ Found access token in user metadata');
    }

    // Try to get refresh token from identities
    if (user.identities && Array.isArray(user.identities)) {
      const googleIdentity = user.identities.find((identity: any) => identity.provider === 'google');
      if (!accessToken && googleIdentity?.identity_data?.access_token) {
        accessToken = googleIdentity.identity_data.access_token;
        console.log('✅ Found access token in identity data');
      }
      if (!refreshToken && googleIdentity?.identity_data?.refresh_token) {
        refreshToken = googleIdentity.identity_data.refresh_token;
        console.log('✅ Found refresh token in identity data');
      }
    }

    if (!accessToken) {
      console.error('❌ No access token found in user data');
      console.error('Available user_metadata keys:', Object.keys(user.user_metadata || {}));
      console.error('Available identity providers:', user.identities?.map(i => i.provider) || []);
      
      return res.status(400).json({ 
        error: 'No YouTube access token found',
        suggestion: 'Please sign in with Google again to grant YouTube access',
        debug: {
          hasUserMetadata: !!user.user_metadata,
          userMetadataKeys: Object.keys(user.user_metadata || {}),
          hasIdentities: !!user.identities,
          identityProviders: user.identities?.map(i => i.provider) || [],
          hasProviderToken: !!user.user_metadata?.provider_token
        }
      });
    }

    // Get YouTube channel info to extract platform user ID and username
    const { google } = require('googleapis');
    const youtube = google.youtube('v3');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    let platformUserId = user.id; // fallback
    let platformUsername = user.email || 'Unknown User'; // fallback

    try {
      const channelResponse = await youtube.channels.list({
        auth: oauth2Client,
        part: ['snippet'],
        mine: true
      });

      if (channelResponse.data.items && channelResponse.data.items.length > 0) {
        const channel = channelResponse.data.items[0];
        platformUserId = channel.id;
        platformUsername = channel.snippet?.title || user.email || 'Unknown User';
      }
    } catch (youtubeError) {
      console.warn('Could not fetch YouTube channel info:', youtubeError);
      // Continue with fallback values
    }

    // Create user profile if it doesn't exist
    console.log('👤 Checking/creating user profile for:', user.id);
    
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking profile:', profileCheckError);
      return res.status(500).json({ 
        error: 'Failed to check user profile',
        details: profileCheckError.message
      });
    }

    if (!existingProfile) {
      console.log('📝 Creating new profile for user:', user.id);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('❌ Error creating profile:', {
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        
        return res.status(500).json({ 
          error: 'Failed to create user profile',
          details: profileError.message,
          code: profileError.code,
          hint: profileError.hint
        });
      }
      
      console.log('✅ Successfully created profile for user:', user.id);
    } else {
      console.log('✅ Profile already exists for user:', user.id);
    }

    // Store YouTube platform data
    console.log('📝 Attempting to store platform data:', {
      user_id: user.id,
      platform: 'youtube',
      platform_user_id: platformUserId,
      platform_username: platformUsername,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });

    const { data: platformData, error: platformError } = await supabaseAdmin
      .from('user_platforms')
      .insert({
        user_id: user.id,
        platform: 'youtube',
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: new Date(Date.now() + (3600 * 1000)).toISOString(), // 1 hour default
        connected_at: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (platformError) {
      console.error('❌ Database error storing YouTube platform data:', {
        error: platformError,
        code: platformError.code,
        message: platformError.message,
        details: platformError.details,
        hint: platformError.hint
      });
      
      return res.status(500).json({ 
        error: 'Failed to store YouTube platform data',
        details: platformError.message,
        code: platformError.code,
        hint: platformError.hint
      });
    }

    console.log('✅ Successfully stored YouTube platform data for user:', user.id);

    res.json({
      success: true,
      message: 'YouTube platform connected successfully',
      platformData: {
        platformUserId: platformData.platform_user_id,
        platformUsername: platformData.platform_username,
        connectedAt: platformData.connected_at
      }
    });

  } catch (error) {
    console.error('Setup YouTube platform error:', error);
    res.status(500).json({ 
      error: 'Failed to setup YouTube platform',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 