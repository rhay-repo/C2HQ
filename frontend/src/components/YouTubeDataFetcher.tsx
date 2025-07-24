'use client';

import { useState, useEffect } from 'react';
import { googleTokenManager, makeAuthenticatedGoogleRequest, handleGoogleApiError } from '@/lib/google-token-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Youtube, AlertCircle } from 'lucide-react';

interface YouTubeChannel {
  id: string;
  name: string;
  description: string;
  profileImage: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

interface YouTubeData {
  channel: YouTubeChannel;
  videos: YouTubeVideo[];
}

export default function YouTubeDataFetcher() {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchYouTubeData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Example: Fetch YouTube channel data using the token manager
      const channelData = await makeAuthenticatedGoogleRequest<YouTubeData>(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true'
      );

      setData(channelData);
    } catch (err) {
      console.error('Error fetching YouTube data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch YouTube data');
      
      // Handle Google API errors (like token expiration)
      handleGoogleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    googleTokenManager.clearCache();
    setData(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5" />
            YouTube Data Fetcher
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={fetchYouTubeData} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Youtube className="h-4 w-4" />
              )}
              Fetch YouTube Data
            </Button>
            
            <Button 
              onClick={clearCache} 
              variant="outline"
              disabled={loading}
            >
              Clear Token Cache
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{data.channel.name}</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Subscribers:</span>
                    <br />
                    {data.channel.subscriberCount.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Videos:</span>
                    <br />
                    {data.channel.videoCount.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Total Views:</span>
                    <br />
                    {data.channel.totalViews.toLocaleString()}
                  </div>
                </div>
              </div>

              {data.videos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Recent Videos</h4>
                  <div className="space-y-2">
                    {data.videos.slice(0, 3).map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-2 border rounded">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-16 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm truncate">{video.title}</h5>
                          <p className="text-xs text-gray-500">
                            {video.views.toLocaleString()} views • {video.likes.toLocaleString()} likes
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 