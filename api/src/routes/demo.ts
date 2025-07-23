import express from 'express';
import { getSupabaseAdmin } from '../services/supabase';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// Get demo data by email
router.get('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('demo_comment_sets')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'No demo data found for this email' });
    }

    // Return the demo data
    res.json(data.demo_data);
  } catch (error) {
    console.error('Demo data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch demo data' });
  }
});

// Create or update demo data (for admin use)
router.post('/', async (req, res) => {
  try {
    const { email, channel_id, channel_name, demo_data } = req.body;
    
    if (!email || !demo_data) {
      return res.status(400).json({ error: 'Email and demo_data are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('demo_comment_sets')
      .upsert({
        email,
        channel_id,
        channel_name,
        demo_data
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Demo data creation error:', error);
    res.status(500).json({ error: 'Failed to create demo data' });
  }
});

export default router; 