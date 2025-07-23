const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001';

// Demo data templates for different creator types
const DEMO_TEMPLATES = {
  tech: {
    channelName: "Tech Tutorials",
    totalComments: 2156,
    sentimentBreakdown: {
      positive: 1512,  // 70%
      negative: 215,   // 10%
      neutral: 429     // 20%
    },
    toxicityStats: {
      averageToxicity: 0.09,
      highToxicityCount: 32
    },
    topThemes: [
      "Great tutorial",
      "Code examples",
      "More advanced topics",
      "Bug fixes",
      "Thank you",
      "Easy to follow"
    ],
    recentComments: [
      {
        id: "tech1",
        content: "Finally understand async/await! Your examples make it so clear.",
        sentiment: "positive",
        toxicityScore: 0.02,
        videoTitle: "JavaScript Async Programming"
      },
      {
        id: "tech2",
        content: "Could you make a video about TypeScript generics? I'm struggling with that concept.",
        sentiment: "neutral",
        toxicityScore: 0.05,
        videoTitle: "TypeScript Fundamentals"
      },
      {
        id: "tech3",
        content: "Your React hooks explanation helped me land my first developer job! Thank you so much.",
        sentiment: "positive",
        toxicityScore: 0.01,
        videoTitle: "React Hooks Complete Guide"
      },
      {
        id: "tech4",
        content: "The audio quality is pretty bad in this video. Hard to follow along.",
        sentiment: "negative",
        toxicityScore: 0.25,
        videoTitle: "Advanced CSS Techniques"
      }
    ]
  },

  lifestyle: {
    channelName: "Beauty & Wellness",
    totalComments: 4321,
    sentimentBreakdown: {
      positive: 3457,  // 80%
      negative: 216,   // 5%
      neutral: 648     // 15%
    },
    toxicityStats: {
      averageToxicity: 0.05,
      highToxicityCount: 18
    },
    topThemes: [
      "Love this look",
      "Product links please",
      "Skin care routine",
      "Hair tutorial",
      "Get ready with me",
      "Makeup inspiration"
    ],
    recentComments: [
      {
        id: "beauty1",
        content: "That lipstick shade is PERFECT on you! What brand is it?",
        sentiment: "positive",
        toxicityScore: 0.01,
        videoTitle: "Fall Makeup Look 2024"
      },
      {
        id: "beauty2",
        content: "Your morning routine has completely transformed my skin. Glowing like never before! ✨",
        sentiment: "positive",
        toxicityScore: 0.01,
        videoTitle: "My 5-Step Morning Skincare"
      },
      {
        id: "beauty3",
        content: "Can you do a budget-friendly version of this routine? Not everyone can afford $200 serums.",
        sentiment: "neutral",
        toxicityScore: 0.08,
        videoTitle: "Luxury Skincare Haul"
      }
    ]
  },

  fitness: {
    channelName: "FitLife Training",
    totalComments: 3421,
    sentimentBreakdown: {
      positive: 2563,  // 75%
      negative: 342,   // 10%
      neutral: 516     // 15%
    },
    toxicityStats: {
      averageToxicity: 0.06,
      highToxicityCount: 15
    },
    topThemes: [
      "Great workout",
      "Transformation results",
      "Form check please",
      "Motivation needed",
      "Equipment recommendations",
      "Beginner friendly"
    ],
    recentComments: [
      {
        id: "fit1",
        content: "Down 20 pounds following your workouts! You're changing lives 💪",
        sentiment: "positive",
        toxicityScore: 0.01,
        videoTitle: "30-Day Transformation Challenge"
      },
      {
        id: "fit2",
        content: "Is my form correct for deadlifts? Been having some lower back pain.",
        sentiment: "neutral",
        toxicityScore: 0.03,
        videoTitle: "Deadlift Technique Breakdown"
      },
      {
        id: "fit3",
        content: "These home workouts are perfect for busy moms like me. Thank you!",
        sentiment: "positive",
        toxicityScore: 0.01,
        videoTitle: "15-Minute Home HIIT Workout"
      }
    ]
  },

  gaming: {
    channelName: "GameMaster Pro",
    totalComments: 8965,
    sentimentBreakdown: {
      positive: 6274,  // 70%
      negative: 897,   // 10%
      neutral: 1794    // 20%
    },
    toxicityStats: {
      averageToxicity: 0.15,
      highToxicityCount: 134
    },
    topThemes: [
      "Epic gameplay",
      "Pro tips",
      "Stream schedule",
      "Game reviews",
      "Viewer challenges",
      "Skill tutorials"
    ],
    recentComments: [
      {
        id: "game1",
        content: "That 360 no-scope was INSANE! Best play I've seen all week 🔥",
        sentiment: "positive",
        toxicityScore: 0.03,
        videoTitle: "Ranked Climb to Diamond"
      },
      {
        id: "game2",
        content: "Your sensitivity settings helped me improve my aim so much. Thanks for sharing!",
        sentiment: "positive",
        toxicityScore: 0.02,
        videoTitle: "Perfect Mouse Settings Guide"
      },
      {
        id: "game3",
        content: "When is the next stream? Miss your gameplay commentary.",
        sentiment: "neutral",
        toxicityScore: 0.05,
        videoTitle: "Stream Schedule Update"
      },
      {
        id: "game4",
        content: "You're trash at this game. Stop making tutorials when you can't even rank up.",
        sentiment: "negative",
        toxicityScore: 0.85,
        videoTitle: "How to Escape Bronze Rank"
      }
    ]
  },

  cooking: {
    channelName: "Chef's Kitchen",
    totalComments: 2847,
    sentimentBreakdown: {
      positive: 2277,  // 80%
      negative: 142,   // 5%
      neutral: 428     // 15%
    },
    toxicityStats: {
      averageToxicity: 0.04,
      highToxicityCount: 12
    },
    topThemes: [
      "Recipe request",
      "Looks delicious",
      "Ingredient substitutions",
      "Cooking tips",
      "Family loved it",
      "Meal prep ideas"
    ],
    recentComments: [
      {
        id: "cook1",
        content: "Made this for dinner tonight and my family devoured it! Adding to our regular rotation 🍝",
        sentiment: "positive",
        toxicityScore: 0.01,
        videoTitle: "One-Pot Pasta Perfection"
      },
      {
        id: "cook2",
        content: "Can I substitute almond flour for regular flour in this recipe?",
        sentiment: "neutral",
        toxicityScore: 0.02,
        videoTitle: "Homemade Bread Tutorial"
      },
      {
        id: "cook3",
        content: "Your knife skills are incredible! Any tips for a beginner?",
        sentiment: "positive",
        toxicityScore: 0.01,
        videoTitle: "Professional Knife Techniques"
      }
    ]
  }
};

