'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, Settings, Bell, Car, Bike, MapPin, GraduationCap, Bus, Search, Clock, Wrench, Ticket, History as HistoryIcon, Briefcase, MessageCircle } from 'lucide-react';
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
  const [whatsappNumber, setWhatsappNumber] = useState<string>('263776954448'); // Default fallback
  const router = useRouter();

  // Fetch WhatsApp number
  const fetchWhatsappNumber = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/whatsapp');
      if (response.ok) {
        const data = await response.json();
        if (data.number) {
          setWhatsappNumber(data.number);
        }
      }
    } catch (error) {
      console.error('Error fetching WhatsApp number:', error);
    }
  }, []);

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

  // Check for active service requests
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
        // Fetch cities, WhatsApp number, and check for active requests
        fetchCities();
        fetchWhatsappNumber();
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
  }, [router, fetchCities, fetchWhatsappNumber, checkActiveCityToCityRequest, checkActiveServiceRequest]);


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
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Greeting Section */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-8"
            >
              <h2 className="text-white/90 text-xl md:text-2xl font-medium">
              👋 Hi {user.fullName?.split(' ')[0] || user.fullName || 'there'}! 😅✨
              </h2>
            </motion.div>
          )}

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

        {/* Service Modules - Mobile: Circular Wheel Menu */}
        <div className="mt-8 md:hidden">
          <style jsx>{`
            .wheel-container {
              position: relative;
              width: 100%;
              height: 400px;
              display: flex;
              justify-content: flex-start;
              align-items: center;
              overflow: hidden;
            }
            
            .wheel {
              position: absolute;
              left: -133px;
              top: 50%;
              transform: translateY(-50%);
              width: 400px;
              height: 400px;
              border-radius: 50%;
              background: #696464e6;
              box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            
            .center {
              position: absolute;
              top: 58%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 200px;
              height: 200px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            
            .center-logo {
              width: 100%;
              height: 100%;
              border-radius: 50%;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
            }
            
            .center-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 50%;
            }
            
            .icon-container {
              position: absolute;
              top: 56%;
              left: 50%;
              width: 60px;
              height: 60px;
              margin: -30px;
              transform-origin: center;
            }
            
            .icon {
              width: 100%;
              height: 100%;
              border: none;
              background: none;
              cursor: pointer;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 5px;
              outline: none;
            }
            
            .icon:active,
            .icon:focus,
            .icon:focus-visible {
              outline: none;
              border: none;
              background: none;
            }
            
            .icon svg {
              width: 30px;
              height: 30px;
              stroke: #ffe200 !important;
              color: #ffe200 !important;
              transition: stroke 0.3s ease, color 0.3s ease, transform 0.3s ease;
            }
            
            .icon svg path {
              stroke: #ffe200 !important;
              fill: none;
            }
            
            .icon-label {
              color: #ffe200 !important;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              white-space: nowrap;
              margin-top: 5px;
              transition: color 0.3s ease;
            }
            
            .icon:hover svg {
              stroke: #2c3e50;
              color: #2c3e50;
              transform: scale(1.1);
            }
            
            .icon:hover .icon-label {
              color: #2c3e50;
            }
            
            .icon:active svg,
            .icon:focus svg,
            .icon:focus-visible svg {
              stroke: #ffe200 !important;
              color: #ffe200 !important;
            }
            
            .icon:active .icon-label,
            .icon:focus .icon-label,
            .icon:focus-visible .icon-label {
              color: #ffe200 !important;
            }
            
            .icon:active svg path,
            .icon:focus svg path,
            .icon:focus-visible svg path {
              stroke: #ffe200 !important;
            }
            
            .icon button .icon-label,
            .icon .icon-label,
            button.icon .icon-label,
            .icon-label {
              color: #ffe200 !important;
            }
            
            .icon:hover:not(:active) .icon-label {
              color: #2c3e50;
            }
            
            .icon:active .icon-label,
            .icon:focus .icon-label,
            .icon:focus-visible .icon-label,
            .icon:visited .icon-label {
              color: #ffe200 !important;
            }
            
            .ride-container {
              transform: translate(-50%, -50%) rotate(270deg) translate(160px) rotate(-270deg);
            }
            
            .delivery-container {
              transform: translate(-50%, -50%) rotate(315deg) translate(160px) rotate(-315deg);
            }
            
            .city-to-city-container {
              transform: translate(-50%, -50%) rotate(0deg) translate(160px) rotate(0deg);
            }
            
            .home-services-container {
              transform: translate(-50%, -50%) rotate(45deg) translate(160px) rotate(-45deg);
            }
            
            .bus-rank-container {
              transform: translate(-50%, -50%) rotate(90deg) translate(160px) rotate(-90deg);
            }
          `}</style>
          
          <div className="wheel-container">
            <div className="wheel">
              <div className="center">
                <div className="center-logo">
                  <Image 
                    src="/logologo.png" 
                    alt="GO SAFE Logo" 
                    width={200} 
                    height={200} 
                    className="object-contain"
                  />
                </div>
              </div>
              
              {/* Bus Rank */}
              <div className="icon-container bus-rank-container">
                <button className="icon" onClick={() => router.push('/bus-booking')}>
                  <Bus className="w-[30px] h-[30px]" stroke="#ffe200" color="#ffe200" />
                  <span className="icon-label">Bus Rank</span>
                </button>
              </div>
              
              {/* Home Services */}
              <div className="icon-container home-services-container">
                <button className="icon" onClick={() => router.push('/home-services')}>
                  <Wrench className="w-[30px] h-[30px]" stroke="#ffe200" color="#ffe200" />
                  <span className="icon-label">Home Services</span>
                </button>
              </div>
              
              {/* City to City */}
              <div className="icon-container city-to-city-container">
                <button className="icon" onClick={() => router.push('/city-to-city')}>
                  <MapPin className="w-[30px] h-[30px]" stroke="#ffe200" color="#ffe200" />
                  <span className="icon-label">City to City</span>
                </button>
              </div>
              
              {/* Delivery */}
              <div className="icon-container delivery-container">
                <button className="icon" onClick={() => router.push('/parcel')}>
                  <Bike className="w-[30px] h-[30px]" stroke="#ffe200" color="#ffe200" />
                  <span className="icon-label">Delivery</span>
                </button>
              </div>
              
              {/* Ride */}
              <div className="icon-container ride-container">
                <button className="icon" onClick={() => router.push('/ride')}>
                  <Car className="w-[30px] h-[30px]" stroke="#ffe200" color="#ffe200" />
                  <span className="icon-label">Ride</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Service Modules - Desktop/Tablet: Grid Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 hidden md:block"
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
                  <Wrench className="w-6 h-6 text-white" />
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

        {/* Become a Service Provider Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 flex flex-col items-center justify-center"
        >
          <button
            onClick={() => router.push('/become-provider')}
            className="bg-nexryde-yellow/20 hover:bg-nexryde-yellow/30 text-nexryde-yellow border border-nexryde-yellow/30 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Briefcase className="w-5 h-5" />
            <span>Become a Service Provider</span>
          </button>
          <p className="mt-4 text-white/70 text-sm text-center max-w-md">
            Join as a <span className="text-nexryde-yellow font-medium">taxi driver</span>,{' '}
            <span className="text-nexryde-yellow font-medium">bike delivery guy</span>,{' '}
            <span className="text-nexryde-yellow font-medium">motor mechanic</span>,{' '}
            <span className="text-nexryde-yellow font-medium">electrician</span>,{' '}
            <span className="text-nexryde-yellow font-medium">security guard</span>,{' '}
            <span className="text-nexryde-yellow font-medium">plumber</span>, and more
          </p>
        </motion.div>

      </div>

      {/* Floating WhatsApp Support Button */}
      <motion.a
        href={`https://wa.me/${whatsappNumber}?text=Hi%2C%20I%20need%20support%20with...`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-[#25D366] hover:bg-[#20BA5A] rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-200 group border-2 border-white/20"
        title="Contact Support on WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="w-10 h-10"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .96 4.534.96 10.08c0 1.792.413 3.53 1.2 5.079L0 24l8.94-2.141a11.88 11.88 0 003.11.411h.001c5.554 0 10.089-4.534 10.089-10.088 0-2.688-1.05-5.216-2.956-7.12z" />
        </svg>
        <span className="absolute -top-12 right-0 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Contact Support
        </span>
      </motion.a>

    </div>
  );
}