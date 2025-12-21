'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, Settings, Bell, Car, Bike, MapPin, GraduationCap, Bus, Search, Clock, Wrench, Ticket, History as HistoryIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

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
  const [activeCityToCityRequest, setActiveCityToCityRequest] = useState<any>(null);
  const [activeServiceRequest, setActiveServiceRequest] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const router = useRouter();

  // Fetch cities for display
  const fetchCities = useCallback(async () => {
    try {
      const response = await fetch('/api/cities');
      if (response.ok) {
        const data = await response.json();
        setCities(data.cities || []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }, []);

  // Check for active city-to-city request
  const checkActiveCityToCityRequest = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/city-to-city/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.activeRequest) {
          setActiveCityToCityRequest(data.activeRequest);
        } else {
          setActiveCityToCityRequest(null);
        }
      }
    } catch (error) {
      console.error('Error checking active city-to-city request:', error);
    }
  }, []);

  // Check for active service request
  const checkActiveServiceRequest = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/services/requests/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.request) {
          setActiveServiceRequest(data.request);
        } else {
          setActiveServiceRequest(null);
        }
      }
    } catch (error) {
      console.error('Error checking active service request:', error);
    }
  }, []);

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
        // Fetch cities and check for active requests
        fetchCities();
        checkActiveCityToCityRequest();
        checkActiveServiceRequest();
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [router, fetchCities, checkActiveCityToCityRequest, checkActiveServiceRequest]);

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
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="GO SAFE Logo" width={40} height={40} className="object-contain" />
              <h1 className="text-2xl font-bold text-white">GO SAFE</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <Bell className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => router.push('/history')}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <HistoryIcon className="w-5 h-5 text-white" />
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
          {/* Active City-to-City Request */}
          {activeCityToCityRequest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer"
              onClick={() => {
                router.push('/city-to-city');
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <Search className="w-6 h-6 text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Active Ride Share Search</h3>
                    <p className="text-white/70 text-sm">
                      {cities.find(c => c.id === activeCityToCityRequest.fromCityId)?.name || activeCityToCityRequest.fromCity?.name || 'N/A'} → {cities.find(c => c.id === activeCityToCityRequest.toCityId)?.name || activeCityToCityRequest.toCity?.name || 'N/A'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1 text-white/60 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(activeCityToCityRequest.travelDate).toLocaleDateString()}</span>
                      </div>
                      {activeCityToCityRequest.userType === 'has-car' && activeCityToCityRequest.matchedPassengers && (
                        <span className="text-green-400 text-xs">
                          {activeCityToCityRequest.matchedPassengers.length} of {activeCityToCityRequest.numberOfSeats || 1} matched
                        </span>
                      )}
                      {activeCityToCityRequest.userType === 'needs-car' && activeCityToCityRequest.status === 'matched' && (
                        <span className="text-green-400 text-xs">Matched!</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-white/70">
                  <p className="text-sm">Click to view matches</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Active Home Service Request */}
          {activeServiceRequest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer"
              onClick={() => {
                router.push('/home-services');
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Active Service Request</h3>
                    <p className="text-white/70 text-sm">
                      {activeServiceRequest.service?.name || 'Service'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1 text-white/60 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Requested {new Date(activeServiceRequest.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-white/60 text-xs">
                        Budget: ${activeServiceRequest.budget?.toLocaleString() || '0'}
                      </span>
                      <span className={`text-xs font-medium ${
                        activeServiceRequest.status === 'searching' ? 'text-yellow-400' :
                        activeServiceRequest.status === 'accepted' ? 'text-blue-400' :
                        activeServiceRequest.status === 'in_progress' ? 'text-green-400' :
                        'text-white/70'
                      }`}>
                        {activeServiceRequest.status === 'searching' && 'Searching...'}
                        {activeServiceRequest.status === 'pending' && 'Pending'}
                        {activeServiceRequest.status === 'accepted' && 'Provider on the way'}
                        {activeServiceRequest.status === 'in_progress' && 'In progress'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-white/70">
                  <p className="text-sm">Click to view details</p>
                </div>
              </div>
            </motion.div>
          )}
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