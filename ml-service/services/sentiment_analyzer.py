import asyncio
from typing import Dict, Any
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import logging

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    """Sentiment analysis service using multiple approaches."""
    
    def __init__(self):
        self.vader_analyzer = SentimentIntensityAnalyzer()
        logger.info("SentimentAnalyzer initialized")
    
    async def analyze(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text using VADER and TextBlob."""
        try:
            # VADER sentiment analysis
            vader_scores = self.vader_analyzer.polarity_scores(text)
            
            # TextBlob sentiment analysis
            blob = TextBlob(text)
            textblob_polarity = blob.sentiment.polarity
            textblob_subjectivity = blob.sentiment.subjectivity
            
            # Combine scores and determine overall sentiment
            compound_score = vader_scores['compound']
            
            # Weighted combination of VADER and TextBlob
            combined_score = (compound_score * 0.7) + (textblob_polarity * 0.3)
            
            # Determine sentiment label
            if combined_score >= 0.05:
                sentiment_label = "positive"
            elif combined_score <= -0.05:
                sentiment_label = "negative"
            else:
                sentiment_label = "neutral"
            
            return {
                "label": sentiment_label,
                "score": combined_score,
                "confidence": abs(combined_score),
                "details": {
                    "vader": vader_scores,
                    "textblob": {
                        "polarity": textblob_polarity,
                        "subjectivity": textblob_subjectivity
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {str(e)}")
            return {
                "label": "neutral",
                "score": 0.0,
                "confidence": 0.0,
                "error": str(e)
            }
    
    async def analyze_emotions(self, text: str) -> Dict[str, float]:
        """Analyze emotional content using VADER's emotion scores."""
        try:
            vader_scores = self.vader_analyzer.polarity_scores(text)
            
            # Map VADER scores to emotion categories
            emotions = {
                "joy": max(0, vader_scores['pos']),
                "anger": max(0, vader_scores['neg'] * 0.8),
                "sadness": max(0, vader_scores['neg'] * 0.6),
                "fear": max(0, vader_scores['neg'] * 0.4),
                "surprise": abs(vader_scores['compound']) * 0.3,
                "disgust": max(0, vader_scores['neg'] * 0.7)
            }
            
            # Normalize emotions to sum to 1
            total = sum(emotions.values())
            if total > 0:
                emotions = {k: v / total for k, v in emotions.items()}
            
            return emotions
            
        except Exception as e:
            logger.error(f"Emotion analysis error: {str(e)}")
            return {
                "joy": 0.0,
                "anger": 0.0,
                "sadness": 0.0,
                "fear": 0.0,
                "surprise": 0.0,
                "disgust": 0.0
            }
    
    async def batch_analyze(self, texts: list) -> list:
        """Analyze multiple texts in batch."""
        tasks = [self.analyze(text) for text in texts]
        return await asyncio.gather(*tasks) 