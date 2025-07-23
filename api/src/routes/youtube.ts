import express from 'express';
import { google } from 'googleapis';
import { getSupabaseAdmin } from '../services/supabase';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// Initialize YouTube API
const youtube = google.youtube('v3');

// Define proper types for Supabase user data
interface GoogleUserIdentity {
  provider: string;
  identity_data?: {
    access_token?: string;
    refresh_token?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface SupabaseUser {
  id: string;
  user_metadata?: {
    provider_token?: string;
    [key: string]: any;
  };
  app_metadata?: {
    provider_token?: string;
    [key: string]: any;
  };
  identities?: GoogleUserIdentity[];
  [key: string]: any;
}

// Helper function to extract access token from Supabase user data
function extractAccessToken(userData: SupabaseUser): string | null {
  // Try different locations where Supabase might store the provider token
  if (userData.user_metadata?.provider_token) {
    return userData.user_metadata.provider_token;
  }
  
  if (userData.app_metadata?.provider_token) {
    return userData.app_metadata.provider_token;
  }
  
  // Check identities array for Google provider
  if (userData.identities && Array.isArray(userData.identities)) {
    const googleIdentity = userData.identities.find((identity: GoogleUserIdentity) => identity.provider === 'google');
    if (googleIdentity?.identity_data?.access_token) {
      return googleIdentity.identity_data.access_token;
    }
  }
  
  return null;
}

// Get YouTube channel data
router.get('/channel/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to get access token from header first
    let accessToken: string | null = req.headers['x-provider-token'] as string || null;
    
    if (!accessToken) {
      // Fallback: Get user's access token from Supabase
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error || !userData?.user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Extract access token with proper typing
      accessToken = extractAccessToken(userData.user as SupabaseUser);
    }
    
    if (!accessToken) {
      console.log('No access token found for user:', userId);
      return res.status(401).json({ 
        error: 'No access token found',
        debug: 'Make sure you are properly authenticated with Google',
        suggestion: 'Try signing out and signing in again'
      });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Fetch channel data with error handling
    let channelResponse;
    try {
      channelResponse = await youtube.channels.list({
        auth: oauth2Client,
        part: ['snippet', 'statistics', 'brandingSettings', 'contentDetails'],
        mine: true
      });
    } catch (apiError) {
      console.error('YouTube channels API error:', apiError);
      return res.status(403).json({ 
        error: 'YouTube API access denied',
        details: 'Make sure YouTube Data API v3 is enabled and permissions are granted',
        suggestion: 'Try re-authenticating with Google to refresh your permissions'
      });
    }

    const channel = channelResponse.data.items?.[0];
    
    if (!channel) {
      return res.status(404).json({ 
        error: 'No YouTube channel found for this account',
        suggestion: 'Make sure you have a YouTube channel associated with your Google account'
      });
    }

    // Get recent videos (simplified approach)
    const videosWithStats: any[] = [];
    
    try {
      // Get uploads playlist ID
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      
      if (uploadsPlaylistId) {
        // Get recent videos from uploads playlist
        const playlistResponse = await youtube.playlistItems.list({
          auth: oauth2Client,
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: 10
        });

        if (playlistResponse.data.items) {
          const videoIds = playlistResponse.data.items
            .map((item: any) => item.snippet?.resourceId?.videoId)
            .filter(Boolean)
            .slice(0, 10); // Limit to 10 videos

          if (videoIds.length > 0) {
            // Get video statistics - Ensure id is passed as array
            const videoStatsResponse = await youtube.videos.list({
              auth: oauth2Client,
              part: ['snippet', 'statistics', 'contentDetails'],
              id: videoIds // This is already an array of strings
            });
            
            // Properly handle the response data
            if (videoStatsResponse.data?.items) {
              videosWithStats.push(...videoStatsResponse.data.items);
            }
          }
        }
      }
    } catch (videosError) {
      console.warn('Error fetching videos:', videosError);
      // Continue without videos data
    }

    // Structure the response data
    const channelData = {
      channel: {
        id: channel.id || '',
        name: channel.snippet?.title || 'Unknown Channel',
        description: channel.snippet?.description || '',
        profileImage: channel.snippet?.thumbnails?.high?.url || 
                     channel.snippet?.thumbnails?.medium?.url || 
                     channel.snippet?.thumbnails?.default?.url || '',
        bannerImage: channel.brandingSettings?.image?.bannerExternalUrl || null,
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        totalViews: parseInt(channel.statistics?.viewCount || '0'),
        createdAt: channel.snippet?.publishedAt || '',
        country: channel.snippet?.country || null,
        customUrl: channel.snippet?.customUrl || null
      },
      videos: videosWithStats.map((video: any) => ({
        id: video.id || '',
        title: video.snippet?.title || 'Untitled Video',
        description: video.snippet?.description || '',
        thumbnail: video.snippet?.thumbnails?.medium?.url || 
                  video.snippet?.thumbnails?.default?.url || '',
        publishedAt: video.snippet?.publishedAt || '',
        views: parseInt(video.statistics?.viewCount || '0'),
        likes: parseInt(video.statistics?.likeCount || '0'),
        comments: parseInt(video.statistics?.commentCount || '0'),
        duration: video.contentDetails?.duration || ''
      }))
    };

    res.json(channelData);
  } catch (error) {
    console.error('YouTube API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch YouTube data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple test endpoint to debug auth issues
router.get('/test/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error || !userData?.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accessToken = extractAccessToken(userData.user as SupabaseUser);

    res.json({
      userId,
      hasAccessToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0,
      userStructure: {
        hasUserMetadata: !!userData.user.user_metadata,
        hasAppMetadata: !!userData.user.app_metadata,
        hasIdentities: !!userData.user.identities,
        identitiesCount: userData.user.identities?.length || 0,
        providers: userData.user.identities?.map((i: any) => i.provider) || []
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 