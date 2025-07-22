import express from 'express';
import { supabase } from '../services/supabase';

const router = express.Router();

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

export default router; 