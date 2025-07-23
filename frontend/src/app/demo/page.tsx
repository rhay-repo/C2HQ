'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, TrendingUp, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface DemoData {
  channelName: string;
  totalComments: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  toxicityStats: {
    averageToxicity: number;
    highToxicityCount: number;
  };
  topThemes: string[];
  recentComments: Array<{
    id: string;
    content: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    toxicityScore: number;
    videoTitle: string;
  }>;
}

export default function DemoPage() {
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?redirectTo=/demo');
        return;
      }
      
      // Fetch demo data
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/demo/${user.email}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to load demo data');
        }
        
        const data = await response.json();
        setDemoData(data);
      } catch (err) {
        console.error('Error loading demo data:', err);
        setError('Failed to load your demo data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your personalized demo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!demoData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Demo Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">We haven&apos;t prepared demo data for your channel yet.</p>
            <Button onClick={() => router.push('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'negative': return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Your C2HQ Demo, {demoData.channelName}! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Here&apos;s a preview of what C2HQ can do with your comment data
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{demoData.totalComments.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
              <ThumbsUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((demoData.sentimentBreakdown.positive / demoData.totalComments) * 100)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Toxicity</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(demoData.toxicityStats.averageToxicity * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Themes</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{demoData.topThemes.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>How your audience feels about your content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  <span>Positive</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(demoData.sentimentBreakdown.positive / demoData.totalComments) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {demoData.sentimentBreakdown.positive}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-gray-600" />
                  <span>Neutral</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full" 
                      style={{ width: `${(demoData.sentimentBreakdown.neutral / demoData.totalComments) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {demoData.sentimentBreakdown.neutral}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  <span>Negative</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${(demoData.sentimentBreakdown.negative / demoData.totalComments) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {demoData.sentimentBreakdown.negative}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Themes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Comment Themes</CardTitle>
            <CardDescription>What your audience is talking about most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {demoData.topThemes.map((theme, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {theme}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Comments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Comments Analysis</CardTitle>
            <CardDescription>Sample of your analyzed comments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoData.recentComments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">From: {comment.videoTitle}</p>
                      <p className="text-gray-900">{comment.content}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {getSentimentIcon(comment.sentiment)}
                      <Badge className={getSentimentColor(comment.sentiment)}>
                        {comment.sentiment}
                      </Badge>
                      <Badge variant="outline">
                        {(comment.toxicityScore * 100).toFixed(0)}% toxic
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Get Started?</CardTitle>
            <CardDescription>
              This is just a preview! Connect your YouTube channel to get real-time insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button size="lg" onClick={() => router.push('/signup')}>
                Get Started Now
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push('/')}>
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 