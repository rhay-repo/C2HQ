import asyncio
import re
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class ToxicityDetector:
    """Toxicity detection service using pattern matching and word lists."""
    
    def __init__(self):
        # Basic toxic word patterns (in production, use more sophisticated models)
        self.toxic_patterns = [
            r'\b(hate|stupid|idiot|dumb|moron)\b',
            r'\b(kill\s+yourself|kys)\b',
            r'\b(f[*u]ck|sh[*i]t|damn)\b',
            r'\b(racist|sexist|homophobic)\b',
            r'\b(die|death|suicide)\b'
        ]
        
        self.severity_weights = {
            'mild': 0.3,
            'moderate': 0.6,
            'severe': 0.9
        }
        
        # Categorize patterns by severity
        self.pattern_severity = {
            0: 'moderate',  # hate, stupid, etc.
            1: 'severe',    # kill yourself
            2: 'mild',      # profanity
            3: 'severe',    # discriminatory
            4: 'severe'     # death-related
        }
        
        logger.info("ToxicityDetector initialized")
    
    async def analyze(self, text: str) -> float:
        """Analyze toxicity level of text (0.0 to 1.0)."""
        try:
            text_lower = text.lower()
            toxicity_score = 0.0
            matches = []
            
            # Check each pattern
            for i, pattern in enumerate(self.toxic_patterns):
                if re.search(pattern, text_lower, re.IGNORECASE):
                    severity = self.pattern_severity[i]
                    weight = self.severity_weights[severity]
                    toxicity_score = max(toxicity_score, weight)
                    matches.append({
                        'pattern': pattern,
                        'severity': severity,
                        'weight': weight
                    })
            
            # Additional heuristics
            # All caps (shouting)
            if len(text) > 10 and text.isupper():
                toxicity_score += 0.1
            
            # Multiple exclamation marks
            if text.count('!') > 3:
                toxicity_score += 0.05
            
            # Excessive repetition of characters
            if re.search(r'(.)\1{4,}', text):
                toxicity_score += 0.05
            
            # Cap at 1.0
            toxicity_score = min(toxicity_score, 1.0)
            
            return toxicity_score
            
        except Exception as e:
            logger.error(f"Toxicity analysis error: {str(e)}")
            return 0.0
    
    async def get_toxic_elements(self, text: str) -> List[Dict[str, Any]]:
        """Get specific toxic elements found in text."""
        try:
            text_lower = text.lower()
            elements = []
            
            for i, pattern in enumerate(self.toxic_patterns):
                matches = re.finditer(pattern, text_lower, re.IGNORECASE)
                for match in matches:
                    elements.append({
                        'text': match.group(),
                        'start': match.start(),
                        'end': match.end(),
                        'severity': self.pattern_severity[i],
                        'category': self._get_category(i)
                    })
            
            return elements
            
        except Exception as e:
            logger.error(f"Toxic elements analysis error: {str(e)}")
            return []
    
    def _get_category(self, pattern_index: int) -> str:
        """Get category name for pattern index."""
        categories = {
            0: 'offensive_language',
            1: 'self_harm',
            2: 'profanity',
            3: 'discrimination',
            4: 'violence'
        }
        return categories.get(pattern_index, 'other')
    
    async def batch_analyze(self, texts: List[str]) -> List[float]:
        """Analyze multiple texts in batch."""
        tasks = [self.analyze(text) for text in texts]
        return await asyncio.gather(*tasks) 