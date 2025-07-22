import os
from typing import Dict, Any, Optional
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    """Supabase client for ML service database operations."""
    
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and service role key are required")
        
        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("SupabaseClient initialized")
    
    async def update_comment_analysis(self, comment_id: str, analysis_data: Dict[str, Any]) -> bool:
        """Update comment with ML analysis results."""
        try:
            response = self.client.table('comments').update(analysis_data).eq('id', comment_id).execute()
            
            if response.data:
                logger.info(f"Successfully updated analysis for comment {comment_id}")
                return True
            else:
                logger.error(f"Failed to update comment {comment_id}: {response}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating comment analysis: {str(e)}")
            return False
    
    async def get_comment(self, comment_id: str) -> Optional[Dict[str, Any]]:
        """Get comment by ID."""
        try:
            response = self.client.table('comments').select('*').eq('id', comment_id).single().execute()
            
            if response.data:
                return response.data
            else:
                logger.warning(f"Comment {comment_id} not found")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching comment: {str(e)}")
            return None
    
    async def get_unanalyzed_comments(self, limit: int = 100) -> list:
        """Get comments that haven't been analyzed yet."""
        try:
            response = self.client.table('comments').select('*').is_('sentiment', 'null').limit(limit).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error fetching unanalyzed comments: {str(e)}")
            return []
    
    async def batch_update_comments(self, updates: list) -> bool:
        """Update multiple comments in batch."""
        try:
            for update in updates:
                comment_id = update.pop('id')
                await self.update_comment_analysis(comment_id, update)
            
            logger.info(f"Batch updated {len(updates)} comments")
            return True
            
        except Exception as e:
            logger.error(f"Error in batch update: {str(e)}")
            return False
    
    async def log_analysis_job(self, job_data: Dict[str, Any]) -> bool:
        """Log analysis job for tracking."""
        try:
            response = self.client.table('analysis_jobs').insert(job_data).execute()
            
            if response.data:
                logger.info(f"Analysis job logged: {job_data.get('job_id')}")
                return True
            else:
                logger.error(f"Failed to log analysis job: {response}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging analysis job: {str(e)}")
            return False 