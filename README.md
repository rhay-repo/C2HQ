# C2HQ - Creator Comment Management Platform

A SaaS platform that helps influencers manage and understand their comment sections across social media platforms.

## 🚀 Features

- **Multi-Platform Integration**: Connect YouTube, Instagram, and more via OAuth
- **AI-Powered Analysis**: Sentiment analysis, toxicity detection, and theme identification
- **Creator Dashboard**: View, filter, and analyze comments with insights
- **Weekly Digests**: Automated summaries of important comments and fan topics
- **Real-time Monitoring**: Track comment activity across all connected platforms

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Supabase Auth** for authentication

### Backend
- **Node.js/Express** API server
- **Supabase** PostgreSQL database
- **Python** ML processing service
- **Google Perspective API** for toxicity detection
- **OpenAI/LLM** for sentiment and theme analysis

### Infrastructure
- **Supabase** for database, auth, and edge functions
- **Vercel** for frontend deployment
- **Railway/Render** for backend services

## 📁 Project Structure

```
/
├── frontend/          # Next.js React app
├── api/              # Node.js API server
├── ml-service/       # Python ML processing
├── database/         # Supabase migrations and schemas
└── docs/            # Documentation
```

## 🚦 Getting Started

1. Clone the repository
2. Set up Supabase project
3. Configure environment variables
4. Install dependencies for each service
5. Run development servers

See individual service READMEs for detailed setup instructions.

## 🔐 Environment Variables

Create `.env.local` files in each service directory with the required variables (see `.env.example` files).

## 📝 License

MIT License - see LICENSE file for details. 