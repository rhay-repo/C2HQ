'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  User, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Users,
  Video,
  Eye,
  Calendar,
  Search,
  ChevronDown,
  ThumbsUp,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw
} from 'lucide-react';
import Image from 'next/image';

interface GoogleProfile {
  displayName: string;
  givenName: string;
  familyName: string;
  primaryEmail: string;
  profilePhoto: string;
  locale?: string;
}

interface YouTubeChannel {
  id: string;
  name: string;
  description: string;
  profileImage: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  createdAt: string;
  country?: string;
  customUrl?: string;
}

interface YouTubeComment {
  id: string;
  videoId: string;
  videoTitle: string;
  author: string;
  authorProfileImage: string;
  content: string;
  publishedAt: string;
  likeCount: number;
  platform: string;
  sentiment: string;
  sentimentScore: number;
  tags?: string[];
  primary_tag?: string;
  tag_count?: number;
}

export default function DemoDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  
  // Google Profile State
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // YouTube Channel State
  const [youtubeChannel, setYoutubeChannel] = useState<YouTubeChannel | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  
  // YouTube Comments State
  const [youtubeComments, setYoutubeComments] = useState<YouTubeComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Dropdown State
  const [selectedPlatform, setSelectedPlatform] = useState('All platforms');
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('Last 7 days');
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false);
  
  const router = useRouter();

  const platformOptions = ['All platforms', 'Instagram', 'YouTube', 'TikTok', 'X'];
  const timePeriodOptions = ['Last 7 days', 'Last 2 weeks', 'Last month'];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          router.push('/login?redirectTo=/demo-dashboard');
          return;
        }

        setCurrentUser(currentUser);
        setLoading(false);

                  // First, setup YouTube platform data
          try {
            await setupYouTubePlatform();
          } catch (setupError) {
            console.warn('YouTube platform setup failed:', setupError);
            // Continue anyway, the user might not have YouTube access
          }

          // Now try to fetch Google profile and YouTube data
          await fetchGoogleProfile();
          await fetchYouTubeChannel();
          await fetchYouTubeComments();
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login?redirectTo=/demo-dashboard');
      }
    };

    checkAuth();
  }, [router]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setPlatformDropdownOpen(false);
        setTimePeriodDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const setupYouTubePlatform = async () => {
    try {
      // Get session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found');
      }

      console.log('🔍 Session data for setup:', {
        hasProviderToken: !!session.provider_token,
        hasProviderRefreshToken: !!session.provider_refresh_token,
        provider: session.user?.app_metadata?.provider,
        providers: session.user?.app_metadata?.providers
      });

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      // Include provider token in the request body if available
      const requestBody: any = {};
      if (session.provider_token) {
        requestBody.provider_token = session.provider_token;
      }
      if (session.provider_refresh_token) {
        requestBody.provider_refresh_token = session.provider_refresh_token;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/setup-youtube-platform`, {
        method: 'POST',
        headers,
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ YouTube platform setup failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        });
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ YouTube platform setup result:', result);
      return result;
    } catch (err) {
      console.error('YouTube platform setup error:', err);
      throw err;
    }
  };

  const fetchGoogleProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);

    try {
      // Get session to access provider token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found');
      }

      const providerToken = session.provider_token;
      
      if (!providerToken) {
        throw new Error('Your Google access token has expired. Please sign in again.');
      }

      // Prepare headers with the access token
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Provider-Token': providerToken,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/google-profile/basic`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const profileData = await response.json();
      setGoogleProfile(profileData);
    } catch (err) {
      console.error('Google Profile API error:', err);
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchYouTubeChannel = async () => {
    setYoutubeLoading(true);
    setYoutubeError(null);

    try {
      // Get session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found');
      }

      // The backend now handles token refresh automatically
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/youtube/channel`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const youtubeData = await response.json();
      setYoutubeChannel(youtubeData.channel);
    } catch (err) {
      console.error('YouTube API error:', err);
      setYoutubeError(err instanceof Error ? err.message : 'Failed to load YouTube channel');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const fetchYouTubeComments = async () => {
    setCommentsLoading(true);
    setCommentsError(null);

    try {
      // Get session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found');
      }

      // Test authentication first
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/youtube/test-auth`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!testResponse.ok) {
        const testError = await testResponse.json().catch(() => ({}));
        throw new Error(`Authentication test failed: ${testError.error || 'Unknown error'}`);
      }

      const testResult = await testResponse.json();
      console.log('✅ Authentication test passed:', testResult);

      // The backend now handles token refresh automatically
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/youtube/comments?limit=10`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const commentsData = await response.json();
      setYoutubeComments(commentsData.comments || []);
    } catch (err) {
      console.error('YouTube Comments API error:', err);
      setCommentsError(err instanceof Error ? err.message : 'Failed to load YouTube comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  const syncComments = async () => {
    
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      // Get session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found');
      }

      // Test authentication first
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/youtube/test-auth`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!testResponse.ok) {
        const testError = await testResponse.json().catch(() => ({}));
        throw new Error(`Authentication test failed: ${testError.error || 'Unknown error'}`);
      }

      const testResult = await testResponse.json();
      console.log('✅ Authentication test passed:', testResult);

      // The backend now handles token refresh automatically
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/youtube/sync-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        setSyncMessage(`✅ ${result.message}`);
        // Refresh comments after sync
        await fetchYouTubeComments();
      } else {
        setSyncMessage(`❌ ${result.error || 'Sync failed'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage(`❌ Failed to sync comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} months ago`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      case 'neutral':
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getAuthorInitials = (authorName: string) => {
    return authorName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTagColor = (tag: string) => {
    const colorMap: { [key: string]: string } = {
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
    };
    return colorMap[tag] || "bg-gray-100 text-gray-800";
  };

  // Mock data for demo (replace with real data later)
  const mockComments = [
    {
      id: 1,
      author: "John Doe",
      initials: "JD",
      platform: "YouTube",
      timeAgo: "2 hours ago",
      content: "This video was exactly what I needed! I've been struggling with my content strategy and your tips are super helpful. Can't wait to implement these ideas!",
      sentiment: "Positive",
      sentimentColor: "text-green-600 bg-green-50",
      actions: ["Like", "Reply", "More"],
      tag: "Product Praise",
      tagColor: "bg-blue-100 text-blue-800"
    },
    {
      id: 2,
      author: "Sarah Miller",
      initials: "SM",
      platform: "Instagram",
      timeAgo: "5 hours ago",
      content: "Have you thought about adding a feature that lets us schedule posts directly from the dashboard? That would save me so much time!",
      sentiment: "Neutral",
      sentimentColor: "text-gray-600 bg-gray-50",
      actions: ["Like", "Reply", "More"],
      tag: "Feature Request",
      tagColor: "bg-purple-100 text-purple-800"
    },
    {
      id: 3,
      author: "Troll King",
      initials: "TK",
      platform: "YouTube",
      timeAgo: "1 day ago",
      content: "This content is terrible. You clearly don't know what you're talking about. I can't believe people actually watch this garbage.",
      sentiment: "Negative",
      sentimentColor: "text-red-600 bg-red-50",
      actions: ["Like", "Reply", "Hide"],
      tag: "Hate Speech",
      tagColor: "bg-red-100 text-red-800"
    }
  ];

  // Filter comments based on selected platform
  const getFilteredComments = () => {
    if (selectedPlatform === 'All platforms') {
      return youtubeComments;
    }
    return youtubeComments.filter(comment => 
      comment.platform.toLowerCase() === selectedPlatform.toLowerCase()
    );
  };

  const commentsToDisplay = getFilteredComments();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Main Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Your Centralized Comment Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            One place to view, analyze, and respond to all your comments across platforms.
          </p>
        </div>

        {/* Connected Accounts Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Connected Accounts</h2>
          
          {/* Debug Button - Temporary */}
          <div className="mb-4">
            <Button 
              onClick={async () => {
                if (!currentUser) return;
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                    'X-Provider-Token': session?.provider_token || '',
                  };
                  
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/youtube/debug-scopes/${currentUser.id}`, {
                    headers,
                  });
                  
                  const debugData = await response.json();
                  console.log('🔍 Debug OAuth Scopes:', debugData);
                  alert(`Debug Results:\nChannel Test: ${debugData.channelTest?.success ? '✅' : '❌'}\nComments Test: ${debugData.commentsTest?.success ? '✅' : '❌'}\nCheck console for details.`);
                } catch (error) {
                  console.error('Debug error:', error);
                  alert('Debug failed - check console');
                }
              }}
              variant="outline"
              size="sm"
            >
              🔍 Debug OAuth Scopes
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Google Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Google Profile</span>
                  {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!profileLoading && googleProfile && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {!profileLoading && profileError && <XCircle className="h-4 w-4 text-red-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {googleProfile ? (
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <Image
                        src={googleProfile.profilePhoto}
                        alt={googleProfile.displayName}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        priority
                      />
                    </div>
                    <div>
                      <p className="font-medium">{googleProfile.displayName}</p>
                      <p className="text-sm text-gray-500">{googleProfile.primaryEmail}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Google profile not connected</p>
                )}
              </CardContent>
            </Card>

            {/* YouTube Channel Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5 text-red-600" />
                  <span>YouTube Channel</span>
                  {youtubeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!youtubeLoading && youtubeChannel && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {!youtubeLoading && youtubeError && <XCircle className="h-4 w-4 text-red-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {youtubeChannel ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={youtubeChannel.profileImage}
                          alt={youtubeChannel.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold">{youtubeChannel.name}</h3>
                        <p className="text-sm text-gray-600">{formatNumber(youtubeChannel.subscriberCount)} subscribers</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{formatNumber(youtubeChannel.videoCount)}</p>
                        <p className="text-xs text-gray-600">Videos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatNumber(youtubeChannel.totalViews)}</p>
                        <p className="text-xs text-gray-600">Views</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{youtubeChannel.country || 'N/A'}</p>
                        <p className="text-xs text-gray-600">Country</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={syncComments}
                        disabled={syncLoading}
                        className="flex-1"
                        variant="outline"
                        size="sm"
                      >
                        {syncLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Comments
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={setupYouTubePlatform}
                        size="sm"
                        variant="outline"
                      >
                        Setup YouTube
                      </Button>
                      {syncMessage && (
                        <div className="mt-2 text-sm">
                          <span className={syncMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}>
                            {syncMessage}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : youtubeError ? (
                  <div className="text-center py-4">
                    <p className="text-red-600 text-sm">{youtubeError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => currentUser && fetchYouTubeChannel()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No YouTube channel connected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comment Dashboard Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C2</span>
              </div>
              <h2 className="text-xl font-semibold">Comment Dashboard</h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search comments..."
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Platform Dropdown */}
              <div className="relative dropdown-container">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center space-x-2"
                  onClick={() => {
                    setPlatformDropdownOpen(!platformDropdownOpen);
                    setTimePeriodDropdownOpen(false);
                  }}
                >
                  <span>{selectedPlatform}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${platformDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
                
                {platformDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      {platformOptions.map((platform) => (
                        <button
                          key={platform}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            selectedPlatform === platform ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setSelectedPlatform(platform);
                            setPlatformDropdownOpen(false);
                          }}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Time Period Dropdown */}
              <div className="relative dropdown-container">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center space-x-2"
                  onClick={() => {
                    setTimePeriodDropdownOpen(!timePeriodDropdownOpen);
                    setPlatformDropdownOpen(false);
                  }}
                >
                  <span>{selectedTimePeriod}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${timePeriodDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
                
                {timePeriodDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      {timePeriodOptions.map((period) => (
                        <button
                          key={period}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            selectedTimePeriod === period ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setSelectedTimePeriod(period);
                            setTimePeriodDropdownOpen(false);
                          }}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Total Comments</p>
                <p className="text-3xl font-bold">1,247</p>
                <p className="text-sm text-green-600">↑ 12% from last week</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Sentiment</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '72%' }}></div>
                  </div>
                  <span className="text-sm font-medium">72%</span>
                </div>
                <p className="text-sm text-green-600">Mostly positive</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-3xl font-bold">68%</p>
                <p className="text-sm text-orange-600">↓ 3% from last week</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Time Saved</p>
                <p className="text-3xl font-bold">4.2 hrs</p>
                <p className="text-sm text-gray-600">This week</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Comments - Left Side */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Comments</CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" className="text-indigo-600">All</Button>
                    <Button variant="ghost" size="sm">Needs Response</Button>
                    <Button variant="ghost" size="sm">Flagged</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading comments...</span>
                  </div>
                ) : commentsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-600">{commentsError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => currentUser && fetchYouTubeComments()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : commentsToDisplay.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No comments found</p>
                  </div>
                ) : (
                  commentsToDisplay.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          {comment.authorProfileImage ? (
                            <Image
                              src={comment.authorProfileImage}
                              alt={comment.author}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600">{getAuthorInitials(comment.author)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{comment.author}</span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-500">{getTimeAgo(comment.publishedAt)}</span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-500">{comment.platform}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getSentimentColor(comment.sentiment)}>
                                {comment.sentiment}
                              </Badge>
                              {comment.primary_tag && (
                                <Badge className={getTagColor(comment.primary_tag)}>
                                  {comment.primary_tag}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-gray-700">{comment.content}</p>
                          
                          {/* Display additional tags if any */}
                          {comment.tags && comment.tags.length > 1 && (
                            <div className="flex flex-wrap gap-1">
                              {comment.tags.slice(1).map((tag, index) => (
                                <Badge key={index} variant="outline" className={`text-xs ${getTagColor(tag)}`}>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Button variant="ghost" size="sm">
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                {comment.likeCount > 0 ? formatNumber(comment.likeCount) : 'Like'}
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Reply
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4 mr-1" />
                                More
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Video: {comment.videoTitle.length > 30 ? 
                                `${comment.videoTitle.substring(0, 30)}...` : 
                                comment.videoTitle
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      <hr className="border-gray-100" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Features - Right Side */}
          <div className="space-y-6">
            {/* AI Reply Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle>AI Reply Suggestions</CardTitle>
                <CardDescription>Select a comment to see AI-generated reply options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm mb-2">Thanks for the kind words!</p>
                  <p className="text-sm text-gray-600">I&apos;m so glad the content was helpful. Let me know how those strategies work for you!</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm mb-2">Great suggestion!</p>
                  <p className="text-sm text-gray-600">We&apos;re actually working on a scheduling feature right now. Would love to hear more about what you&apos;d want to see in it.</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm mb-2">Custom reply...</p>
                  <textarea 
                    placeholder="Write your own response..."
                    className="w-full text-sm border-0 bg-transparent resize-none focus:outline-none"
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">Tone: Professional</span>
                    <Button size="sm">Send</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Automations */}
            <Card>
              <CardHeader>
                <CardTitle>Active Automations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Hide Toxic Comments</p>
                    <p className="text-sm text-gray-500">If toxicity {'>'} 80%, auto-hide comment</p>
                  </div>
                  <div className="w-10 h-6 bg-green-500 rounded-full flex items-center justify-end pr-1">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Flag Feature Requests</p>
                    <p className="text-sm text-gray-500">Tag and notify team of feature requests</p>
                  </div>
                  <div className="w-10 h-6 bg-green-500 rounded-full flex items-center justify-end pr-1">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-Like Positive</p>
                    <p className="text-sm text-gray-500">Auto-like comments with positive sentiment</p>
                  </div>
                  <div className="w-10 h-6 bg-gray-300 rounded-full flex items-center justify-start pl-1">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Automation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 