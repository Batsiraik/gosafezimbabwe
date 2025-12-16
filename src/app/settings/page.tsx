'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, MapPin, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in (only runs on client)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nexryde_token');
      
      if (!token) {
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }

      // Load user data from localStorage
      loadUserData();
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const loadUserData = async () => {
    try {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('nexryde_user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexryde_token');
    localStorage.removeItem('nexryde_user');
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-nexryde-yellow/20 rounded-xl">
              <SettingsIcon className="w-6 h-6 text-nexryde-yellow" />
            </div>
            <h2 className="text-xl font-bold text-white">Account Information</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <User className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Full Name</p>
                <p className="text-white font-semibold text-lg">{user.fullName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Phone className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Phone Number</p>
                <p className="text-white font-semibold text-lg">+263{user.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <MapPin className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <p className="text-white/70 text-sm">City</p>
                <p className="text-white font-semibold text-lg">{user.city}</p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 font-medium">Account Verified</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-semibold hover:bg-red-500/30 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Coming Soon Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-nexryde-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <SettingsIcon className="w-8 h-8 text-nexryde-yellow" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">More Settings Coming Soon</h3>
            <p className="text-white/70">
              Advanced settings, address management, and payment methods will be available in future updates.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}