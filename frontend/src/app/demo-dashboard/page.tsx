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
  XCircle
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

export default function DemoDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
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

        // Now try to fetch Google profile
        await fetchGoogleProfile(currentUser.id);
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
        throw new Error('No Google access token found');
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
                <Button 
                  variant="outline" 
                  onClick={() => currentUser && fetchGoogleProfile(currentUser.id)}
                >
                  Try Again
                </Button>
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

        {/* Coming Soon Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Next: YouTube Data</span>
            </CardTitle>
            <CardDescription>
              We&apos;ll add your YouTube channel information next.
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