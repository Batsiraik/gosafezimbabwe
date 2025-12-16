'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, Settings, Bell, Car, Bike, MapPin, GraduationCap, Bus } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  isActive: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in (only runs on client)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nexryde_token');
      const userData = localStorage.getItem('nexryde_user');
      
      if (!token || !userData) {
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('nexryde_token');
    localStorage.removeItem('nexryde_user');
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const handleServiceClick = (service: string) => {
    if (service === 'Ride') {
      router.push('/ride');
    } else if (service === 'Send Parcel') {
      router.push('/parcel');
    } else if (service === 'City to City') {
      router.push('/city-to-city');
    } else if (service === 'Home Services') {
      router.push('/home-services');
    } else if (service === 'Bus Booking') {
      router.push('/bus-booking');
    } else {
      toast.success(`${service} service coming soon!`);
    }
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
              <h1 className="text-2xl font-bold text-white">OneGo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <Bell className="w-5 h-5 text-white" />
              </button>
              <button 
                onClick={() => router.push('/settings')}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
        </motion.div>

        {/* Service Modules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button 
              onClick={() => handleServiceClick('Ride')}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:bg-white/20 transition-all duration-200 group"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-nexryde-yellow rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-2">Ride</h4>
                <p className="text-white/70 text-sm">Intercity ride within the city</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleServiceClick('Send Parcel')}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:bg-white/20 transition-all duration-200 group"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-nexryde-yellow rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Bike className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-2">Send Parcel</h4>
                <p className="text-white/70 text-sm">Fast parcel delivery</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleServiceClick('City to City')}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:bg-white/20 transition-all duration-200 group"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-nexryde-yellow rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-2">City to City/ Ride Share</h4>
                <p className="text-white/70 text-sm">Share Costs Travelling</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleServiceClick('Home Services')}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:bg-white/20 transition-all duration-200 group"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-nexryde-yellow rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-2">Home Services</h4>
                <p className="text-white/70 text-sm">Get your home services</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleServiceClick('Bus Booking')}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:bg-white/20 transition-all duration-200 group"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-nexryde-yellow rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Bus className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-2">Bus Booking</h4>
                <p className="text-white/70 text-sm">Book a seat city to city</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}