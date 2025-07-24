import re
from typing import List, Dict, Any
import logging
import asyncio

logger = logging.getLogger(__name__)

class CommentTagger:
    """Keyword-based comment tagging service."""
    
    def __init__(self):
        # Define keyword patterns for each category
        self.tag_patterns = {
            "Product Praise": [
                r"\b(love|great|amazing|awesome|fantastic|excellent|brilliant|perfect|wonderful|outstanding|superb|incredible|helpful|useful|beneficial|valuable|thanks|thank you|appreciate|grateful)\b",
                r"\b(best|favorite|top|outstanding|phenomenal|spectacular|marvelous|splendid|magnificent)\b"
            ],
            "Feature Request": [
                r"\b(i wish|can you add|would be better if|please include|please add|could you add|it would be great if|would love to see|hope you add|suggest adding)\b",
                r"\b(feature request|new feature|missing feature|add support for|implement|add option for)\b"
            ],
            "Hate Speech": [
                r"\b(kill yourself|die|hate you|you suck|you're stupid|you're dumb|you're an idiot|you're worthless|you're trash|you're garbage|you're useless|you're pathetic|you're a joke|you're a loser)\b",
                r"\b(fuck you|fuck off|go to hell|burn in hell|rot in hell|piece of shit|worthless piece of shit|stupid ass|dumb ass|idiot|moron|retard)\b"
            ],
            "Feedback": [
                r"\b(feedback|suggestion|improvement|constructive|criticism|advice|tip|recommendation|input|comment|thought|idea)\b",
                r"\b(could be better|needs improvement|suggest|recommend|consider|think about|maybe try|perhaps|might want to)\b"
            ],
            "Confusion/Question": [
                r"\?$",  # Ends with question mark
                r"\b(what|how|why|when|where|who|which|can you explain|i don't understand|confused|unclear|not sure|what's going on|how do i|what does this mean)\b",
                r"\b(help|clarify|explain|elaborate|what do you mean|i'm confused|not clear|unclear|puzzled)\b"
            ],
            "Spam": [
                r"\b(check out my|visit my|follow me|subscribe to my|my channel|my video|my content|my website|my blog|my instagram|my tiktok|my twitter)\b",
                r"\b(promote|advertisement|sponsored|paid|commission|affiliate|link in bio|click here|buy now|limited time|offer|deal|discount)\b",
                r"\b(bot|automated|script|program|algorithm|auto-generated|spam|repetitive|copied|duplicate)\b"
            ],
            "Callout": [
                r"\b(error|mistake|wrong|incorrect|false|misleading|inaccurate|false information|wrong info|not true|that's wrong|you're wrong|incorrect|mistake|error|bug|glitch|problem|issue)\b",
                r"\b(misquote|misquoted|taken out of context|misinterpreted|misunderstood|misrepresented)\b"
            ],
            "Timestamp Reference": [
                r"\b(\d{1,2}:\d{2}|timestamp|at \d{1,2}:\d{2}|minute \d+|second \d+|\d+:\d+ had me|at \d+:\d+)\b",
                r"\b(time \d+:\d+|mark \d+:\d+|around \d+:\d+|near \d+:\d+|about \d+:\d+)\b"
            ],
            "Requests/Ideas": [
                r"\b(do a part 2|make another|next video|cover this|you have to check out|you should try|you need to see|you must visit|you have to go to|recommend|suggest|idea for|next time|in the future)\b",
                r"\b(restaurant|cafe|place|location|spot|venue|establishment|joint|eatery|dining|food|meal|dish|cuisine)\b"
            ],
            "Praise for Creator": [
                r"\b(you're amazing|you're awesome|you're great|you're the best|love your channel|love you|you're incredible|you're wonderful|you're fantastic|you're brilliant|you're perfect|you're outstanding)\b",
                r"\b(creator|youtuber|influencer|content creator|host|presenter|speaker|teacher|instructor|guide|mentor|role model)\b"
            ],
            "Praise for Video": [
                r"\b(this edit|this video|this content|this episode|this tutorial|this guide|this explanation|this demonstration|this presentation|this lesson|this class|this session)\b",
                r"\b(editing|production|quality|cinematography|filming|recording|audio|visual|graphics|effects|transitions|music|sound)\b"
            ],
            "Community Interaction": [
                r"\b(@\w+|tag|mention|reply to|respond to|answer|respond|reply|comment on|discuss|debate|conversation|dialogue|exchange)\b",
                r"\b(other video|another video|previous video|last video|next video|related video|similar video|check out|watch|see also|also see)\b"
            ],
            "Inside Joke/Meme": [
                r"\b(meme|joke|funny|hilarious|lol|lmao|rofl|haha|😂|😅|😆|😄|😁|😊|😋|😎|🤣|😭|😱|😤|😤|😤)\b",
                r"\b(reference|callback|throwback|nostalgia|remember when|good times|classic|legendary|iconic|famous|viral|trending)\b"
            ],
            "Sensitive Topics": [
                r"\b(politics|political|government|election|vote|democrat|republican|liberal|conservative|left|right|progressive|traditional)\b",
                r"\b(religion|religious|god|jesus|christ|bible|church|mosque|temple|prayer|faith|belief|spiritual|divine|holy|sacred)\b",
                r"\b(abortion|contraception|birth control|pregnancy|reproductive|pro-choice|pro-life|women's rights|gender|sexuality|lgbtq|transgender|non-binary)\b"
            ],
            "Potential Conflict": [
                r"\b(argument|debate|dispute|conflict|controversy|disagreement|opposition|rivalry|competition|fight|battle|war|attack|defend|defense|offensive|aggressive|hostile|angry|mad|furious|enraged)\b",
                r"\b(triggered|offended|upset|annoyed|irritated|frustrated|disappointed|disgusted|appalled|shocked|outraged|infuriated)\b"
            ],
            "Toxicity": [
                r"\b(toxic|poisonous|harmful|damaging|destructive|negative|hostile|aggressive|abusive|insulting|offensive|disrespectful|rude|mean|cruel|harsh|brutal|vicious|malicious|spiteful|hateful)\b",
                r"\b(trigger|triggered|snowflake|sensitive|easily offended|overreacting|dramatic|exaggerating|making a big deal|blowing things out of proportion)\b"
            ]
        }
        
        logger.info("CommentTagger initialized")
    
    async def tag_comment(self, text: str) -> Dict[str, Any]:
        """Tag a comment with relevant categories based on keyword matching."""
        try:
            text_lower = text.lower()
            detected_tags = []
            
            # Check each category for matches
            for category, patterns in self.tag_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, text_lower, re.IGNORECASE):
                        detected_tags.append(category)
                        break  # Only add each category once
            
            # Special logic for certain combinations
            if "Hate Speech" in detected_tags:
                detected_tags.append("Toxicity")
            
            if "Sensitive Topics" in detected_tags:
                detected_tags.append("Potential Conflict")
            
            # Remove duplicates while preserving order
            unique_tags = []
            for tag in detected_tags:
                if tag not in unique_tags:
                    unique_tags.append(tag)
            
            return {
                "tags": unique_tags,
                "tag_count": len(unique_tags),
                "primary_tag": unique_tags[0] if unique_tags else None
            }
            
        except Exception as e:
            logger.error(f"Comment tagging error: {str(e)}")
            return {
                "tags": [],
                "tag_count": 0,
                "primary_tag": None,
                "error": str(e)
            }
    
    async def batch_tag(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Tag multiple comments in batch."""
        tasks = [self.tag_comment(text) for text in texts]
        return await asyncio.gather(*tasks)
    
    def get_tag_color(self, tag: str) -> str:
        """Get CSS color class for a tag."""
        color_map = {
            "Product Praise": "bg-green-100 text-green-800",
            "Feature Request": "bg-blue-100 text-blue-800",
            "Hate Speech": "bg-red-100 text-red-800",
            "Feedback": "bg-yellow-100 text-yellow-800",
            "Confusion/Question": "bg-purple-100 text-purple-800",
            "Spam": "bg-gray-100 text-gray-800",
            "Callout": "bg-orange-100 text-orange-800",
            "Timestamp Reference": "bg-indigo-100 text-indigo-800",
            "Requests/Ideas": "bg-pink-100 text-pink-800",
            "Praise for Creator": "bg-emerald-100 text-emerald-800",
            "Praise for Video": "bg-teal-100 text-teal-800",
            "Community Interaction": "bg-cyan-100 text-cyan-800",
            "Inside Joke/Meme": "bg-violet-100 text-violet-800",
            "Sensitive Topics": "bg-amber-100 text-amber-800",
            "Potential Conflict": "bg-rose-100 text-rose-800",
            "Toxicity": "bg-red-100 text-red-800"
        }
        return color_map.get(tag, "bg-gray-100 text-gray-800") 