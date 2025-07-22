import express from 'express';
import { getSupabaseAdmin } from '../services/supabase';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// Get connected platforms for user
router.get('/connected', async (req, res) => {
  try {
    // TODO: Get user ID from auth token
    const userId = req.headers['x-user-id']; // Placeholder
    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_platforms')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    res.json({ platforms: data });
  } catch (error) {
    console.error('Connected platforms fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch connected platforms' });
  }
});

// Initiate OAuth flow
router.post('/connect/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    
    let authUrl = '';
    
    switch (platform) {
      case 'youtube':
        authUrl = `https://accounts.google.com/oauth2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.FRONTEND_URL + '/auth/callback')}&scope=https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline`;
        break;
      case 'instagram':
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.FRONTEND_URL + '/auth/callback')}&scope=user_profile,user_media&response_type=code`;
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }
    
    res.json({ authUrl });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

// Disconnect platform
router.delete('/disconnect/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    // TODO: Get user ID from auth token
    const userId = req.headers['x-user-id']; // Placeholder
    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided' });
    }
    
    const { error } = await supabaseAdmin
      .from('user_platforms')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Platform disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

// Sync data from platform
router.post('/sync/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    // TODO: Get user ID from auth token
    const userId = req.headers['x-user-id']; // Placeholder
    
    // TODO: Trigger background job to sync data from platform
    // This would typically queue a job for data ingestion
    
    res.json({ success: true, message: `${platform} sync initiated` });
  } catch (error) {
    console.error('Platform sync error:', error);
    res.status(500).json({ error: 'Failed to initiate sync' });
  }
});

export default router; 