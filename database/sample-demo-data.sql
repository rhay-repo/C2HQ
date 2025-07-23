-- Sample demo data for testing personalized demos
-- This would typically be populated by scraping real YouTube data

INSERT INTO demo_comment_sets (email, channel_id, channel_name, demo_data) VALUES 
('demo@example.com', 'UC123456789', 'Tech Creator Demo', '{
  "channelName": "Tech Creator Demo",
  "totalComments": 1247,
  "sentimentBreakdown": {
    "positive": 856,
    "negative": 123,
    "neutral": 268
  },
  "toxicityStats": {
    "averageToxicity": 0.12,
    "highToxicityCount": 45
  },
  "topThemes": [
    "Great tutorial", 
    "Easy to follow", 
    "More content please", 
    "Technical questions", 
    "Setup issues",
    "Thanks for sharing"
  ],
  "recentComments": [
    {
      "id": "comment1",
      "content": "This tutorial was amazing! Finally understand React hooks properly. Thank you so much for the clear explanation.",
      "sentiment": "positive",
      "toxicityScore": 0.02,
      "videoTitle": "React Hooks Explained in 10 Minutes"
    },
    {
      "id": "comment2", 
      "content": "The audio quality is terrible and I can barely hear you. Please fix your microphone setup.",
      "sentiment": "negative",
      "toxicityScore": 0.15,
      "videoTitle": "Advanced JavaScript Concepts"
    },
    {
      "id": "comment3",
      "content": "Could you make a video about TypeScript generics? I am struggling with that concept.",
      "sentiment": "neutral", 
      "toxicityScore": 0.03,
      "videoTitle": "TypeScript for Beginners"
    },
    {
      "id": "comment4",
      "content": "Your content has helped me land my first developer job! Keep up the excellent work.",
      "sentiment": "positive",
      "toxicityScore": 0.01,
      "videoTitle": "How to Ace Coding Interviews"
    },
    {
      "id": "comment5",
      "content": "This is completely wrong. You have no idea what you are talking about. Waste of time.",
      "sentiment": "negative",
      "toxicityScore": 0.78,
      "videoTitle": "CSS Grid vs Flexbox"
    }
  ]
}');

-- Add more demo users for testing
INSERT INTO demo_comment_sets (email, channel_id, channel_name, demo_data) VALUES 
('creator@youtube.com', 'UC987654321', 'Lifestyle Vlogger', '{
  "channelName": "Lifestyle Vlogger",
  "totalComments": 2156,
  "sentimentBreakdown": {
    "positive": 1512,
    "negative": 201,
    "neutral": 443
  },
  "toxicityStats": {
    "averageToxicity": 0.08,
    "highToxicityCount": 67
  },
  "topThemes": [
    "Love your style",
    "Outfit inspiration", 
    "Morning routine",
    "Product recommendations",
    "Travel vlogs",
    "Self care tips"
  ],
  "recentComments": [
    {
      "id": "lifestyle1",
      "content": "Your morning routine is so inspiring! I have started doing yoga too and feel amazing.",
      "sentiment": "positive",
      "toxicityScore": 0.01,
      "videoTitle": "My 5AM Morning Routine"
    },
    {
      "id": "lifestyle2",
      "content": "Where did you get that amazing jacket? I need it in my life!",
      "sentiment": "positive", 
      "toxicityScore": 0.02,
      "videoTitle": "Fall Fashion Haul 2024"
    },
    {
      "id": "lifestyle3",
      "content": "Can you please do a budget-friendly version of this routine? Not everyone can afford expensive products.",
      "sentiment": "neutral",
      "toxicityScore": 0.05,
      "videoTitle": "My Skincare Routine"
    }
  ]
}'); 