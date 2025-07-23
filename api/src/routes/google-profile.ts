import express from 'express';
import { google } from 'googleapis';
import { getSupabaseAdmin } from '../services/supabase';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// Initialize People API
const people = google.people('v1');

// Get user profile data from Google People API
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to get access token from header first
    let accessToken: string | null = req.headers['x-provider-token'] as string || null;
    
    if (!accessToken) {
      // Fallback: Get user's access token from Supabase
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error || !userData?.user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Extract access token from user metadata
      accessToken = userData.user.user_metadata?.provider_token || null;
    }
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'No access token found',
        suggestion: 'Try signing out and signing in again'
      });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Fetch user profile data
    const profileResponse = await people.people.get({
      auth: oauth2Client,
      resourceName: 'people/me',
      personFields: [
        'names',
        'emailAddresses',
        'photos',
        'phoneNumbers',
        'addresses',
        'birthdays',
        'locales',
        'metadata',
        'organizations',
        'coverPhotos',
        'biographies'
      ].join(',')
    });

    const profile = profileResponse.data;

    // Parse and structure the profile data
    const structuredProfile = {
      // Basic Info
      id: profile.resourceName?.replace('people/', ''),
      displayName: profile.names?.[0]?.displayName,
      givenName: profile.names?.[0]?.givenName,
      familyName: profile.names?.[0]?.familyName,
      middleName: profile.names?.[0]?.middleName,
      
      // Email addresses
      emails: profile.emailAddresses?.map(email => ({
        value: email.value,
        type: email.type,
        primary: email.metadata?.primary || false
      })) || [],
      primaryEmail: profile.emailAddresses?.find(email => email.metadata?.primary)?.value,
      
      // Photos
      photos: profile.photos?.map(photo => ({
        url: photo.url,
        isDefault: photo.default || false
      })) || [],
      profilePhoto: profile.photos?.[0]?.url,
      
      // Phone numbers
      phoneNumbers: profile.phoneNumbers?.map(phone => ({
        value: phone.value,
        type: phone.type,
        canonicalForm: phone.canonicalForm
      })) || [],
      
      // Addresses
      addresses: profile.addresses?.map(address => ({
        formattedValue: address.formattedValue,
        type: address.type,
        streetAddress: address.streetAddress,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        country: address.country
      })) || [],
      
      // Birthday
      birthday: profile.birthdays?.[0] ? {
        day: profile.birthdays[0].date?.day,
        month: profile.birthdays[0].date?.month,
        year: profile.birthdays[0].date?.year
      } : null,
      
      // Locale/Language
      locale: profile.locales?.[0]?.value,
      
      // Organizations (work/education)
      organizations: profile.organizations?.map(org => ({
        name: org.name,
        title: org.title,
        type: org.type,
        startDate: org.startDate,
        endDate: org.endDate,
        current: org.current,
        department: org.department,
        domain: org.domain,
        location: org.location
      })) || [],
      
      // Biography
      biography: profile.biographies?.[0]?.value,
      
      // Cover photo
      coverPhoto: profile.coverPhotos?.[0]?.url,
      
      // Metadata
      lastUpdated: profile.metadata?.sources?.find(source => source.type === 'PROFILE')?.updateTime
    };

    res.json({
      profile: structuredProfile,
      rawData: profile // Include raw data for debugging
    });
  } catch (error) {
    console.error('Google People API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Google profile data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's Google account info (simpler endpoint)
router.get('/basic/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to get access token from header first
    let accessToken: string | null = req.headers['x-provider-token'] as string || null;
    
    if (!accessToken) {
      // Fallback: Get user's access token from Supabase
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error || !userData?.user) {
        return res.status(404).json({ error: 'User not found' });
      }

      accessToken = userData.user.user_metadata?.provider_token || null;
    }
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'No access token found',
        suggestion: 'Try signing out and signing in again'
      });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Get basic profile info
    const profileResponse = await people.people.get({
      auth: oauth2Client,
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos,locales'
    });

    const profile = profileResponse.data;

    res.json({
      displayName: profile.names?.[0]?.displayName || 'Unknown User',
      givenName: profile.names?.[0]?.givenName || '',
      familyName: profile.names?.[0]?.familyName || '',
      primaryEmail: profile.emailAddresses?.find(email => email.metadata?.primary)?.value || '',
      profilePhoto: profile.photos?.[0]?.url || '',
      locale: profile.locales?.[0]?.value || 'en-US'
    });
  } catch (error) {
    console.error('Google People API basic error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch basic Google profile data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 