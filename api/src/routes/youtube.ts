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

// Debug endpoint to check OAuth scopes and permissions
router.get('/debug-scopes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get access token
    let accessToken: string | null = req.headers['x-provider-token'] as string || null;
    
    if (!accessToken) {
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      accessToken = extractAccessToken(user.user as SupabaseUser);
    }

    if (!accessToken) {
      return res.status(401).json({ error: 'No access token found' });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Test basic channel access
    let channelTest = null;
    try {
      const channelResponse = await youtube.channels.list({
        auth: oauth2Client,
        part: ['snippet'],
        mine: true
      });
      channelTest = {
        success: true,
        channelCount: channelResponse.data.items?.length || 0,
        channelName: channelResponse.data.items?.[0]?.snippet?.title || 'Unknown'
      };
    } catch (error) {
      channelTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test comments access on a specific video (if you have one)
    let commentsTest = null;
    try {
      // Try to get comments from a popular video to test permissions
      const commentsResponse = await youtube.commentThreads.list({
        auth: oauth2Client,
        part: ['snippet'],
        videoId: 'dQw4w9WgXcQ', // Rick Roll video (always has comments)
        maxResults: 1
      });
      commentsTest = {
        success: true,
        commentsCount: commentsResponse.data.items?.length || 0
      };
    } catch (error) {
      commentsTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    res.json({
      accessToken: {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null
      },
      channelTest,
      commentsTest,
      requiredScopes: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ]
    });

  } catch (error) {
    console.error('Debug scopes error:', error);
    res.status(500).json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get YouTube channel comments
router.get('/comments/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get access token from header or user metadata
    let accessToken: string | null = req.headers['x-provider-token'] as string || null;
    
    if (!accessToken) {
      // Fallback: get token from user metadata
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      accessToken = extractAccessToken(user.user as SupabaseUser);
      if (!accessToken) {
        return res.status(401).json({ error: 'No access token found' });
      }
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // First, get the user's channel to get channel ID
    const channelResponse = await youtube.channels.list({
      auth: oauth2Client,
      part: ['snippet', 'contentDetails'],
      mine: true
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'No YouTube channel found for this account' });
    }

    const channel = channelResponse.data.items[0];
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return res.status(404).json({ error: 'No uploads playlist found for this channel' });
    }

    // Get recent videos from uploads playlist
    const videosResponse = await youtube.playlistItems.list({
      auth: oauth2Client,
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 10
    });

    console.log('📹 Videos found:', videosResponse.data.items?.length || 0);
    console.log('📹 Uploads playlist ID:', uploadsPlaylistId);

    if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
      console.log('❌ No videos found in uploads playlist');
      return res.json({ comments: [] });
    }

    const videoIds = videosResponse.data.items
      .map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    console.log('🎬 Video IDs found:', videoIds);
    console.log('🎬 Video titles:', videosResponse.data.items.map((item: any) => item.snippet?.title));

    if (videoIds.length === 0) {
      console.log('❌ No valid video IDs found');
      return res.json({ comments: [] });
    }

    // Fetch comments for all videos
    const allComments: any[] = [];
    
    for (const videoId of videoIds) {
      try {
        console.log(`🔍 Fetching comments for video: ${videoId}`);
        
        const commentsResponse = await youtube.commentThreads.list({
          auth: oauth2Client,
          part: ['snippet'],
          videoId: videoId,
          maxResults: 20,
          order: 'time'
        });

        console.log(`📝 Comments response for ${videoId}:`, {
          itemsCount: commentsResponse.data.items?.length || 0,
          pageInfo: commentsResponse.data.pageInfo,
          hasNextPageToken: !!commentsResponse.data.nextPageToken
        });

        if (commentsResponse.data.items) {
          const videoComments = commentsResponse.data.items.map((item: any) => {
            const comment = item.snippet?.topLevelComment?.snippet;
            const videoItem = videosResponse.data.items?.find((v: any) => 
              v.snippet?.resourceId?.videoId === videoId
            );
            
            return {
              id: item.id,
              videoId: videoId,
              videoTitle: videoItem?.snippet?.title || 'Unknown Video',
              author: comment?.authorDisplayName || 'Unknown Author',
              authorProfileImage: comment?.authorProfileImageUrl || null,
              content: comment?.textDisplay || '',
              publishedAt: comment?.publishedAt || '',
              likeCount: parseInt(comment?.likeCount || '0'),
              platform: 'YouTube',
              // We'll add sentiment analysis later
              sentiment: 'Neutral',
              sentimentScore: 0.5
            };
          });
          
          console.log(`✅ Found ${videoComments.length} comments for video ${videoId}`);
          allComments.push(...videoComments);
        } else {
          console.log(`⚠️ No comments found for video ${videoId}`);
        }
      } catch (error) {
        console.error(`❌ Error fetching comments for video ${videoId}:`, error);
        // Log the specific error details
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          
          // Check for specific error types
          if (error.message.includes('quota') || error.message.includes('rate limit')) {
            console.error('🚦 RATE LIMIT DETECTED - YouTube API quota exceeded');
          } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            console.error('🔒 PERMISSION DENIED - OAuth scopes may be insufficient');
          } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            console.error('📝 NO COMMENTS FOUND - Video may have comments disabled');
          } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
            console.error('❌ BAD REQUEST - Check video ID and API parameters');
          }
        }
        // Continue with other videos
      }
    }

    console.log(`📊 Total comments collected: ${allComments.length}`);

    // Sort by published date (most recent first) and limit results
    const sortedComments = allComments
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);

    console.log(`🎯 Final comments to return: ${sortedComments.length}`);

    res.json({
      comments: sortedComments,
      totalComments: sortedComments.length,
      channelInfo: {
        name: channel.snippet?.title || 'Unknown Channel',
        id: channel.id
      }
    });

  } catch (error) {
    console.error('YouTube comments API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch YouTube comments' 
    });
  }
});

