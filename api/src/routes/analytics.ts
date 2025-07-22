import express from 'express';
import { getSupabaseAdmin } from '../services/supabase';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// Get sentiment distribution
router.get('/sentiment', async (req, res) => {
  try {
    const { platform, date_from, date_to } = req.query;
    
    let query = supabaseAdmin
      .from('comments')
      .select('sentiment');
    
    if (platform) {
      query = query.eq('videos.platform', platform);
    }
    
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    
    if (date_to) {
      query = query.lte('created_at', date_to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Calculate sentiment distribution
    const distribution = data.reduce((acc: any, comment: any) => {
      acc[comment.sentiment] = (acc[comment.sentiment] || 0) + 1;
      return acc;
    }, {});
    
    res.json({ sentiment_distribution: distribution });
  } catch (error) {
    console.error('Sentiment analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment analytics' });
  }
});

// Get toxicity levels over time
router.get('/toxicity', async (req, res) => {
  try {
    const { platform, date_from, date_to } = req.query;
    
    let query = supabaseAdmin
      .from('comments')
      .select('toxicity_score, created_at');
    
    if (platform) {
      query = query.eq('videos.platform', platform);
    }
    
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    
    if (date_to) {
      query = query.lte('created_at', date_to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Group by date and calculate average toxicity
    const dailyToxicity = data.reduce((acc: any, comment: any) => {
      const date = comment.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, count: 0 };
      }
      acc[date].total += comment.toxicity_score;
      acc[date].count += 1;
      return acc;
    }, {});
    
    const result = Object.entries(dailyToxicity).map(([date, data]: [string, any]) => ({
      date,
      average_toxicity: data.total / data.count
    }));
    
    res.json({ toxicity_over_time: result });
  } catch (error) {
    console.error('Toxicity analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch toxicity analytics' });
  }
});

// Get top themes/topics
router.get('/themes', async (req, res) => {
  try {
    const { platform, date_from, date_to, limit = 10 } = req.query;
    
    let query = supabaseAdmin
      .from('comments')
      .select('themes');
    
    if (platform) {
      query = query.eq('videos.platform', platform);
    }
    
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    
    if (date_to) {
      query = query.lte('created_at', date_to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Extract and count themes
    const themeCount: { [key: string]: number } = {};
    data.forEach((comment: any) => {
      if (comment.themes && Array.isArray(comment.themes)) {
        comment.themes.forEach((theme: string) => {
          themeCount[theme] = (themeCount[theme] || 0) + 1;
        });
      }
    });
    
    // Sort by count and limit
    const topThemes = Object.entries(themeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit as string))
      .map(([theme, count]) => ({ theme, count }));
    
    res.json({ top_themes: topThemes });
  } catch (error) {
    console.error('Themes analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch themes analytics' });
  }
});

// Get overall stats
router.get('/overview', async (req, res) => {
  try {
    const { platform, date_from, date_to } = req.query;
    
    let query = supabaseAdmin
      .from('comments')
      .select('sentiment, toxicity_score, created_at');
    
    if (platform) {
      query = query.eq('videos.platform', platform);
    }
    
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    
    if (date_to) {
      query = query.lte('created_at', date_to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const stats = {
      total_comments: data.length,
      average_toxicity: data.reduce((sum: number, c: any) => sum + c.toxicity_score, 0) / data.length,
      sentiment_breakdown: data.reduce((acc: any, c: any) => {
        acc[c.sentiment] = (acc[c.sentiment] || 0) + 1;
        return acc;
      }, {}),
      high_toxicity_count: data.filter((c: any) => c.toxicity_score > 0.7).length
    };
    
    res.json({ overview: stats });
  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
});

export default router; 