async function createDemoData(email, creatorType, customChannelName = null) {
  try {
    if (!DEMO_TEMPLATES[creatorType]) {
      throw new Error(`Invalid creator type. Available types: ${Object.keys(DEMO_TEMPLATES).join(', ')}`);
    }

    const template = DEMO_TEMPLATES[creatorType];
    const demoData = {
      ...template,
      channelName: customChannelName || template.channelName
    };

    console.log(`🚀 Creating demo data for ${email} (${creatorType} creator)...`);

    const response = await axios.post(`${API_BASE_URL}/api/demo/`, {
      email,
      channel_id: `UC${Math.random().toString(36).substr(2, 9)}`,
      channel_name: demoData.channelName,
      demo_data: demoData
    });

    console.log('✅ Demo data created successfully!');
    console.log(`📊 Channel: ${demoData.channelName}`);
    console.log(`💬 Total Comments: ${demoData.totalComments.toLocaleString()}`);
    console.log(`😊 Positive: ${Math.round((demoData.sentimentBreakdown.positive / demoData.totalComments) * 100)}%`);
    console.log(`😐 Neutral: ${Math.round((demoData.sentimentBreakdown.neutral / demoData.totalComments) * 100)}%`);
    console.log(`😞 Negative: ${Math.round((demoData.sentimentBreakdown.negative / demoData.totalComments) * 100)}%`);
    console.log(`⚠️  Avg Toxicity: ${(demoData.toxicityStats.averageToxicity * 100).toFixed(1)}%`);
    console.log(`🎯 Top Themes: ${demoData.topThemes.slice(0, 3).join(', ')}`);
    console.log(`\n🔗 Test the demo: http://localhost:3000/demo (sign in with ${email})`);

    return response.data;
  } catch (error) {
    console.error('❌ Error creating demo data:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error || error.response.statusText}`);
    } else {
      console.error(`   ${error.message}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the API server is running on http://localhost:3001');
      console.error('   Run: npm run dev');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('🎯 C2HQ Demo Data Creator\n');
    console.log('Usage: node scripts/create-demo.js <email> <creator-type> [channel-name]');
    console.log('\nAvailable creator types:');
    Object.keys(DEMO_TEMPLATES).forEach(type => {
      console.log(`   ${type.padEnd(10)} - ${DEMO_TEMPLATES[type].channelName}`);
    });
    console.log('\nExamples:');
    console.log('   node scripts/create-demo.js john@techcreator.com tech');
    console.log('   node scripts/create-demo.js sarah@beauty.com lifestyle "Sarah\'s Beauty Corner"');
    console.log('   node scripts/create-demo.js mike@fitness.com fitness');
    process.exit(1);
  }

  const [email, creatorType, channelName] = args;
  await createDemoData(email, creatorType, channelName);
}

// Batch creation function for testing
async function createBatchDemos() {
  const testCreators = [
    ['demo@techcreator.com', 'tech', 'Code Tutorials Pro'],
    ['demo@beautyguru.com', 'lifestyle', 'Beauty & Glow'],
    ['demo@fitnesscoach.com', 'fitness', 'Fit Life Coaching'],
    ['demo@gamer.com', 'gaming', 'Elite Gaming'],
    ['demo@chef.com', 'cooking', 'Home Chef Mastery']
  ];

  console.log('🚀 Creating batch demo data for testing...\n');

  for (const [email, type, name] of testCreators) {
    await createDemoData(email, type, name);
    console.log(''); // spacing between creators
    
    // Small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('🎉 Batch demo creation complete!');
  console.log('\n📝 Test emails you can use:');
  testCreators.forEach(([email, type]) => {
    console.log(`   ${email} (${type})`);
  });
}

// Export functions for programmatic use
module.exports = {
  createDemoData,
  createBatchDemos,
  DEMO_TEMPLATES
};

// Run main function if called directly
if (require.main === module) {
  // Check for batch creation flag
  if (process.argv.includes('--batch')) {
    createBatchDemos();
  } else {
    main();
  }
} 