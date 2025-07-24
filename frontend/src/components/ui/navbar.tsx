'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  LogOut,
  Settings,
  HelpCircle,
  Menu,
  X,
  Home,
  BarChart3
} from 'lucide-react';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           'User';
  };

  const getUserAvatar = () => {
    if (!user) return null;
    return user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  };

  if (loading) {
    return (
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 sticky top-0 z-50">
      <div className="flex justify-between items-center h-16">
        {/* Logo and Brand */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C2</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">C2HQ</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            href="/demo-dashboard" 
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
          <Link 
            href="/demo" 
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Demo
          </Link>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {/* Desktop User Menu */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      {getUserAvatar() ? (
                        <Image
                          src={getUserAvatar()!}
                          alt={getUserDisplayName()}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-indigo-600" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {getUserDisplayName()}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/demo-dashboard" className="flex items-center">
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/demo" className="flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Demo
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/help" className="flex items-center">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            <div className="flex items-center px-3 py-2 border-b border-gray-200">
              {getUserAvatar() ? (
                <Image
                  src={getUserAvatar()!}
                  alt={getUserDisplayName()}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
              )}
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500">
                  {user.email}
                </p>
              </div>
            </div>
            
            <Link
              href="/demo-dashboard"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="mr-3 h-4 w-4" />
              Dashboard
            </Link>
            
            <Link
              href="/demo"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Demo
            </Link>
            
            <Link
              href="/settings"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </Link>
            
            <Link
              href="/help"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <HelpCircle className="mr-3 h-4 w-4" />
              Help
            </Link>
            
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center w-full px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
} 