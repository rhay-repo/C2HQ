import asyncio
import re
from typing import List, Dict, Any
from collections import Counter
import logging

logger = logging.getLogger(__name__)

class ThemeExtractor:
    """Theme and topic extraction service."""
    
    def __init__(self):
        # Predefined theme categories with keywords
        self.theme_keywords = {
            'appreciation': ['love', 'amazing', 'awesome', 'great', 'fantastic', 'wonderful', 'excellent', 'brilliant'],
            'criticism': ['bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointing', 'boring'],
            'questions': ['why', 'how', 'what', 'when', 'where', 'who', '?'],
            'suggestions': ['should', 'could', 'would', 'try', 'maybe', 'suggest', 'idea', 'think'],
            'personal_story': ['i', 'me', 'my', 'myself', 'personal', 'experience', 'story'],
            'technical': ['code', 'programming', 'software', 'bug', 'feature', 'technical', 'algorithm'],
            'entertainment': ['funny', 'hilarious', 'laugh', 'lol', 'haha', 'comedy', 'entertainment'],
            'educational': ['learn', 'tutorial', 'explain', 'understand', 'knowledge', 'education'],
            'emotional': ['feel', 'emotion', 'sad', 'happy', 'angry', 'excited', 'worried'],
            'community': ['everyone', 'community', 'together', 'group', 'people', 'fans'],
            'requests': ['please', 'can you', 'request', 'want', 'need', 'hope'],
            'spam': ['subscribe', 'like', 'follow', 'check out', 'click', 'link', 'promo']
        }
        
        # Common stop words to filter out
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
            'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        
        logger.info("ThemeExtractor initialized")
    
    async def extract_themes(self, text: str, max_themes: int = 5) -> List[str]:
        """Extract main themes from text."""
        try:
            text_lower = text.lower()
            detected_themes = []
            
            # Check for predefined themes
            for theme, keywords in self.theme_keywords.items():
                score = 0
                for keyword in keywords:
                    # Count keyword occurrences
                    if keyword in text_lower:
                        score += text_lower.count(keyword)
                
                if score > 0:
                    detected_themes.append((theme, score))
            
            # Sort by score and return top themes
            detected_themes.sort(key=lambda x: x[1], reverse=True)
            themes = [theme for theme, score in detected_themes[:max_themes]]
            
            # If no themes detected, try to extract based on content analysis
            if not themes:
                themes = await self._extract_content_themes(text_lower)
            
            return themes
            
        except Exception as e:
            logger.error(f"Theme extraction error: {str(e)}")
            return []
    
    async def _extract_content_themes(self, text: str) -> List[str]:
        """Extract themes based on content analysis."""
        themes = []
        
        # Question detection
        if '?' in text or any(word in text for word in ['why', 'how', 'what', 'when', 'where']):
            themes.append('questions')
        
        # Emotional content
        emotional_words = ['feel', 'love', 'hate', 'sad', 'happy', 'angry', 'excited']
        if any(word in text for word in emotional_words):
            themes.append('emotional')
        
        # Personal content
        personal_indicators = ['i ', 'me ', 'my ', 'myself']
        if any(indicator in text for indicator in personal_indicators):
            themes.append('personal_story')
        
        # Appreciation/criticism
        positive_words = ['great', 'awesome', 'love', 'amazing', 'excellent']
        negative_words = ['bad', 'terrible', 'awful', 'hate', 'worst']
        
        if any(word in text for word in positive_words):
            themes.append('appreciation')
        elif any(word in text for word in negative_words):
            themes.append('criticism')
        
        return themes[:3]  # Return top 3 content-based themes
    
    async def extract_keywords(self, text: str, max_keywords: int = 10) -> List[Dict[str, Any]]:
        """Extract important keywords from text."""
        try:
            # Clean and tokenize text
            text_lower = text.lower()
            # Remove punctuation except apostrophes
            cleaned_text = re.sub(r"[^\w\s']", ' ', text_lower)
            words = cleaned_text.split()
            
            # Filter out stop words and short words
            filtered_words = [
                word for word in words 
                if len(word) > 2 and word not in self.stop_words
            ]
            
            # Count word frequencies
            word_counts = Counter(filtered_words)
            
            # Get top keywords
            top_keywords = word_counts.most_common(max_keywords)
            
            keywords = [
                {
                    'word': word,
                    'count': count,
                    'relevance': count / len(filtered_words) if filtered_words else 0
                }
                for word, count in top_keywords
            ]
            
            return keywords
            
        except Exception as e:
            logger.error(f"Keyword extraction error: {str(e)}")
            return []
    
    async def analyze_topic_sentiment(self, text: str, themes: List[str]) -> Dict[str, str]:
        """Analyze sentiment for each detected theme."""
        try:
            theme_sentiments = {}
            
            for theme in themes:
                if theme in self.theme_keywords:
                    # Simple sentiment based on theme keywords
                    if theme in ['appreciation', 'entertainment']:
                        theme_sentiments[theme] = 'positive'
                    elif theme in ['criticism', 'emotional']:
                        # Need more analysis for emotional themes
                        negative_indicators = ['bad', 'terrible', 'sad', 'angry', 'hate']
                        if any(word in text.lower() for word in negative_indicators):
                            theme_sentiments[theme] = 'negative'
                        else:
                            theme_sentiments[theme] = 'neutral'
                    else:
                        theme_sentiments[theme] = 'neutral'
            
            return theme_sentiments
            
        except Exception as e:
            logger.error(f"Theme sentiment analysis error: {str(e)}")
            return {}
    
    async def batch_extract_themes(self, texts: List[str]) -> List[List[str]]:
        """Extract themes from multiple texts in batch."""
        tasks = [self.extract_themes(text) for text in texts]
        return await asyncio.gather(*tasks) 