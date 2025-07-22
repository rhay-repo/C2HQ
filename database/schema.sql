-- C2HQ Database Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET row_security = on;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User connected platforms
CREATE TABLE public.user_platforms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter')),
    platform_user_id TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, platform)
);

-- Videos/Posts from connected platforms
CREATE TABLE public.videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    platform_video_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter')),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    duration INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform_video_id, platform)
);

-- Comments from videos
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    platform_comment_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    author_id TEXT,
    content TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    
    -- ML Analysis Results
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
    toxicity_score DECIMAL(3,2), -- 0.0 to 1.0
    themes TEXT[], -- array of theme strings
    emotions JSONB, -- emotion scores as JSON
    keywords JSONB, -- extracted keywords as JSON
    
    -- Analysis metadata
    analysis_completed_at TIMESTAMP WITH TIME ZONE,
    analysis_version TEXT DEFAULT '1.0',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform_comment_id, video_id)
);

-- Analysis jobs tracking
CREATE TABLE public.analysis_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('comment_analysis', 'batch_analysis', 'reanalysis')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE public.user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email_notifications BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT true,
    toxicity_threshold DECIMAL(3,2) DEFAULT 0.7,
    auto_analysis BOOLEAN DEFAULT true,
    dashboard_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly digest tracking
CREATE TABLE public.weekly_digests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    total_comments INTEGER DEFAULT 0,
    positive_comments INTEGER DEFAULT 0,
    negative_comments INTEGER DEFAULT 0,
    neutral_comments INTEGER DEFAULT 0,
    avg_toxicity DECIMAL(3,2) DEFAULT 0,
    top_themes TEXT[],
    top_videos JSONB,
    digest_data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Indexes for performance
CREATE INDEX idx_comments_video_id ON public.comments(video_id);
CREATE INDEX idx_comments_sentiment ON public.comments(sentiment);
CREATE INDEX idx_comments_toxicity ON public.comments(toxicity_score);
CREATE INDEX idx_comments_published_at ON public.comments(published_at);
CREATE INDEX idx_comments_analysis_completed ON public.comments(analysis_completed_at);
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_platform ON public.videos(platform);
CREATE INDEX idx_videos_published_at ON public.videos(published_at);
CREATE INDEX idx_user_platforms_user_id ON public.user_platforms(user_id);
CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_user_id ON public.analysis_jobs(user_id);

-- Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- User platforms policies
CREATE POLICY "Users can manage own platforms" ON public.user_platforms
    FOR ALL USING (auth.uid() = user_id);

-- Videos policies
CREATE POLICY "Users can manage own videos" ON public.videos
    FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view own video comments" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.videos 
            WHERE videos.id = comments.video_id 
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own video comments" ON public.comments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.videos 
            WHERE videos.id = comments.video_id 
            AND videos.user_id = auth.uid()
        )
    );

-- Analysis jobs policies
CREATE POLICY "Users can view own analysis jobs" ON public.analysis_jobs
    FOR SELECT USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Weekly digests policies
CREATE POLICY "Users can view own digests" ON public.weekly_digests
    FOR ALL USING (auth.uid() = user_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 