// Sync YouTube comments to Supabase database
router.post('/sync-comments/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    let accessToken: string | null = req.headers['x-provider-token'] as string || null;
    if (!accessToken) {
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      accessToken = extractAccessToken(user.user as SupabaseUser);
      if (!accessToken) {
        return res.status(401).json({ error: 'No access token found' });
      }
    }
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    // Get channel and videos (reuse logic from GET /comments/:userId)
    const channelResponse = await youtube.channels.list({
      auth: oauth2Client,
      part: ['snippet', 'contentDetails'],
      mine: true
    });
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'No YouTube channel found for this account' });
    }
    const channel = channelResponse.data.items[0];
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return res.status(404).json({ error: 'No uploads playlist found for this channel' });
    }
    const videosResponse = await youtube.playlistItems.list({
      auth: oauth2Client,
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 10
    });
    if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
      return res.json({ inserted: 0, message: 'No videos found' });
    }
    const videoIds = videosResponse.data.items
      .map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean);
    // Fetch comments for all videos
    let inserted = 0;
    for (const videoId of videoIds) {
      // Find or create video in DB
      let videoDbId = null;
      const videoItem = videosResponse.data.items.find((v: any) => v.snippet?.resourceId?.videoId === videoId);
      const videoTitle = videoItem?.snippet?.title || 'Unknown Video';
      // Upsert video
      const { data: videoRow, error: videoError } = await supabaseAdmin
        .from('videos')
        .upsert({
          platform_video_id: videoId,
          platform: 'youtube',
          title: videoTitle,
          user_id: userId
        }, { onConflict: 'platform_video_id,platform' })
        .select('id')
        .single();
      if (videoError) {
        console.error('Video upsert error:', videoError);
        continue;
      }
      videoDbId = videoRow.id;
      // Fetch comments
      const commentsResponse = await youtube.commentThreads.list({
        auth: oauth2Client,
        part: ['snippet'],
        videoId: videoId,
        maxResults: 20,
        order: 'time'
      });
      if (commentsResponse.data.items) {
        for (const item of commentsResponse.data.items) {
          const comment = item.snippet?.topLevelComment?.snippet;
          if (!comment) continue;
          // Upsert comment by platform_comment_id + video_id
          const { error: commentError } = await supabaseAdmin
            .from('comments')
            .upsert({
              video_id: videoDbId,
              platform_comment_id: item.id,
              author_name: comment.authorDisplayName || 'Unknown Author',
              author_avatar: comment.authorProfileImageUrl || null,
              author_id: comment.authorChannelId?.value || null,
              content: comment.textDisplay || '',
              published_at: comment.publishedAt || null,
              like_count: comment.likeCount || 0,
              reply_count: item.snippet?.totalReplyCount || 0,
              platform: 'youtube'
            }, { onConflict: 'platform_comment_id,video_id' });
          if (!commentError) inserted++;
        }
      }
    }
    res.json({ inserted, message: `Inserted or updated ${inserted} comments.` });
  } catch (error) {
    console.error('YouTube sync-comments API error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to sync YouTube comments' });
  }
});

export default router; 