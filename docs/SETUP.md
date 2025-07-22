# C2HQ Setup Guide

This guide will help you set up the C2HQ platform locally for development.

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+ and pip
- **Supabase** account
- **Google Cloud Platform** account (for Perspective API)
- **YouTube API** and **Instagram API** credentials

## 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Go to Settings > API > Service Role to get your service role key
4. In the SQL Editor, run the schema from `database/schema.sql`

## 2. Google Cloud Setup

1. Create a new project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Perspective API
3. Create an API key for the Perspective API
4. Enable YouTube Data API v3
5. Create OAuth 2.0 credentials for YouTube

## 3. Instagram API Setup

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app
3. Add Instagram Basic Display product
4. Configure OAuth redirect URIs

## 4. Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### API (.env)
```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OAuth
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Google Perspective API
GOOGLE_PERSPECTIVE_API_KEY=your_perspective_api_key

# ML Service
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=your_ml_service_api_key

# JWT
JWT_SECRET=your_jwt_secret_key
```

### ML Service (.env)
```bash
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Perspective API
GOOGLE_PERSPECTIVE_API_KEY=your_perspective_api_key

# OpenAI (optional)
OPENAI_API_KEY=your_openai_api_key
```

## 5. Installation

### Install Dependencies

```bash
# Frontend
cd frontend
npm install

# API
cd ../api
npm install

# ML Service
cd ../ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 6. Development

Start all services in separate terminals:

### Frontend
```bash
cd frontend
npm run dev
```
Access at: http://localhost:3000

### API
```bash
cd api
npm run dev
```
Access at: http://localhost:3001

### ML Service
```bash
cd ml-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```
Access at: http://localhost:8000

## 7. Database Migrations

The database schema is in `database/schema.sql`. Run this in your Supabase SQL editor to create all tables and policies.

## 8. Testing the Setup

1. Visit http://localhost:3000
2. Sign up for an account
3. Connect a YouTube or Instagram account
4. Import some videos/posts
5. Check that comments are being analyzed

## 9. Production Deployment

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### API (Railway/Render)
1. Connect your GitHub repo
2. Set environment variables
3. Deploy with build command: `npm run build`
4. Start command: `npm start`

### ML Service (Railway/Render)
1. Connect your GitHub repo
2. Set environment variables
3. Deploy with build command: `pip install -r requirements.txt`
4. Start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

## 10. Monitoring

- Use Supabase dashboard for database monitoring
- Set up logging aggregation (e.g., LogRocket, Sentry)
- Monitor API performance and ML service health

## Troubleshooting

### Common Issues

1. **CORS errors**: Check that API_URL is correctly set in frontend
2. **Database connection**: Verify Supabase credentials
3. **OAuth not working**: Check redirect URIs match exactly
4. **ML service timeout**: Increase timeout values for large batch processing

### Support

For issues, check:
1. Console logs in browser dev tools
2. API server logs
3. ML service logs
4. Supabase logs in dashboard 