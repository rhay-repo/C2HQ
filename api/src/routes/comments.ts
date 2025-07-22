import express from 'express';
import { getSupabaseAdmin } from '../services/supabase';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// Get comments with filters
router.get('/', async (req, res) => {
  try {
    const { 
      platform, 
      sentiment, 
      toxicity_level, 
      page = 1, 
      limit = 50,
      search,
      date_from,
      date_to 
    } = req.query;

    let query = supabaseAdmin
      .from('comments')
      .select(`
        *,
        videos (
          title,
          platform,
          platform_video_id
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (platform) {
      query = query.eq('videos.platform', platform);
    }
    
    if (sentiment) {
      query = query.eq('sentiment', sentiment);
    }
    
    if (toxicity_level) {
      query = query.gte('toxicity_score', parseFloat(toxicity_level as string));
    }
    
    if (search) {
      query = query.ilike('content', `%${search}%`);
    }
    
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    
    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ comments: data });
  } catch (error) {
    console.error('Comments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get comment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select(`
        *,
        videos (
          title,
          platform,
          platform_video_id,
          thumbnail_url
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json({ comment: data });
  } catch (error) {
    console.error('Comment fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch comment' });
  }
});

// Trigger reanalysis of comment
router.post('/:id/reanalyze', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Send to ML service for reanalysis
    // This would typically queue a job for the Python ML service
    
    res.json({ success: true, message: 'Comment queued for reanalysis' });
  } catch (error) {
    console.error('Reanalysis error:', error);
    res.status(500).json({ error: 'Failed to queue reanalysis' });
  }
});

export default router; 