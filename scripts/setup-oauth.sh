#!/bin/bash

# 🔐 C2HQ Google OAuth Setup Script
# This script helps you configure Google OAuth for local development

echo "🚀 C2HQ Google OAuth Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the C2HQ project root directory"
    exit 1
fi

# Create frontend .env.local if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend/.env.local..."
    cp frontend/env.example frontend/.env.local
    echo "✅ Created frontend/.env.local from template"
else
    echo "ℹ️  frontend/.env.local already exists"
fi

# Create api .env if it doesn't exist  
if [ ! -f "api/.env" ]; then
    echo "📝 Creating api/.env..."
    cp api/env.example api/.env
    echo "✅ Created api/.env from template"
else
    echo "ℹ️  api/.env already exists"
fi

echo ""
echo "🔧 Next Steps:"
echo "=============="
echo ""
echo "1. 🌐 Set up Google Cloud Console:"
echo "   - Go to: https://console.cloud.google.com/"
echo "   - Create OAuth 2.0 credentials"
echo "   - Enable YouTube Data API v3"
echo ""
echo "2. 🔑 Configure Supabase:"
echo "   - Go to: https://supabase.com/dashboard"
echo "   - Enable Google OAuth provider"
echo "   - Add YouTube scopes"
echo ""
echo "3. ✏️  Update environment files:"
echo "   - Edit frontend/.env.local"
echo "   - Edit api/.env"
echo "   - Replace placeholder values with real credentials"
echo ""
echo "4. 🧪 Test the setup:"
echo "   - Run: npm run dev"
echo "   - Go to: http://localhost:3000/login"
echo "   - Try Google OAuth login"
echo ""
echo "📚 For detailed instructions, see: docs/GOOGLE_OAUTH_SETUP.md"
echo ""

# Make the script executable
chmod +x scripts/setup-oauth.sh 2>/dev/null || true

echo "✨ Setup complete! Follow the next steps above to configure OAuth." 