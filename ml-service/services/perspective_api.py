import asyncio
import httpx
import os
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class PerspectiveAPIClient:
    """Client for Google Perspective API toxicity detection."""
    
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_PERSPECTIVE_API_KEY')
        self.base_url = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze'
        self.timeout = 30.0
        
        if not self.api_key:
            logger.warning("Google Perspective API key not found. Toxicity detection will use fallback method.")
        else:
            logger.info("PerspectiveAPIClient initialized")
    
    async def analyze_toxicity(self, text: str) -> float:
        """Analyze toxicity using Google Perspective API."""
        if not self.api_key:
            logger.warning("No API key available, returning default toxicity score")
            return 0.0
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    'requestedAttributes': {
                        'TOXICITY': {},
                        'SEVERE_TOXICITY': {},
                        'IDENTITY_ATTACK': {},
                        'INSULT': {},
                        'PROFANITY': {},
                        'THREAT': {}
                    },
                    'comment': {
                        'text': text
                    },
                    'languages': ['en']
                }
                
                response = await client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    scores = data.get('attributeScores', {})
                    
                    # Extract toxicity scores
                    toxicity = scores.get('TOXICITY', {}).get('summaryScore', {}).get('value', 0)
                    severe_toxicity = scores.get('SEVERE_TOXICITY', {}).get('summaryScore', {}).get('value', 0)
                    identity_attack = scores.get('IDENTITY_ATTACK', {}).get('summaryScore', {}).get('value', 0)
                    insult = scores.get('INSULT', {}).get('summaryScore', {}).get('value', 0)
                    profanity = scores.get('PROFANITY', {}).get('summaryScore', {}).get('value', 0)
                    threat = scores.get('THREAT', {}).get('summaryScore', {}).get('value', 0)
                    
                    # Weighted combination of scores
                    combined_score = (
                        toxicity * 0.4 +
                        severe_toxicity * 0.3 +
                        identity_attack * 0.1 +
                        insult * 0.1 +
                        profanity * 0.05 +
                        threat * 0.05
                    )
                    
                    return min(combined_score, 1.0)
                
                else:
                    logger.error(f"Perspective API error: {response.status_code} - {response.text}")
                    return 0.0
                    
        except asyncio.TimeoutError:
            logger.error("Perspective API timeout")
            return 0.0
        except Exception as e:
            logger.error(f"Perspective API error: {str(e)}")
            return 0.0
    
    async def analyze_detailed(self, text: str) -> Dict[str, Any]:
        """Get detailed analysis from Perspective API."""
        if not self.api_key:
            return {
                'toxicity': 0.0,
                'severe_toxicity': 0.0,
                'identity_attack': 0.0,
                'insult': 0.0,
                'profanity': 0.0,
                'threat': 0.0,
                'error': 'No API key available'
            }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    'requestedAttributes': {
                        'TOXICITY': {},
                        'SEVERE_TOXICITY': {},
                        'IDENTITY_ATTACK': {},
                        'INSULT': {},
                        'PROFANITY': {},
                        'THREAT': {}
                    },
                    'comment': {
                        'text': text
                    },
                    'languages': ['en']
                }
                
                response = await client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    scores = data.get('attributeScores', {})
                    
                    return {
                        'toxicity': scores.get('TOXICITY', {}).get('summaryScore', {}).get('value', 0),
                        'severe_toxicity': scores.get('SEVERE_TOXICITY', {}).get('summaryScore', {}).get('value', 0),
                        'identity_attack': scores.get('IDENTITY_ATTACK', {}).get('summaryScore', {}).get('value', 0),
                        'insult': scores.get('INSULT', {}).get('summaryScore', {}).get('value', 0),
                        'profanity': scores.get('PROFANITY', {}).get('summaryScore', {}).get('value', 0),
                        'threat': scores.get('THREAT', {}).get('summaryScore', {}).get('value', 0)
                    }
                else:
                    logger.error(f"Perspective API error: {response.status_code}")
                    return {'error': f'API error: {response.status_code}'}
                    
        except Exception as e:
            logger.error(f"Perspective API detailed analysis error: {str(e)}")
            return {'error': str(e)} 