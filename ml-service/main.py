from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import logging

# Import services
from services.sentiment_analyzer import SentimentAnalyzer
from services.toxicity_detector import ToxicityDetector
from services.theme_extractor import ThemeExtractor
from services.perspective_api import PerspectiveAPIClient
from services.supabase_client import SupabaseClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="C2HQ ML Service",
    description="Machine Learning service for comment analysis",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
sentiment_analyzer = SentimentAnalyzer()
toxicity_detector = ToxicityDetector()
theme_extractor = ThemeExtractor()
perspective_client = PerspectiveAPIClient()
supabase_client = SupabaseClient()

# Request/Response models
class CommentAnalysisRequest(BaseModel):
    comment_id: str
    content: str
    video_id: Optional[str] = None

class CommentAnalysisResponse(BaseModel):
    comment_id: str
    sentiment: str
    sentiment_score: float
    toxicity_score: float
    themes: List[str]
    emotions: Dict[str, float]
    
class BatchAnalysisRequest(BaseModel):
    comments: List[CommentAnalysisRequest]

@app.get("/")
async def root():
    return {
        "message": "C2HQ ML Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "sentiment_analyzer": "ready",
            "toxicity_detector": "ready",
            "theme_extractor": "ready",
            "perspective_api": "ready"
        }
    }

@app.post("/analyze/comment", response_model=CommentAnalysisResponse)
async def analyze_comment(request: CommentAnalysisRequest):
    """Analyze a single comment for sentiment, toxicity, and themes."""
    try:
        logger.info(f"Analyzing comment: {request.comment_id}")
        
        # Perform all analyses
        sentiment_result = await sentiment_analyzer.analyze(request.content)
        toxicity_result = await toxicity_detector.analyze(request.content)
        themes = await theme_extractor.extract_themes(request.content)
        emotions = await sentiment_analyzer.analyze_emotions(request.content)
        
        # Use Perspective API for additional toxicity check
        perspective_toxicity = await perspective_client.analyze_toxicity(request.content)
        
        # Combine toxicity scores (weighted average)
        combined_toxicity = (toxicity_result * 0.7) + (perspective_toxicity * 0.3)
        
        response = CommentAnalysisResponse(
            comment_id=request.comment_id,
            sentiment=sentiment_result["label"],
            sentiment_score=sentiment_result["score"],
            toxicity_score=combined_toxicity,
            themes=themes,
            emotions=emotions
        )
        
        logger.info(f"Analysis complete for comment: {request.comment_id}")
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing comment {request.comment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze/batch")
async def analyze_batch(request: BatchAnalysisRequest, background_tasks: BackgroundTasks):
    """Analyze multiple comments in batch."""
    try:
        logger.info(f"Starting batch analysis for {len(request.comments)} comments")
        
        # For large batches, process in background
        if len(request.comments) > 10:
            background_tasks.add_task(process_batch_analysis, request.comments)
            return {"message": "Batch analysis started", "status": "processing"}
        
        # Process small batches immediately
        results = []
        for comment_req in request.comments:
            try:
                result = await analyze_comment(comment_req)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to analyze comment {comment_req.comment_id}: {str(e)}")
                continue
        
        return {"results": results, "status": "completed"}
        
    except Exception as e:
        logger.error(f"Batch analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")

async def process_batch_analysis(comments: List[CommentAnalysisRequest]):
    """Background task for processing large batches."""
    logger.info(f"Processing batch of {len(comments)} comments in background")
    
    for comment_req in comments:
        try:
            result = await analyze_comment(comment_req)
            
            # Update database with results
            await supabase_client.update_comment_analysis(
                comment_req.comment_id,
                {
                    "sentiment": result.sentiment,
                    "sentiment_score": result.sentiment_score,
                    "toxicity_score": result.toxicity_score,
                    "themes": result.themes,
                    "emotions": result.emotions,
                    "analysis_completed_at": "now()"
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to process comment {comment_req.comment_id}: {str(e)}")
            continue
    
    logger.info("Batch analysis completed")

@app.post("/retrain/sentiment")
async def retrain_sentiment_model():
    """Retrain sentiment analysis model with new data."""
    try:
        # TODO: Implement model retraining logic
        return {"message": "Sentiment model retraining initiated", "status": "started"}
    except Exception as e:
        logger.error(f"Model retraining error: {str(e)}")
        raise HTTPException(status_code=500, detail="Model retraining failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 