import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../services/supabase';

// Extend the Request interface to include the user ID
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No authorization header or invalid format',
        suggestion: 'Please sign in to access this resource'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase();
    
    // Verify the token and get user data
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        suggestion: 'Please sign out and sign in again'
      });
    }

    // Attach the user ID to the request object
    req.userId = user.id;
    
    console.log('✅ Authenticated user:', user.id);
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 