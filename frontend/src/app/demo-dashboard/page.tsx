'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  User, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Users,
  Video,
  Eye,
  Calendar
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
  
  const router = useRouter();

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

        // Now try to fetch Google profile and YouTube data
        await fetchGoogleProfile(currentUser.id);
        await fetchYouTubeChannel(currentUser.id);
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login?redirectTo=/demo-dashboard');
      }
    };

    checkAuth();
  }, [router]);

  const fetchGoogleProfile = async (userId: string) => {
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/google-profile/basic/${userId}`, {
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

  const fetchYouTubeChannel = async (userId: string) => {
    setYoutubeLoading(true);
    setYoutubeError(null);

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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/youtube/channel/${userId}`, {
        headers,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            {googleProfile?.profilePhoto ? (
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <Image
                  src={googleProfile.profilePhoto}
                  alt={googleProfile.displayName || 'Profile'}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Hello, {googleProfile?.givenName || 'User'}! 👋
              </h1>
              <p className="text-xl text-gray-600">
                Welcome to your demo dashboard
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>User Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="font-medium">User ID:</span>
                <span className="text-sm text-gray-600">{currentUser?.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Email:</span>
                <span className="text-sm text-gray-600">{currentUser?.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Profile Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Google Profile</span>
              {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!profileLoading && googleProfile && <CheckCircle className="h-4 w-4 text-green-600" />}
              {!profileLoading && profileError && <XCircle className="h-4 w-4 text-red-600" />}
            </CardTitle>
            <CardDescription>
              {profileLoading ? 'Loading your Google profile...' : 
               profileError ? 'Failed to load Google profile' :
               googleProfile ? 'Your Google account information' :
               'Google profile not available'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Fetching profile data...</span>
              </div>
            )}

            {profileError && (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{profileError}</p>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => currentUser && fetchGoogleProfile(currentUser.id)}
                  >
                    Try Again
                  </Button>
                  {profileError.includes('expired') && (
                    <Button 
                      onClick={() => router.push('/login?redirectTo=/demo-dashboard')}
                    >
                      Sign In Again
                    </Button>
                  )}
                </div>
              </div>
            )}

            {googleProfile && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Full Name:</span>
                    <span>{googleProfile.displayName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Email:</span>
                    <span>{googleProfile.primaryEmail}</span>
                  </div>
                  {googleProfile.locale && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Locale:</span>
                      <span>{googleProfile.locale}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  {googleProfile.profilePhoto && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <Image
                        src={googleProfile.profilePhoto}
                        alt={googleProfile.displayName}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* YouTube Channel Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-red-600" />
              <span>YouTube Channel</span>
              {youtubeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!youtubeLoading && youtubeChannel && <CheckCircle className="h-4 w-4 text-green-600" />}
              {!youtubeLoading && youtubeError && <XCircle className="h-4 w-4 text-red-600" />}
            </CardTitle>
            <CardDescription>
              {youtubeLoading ? 'Loading your YouTube channel...' : 
               youtubeError ? 'Failed to load YouTube channel' :
               youtubeChannel ? 'Your YouTube channel information' :
               'YouTube channel not available'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {youtubeLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Fetching YouTube channel data...</span>
              </div>
            )}

            {youtubeError && (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{youtubeError}</p>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => currentUser && fetchYouTubeChannel(currentUser.id)}
                  >
                    Try Again
                  </Button>
                  {youtubeError.includes('expired') && (
                    <Button 
                      onClick={() => router.push('/login?redirectTo=/demo-dashboard')}
                    >
                      Sign In Again
                    </Button>
                  )}
                </div>
              </div>
            )}

            {youtubeChannel && (
              <div className="space-y-6">
                {/* Channel Info */}
                <div className="flex items-start space-x-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={youtubeChannel.profileImage}
                      alt={youtubeChannel.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{youtubeChannel.name}</h3>
                    {youtubeChannel.description && (
                      <p className="text-gray-600 mb-3 line-clamp-2">{youtubeChannel.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>ID: {youtubeChannel.id}</span>
                      {youtubeChannel.country && <span>📍 {youtubeChannel.country}</span>}
                      <span>📅 Created {formatDate(youtubeChannel.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Channel Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(youtubeChannel.subscriberCount)}
                    </div>
                    <div className="text-sm text-gray-600">Subscribers</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Video className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(youtubeChannel.videoCount)}
                    </div>
                    <div className="text-sm text-gray-600">Videos</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Eye className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(youtubeChannel.totalViews)}
                    </div>
                    <div className="text-sm text-gray-600">Total Views</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Soon Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Next: Recent Videos & Analysis</span>
            </CardTitle>
            <CardDescription>
              We&apos;ll add your recent videos and comment analysis next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button size="lg" onClick={() => router.push('/signup')}>
                Start Analyzing Comments
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push('/')}>
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 