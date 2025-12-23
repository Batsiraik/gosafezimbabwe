'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, MapPin, DollarSign, Clock, CheckCircle, Loader2, Plus, Minus, Navigation, Calendar, XCircle, Settings, User, Power, Phone, ExternalLink, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccurateLocation } from '@/lib/utils/geolocation';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '@/lib/background-location';
import { initializePushNotifications, setupPushNotificationListeners } from '@/lib/push-notifications';

interface PendingRide {
  id: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  distance: number;
  price: number;
  isRoundTrip: boolean;
  distanceFromDriver: number;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
}

interface DriverProfile {
  id: string;
  licenseNumber: string;
  carRegistration: string;
  isVerified: boolean;
  isOnline: boolean;
  currentLat: number | null;
  currentLng: number | null;
  averageRating?: number;
  totalRatings?: number;
}

interface PendingBid {
  id: string;
  bidPrice: number;
  status: string;
  createdAt: string;
  rideRequest: {
    id: string;
    pickupAddress: string;
    destinationAddress: string;
    pickupLat: number;
    pickupLng: number;
    price: number;
    distance: number;
    status: string;
    driverId: string | null;
    finalPrice: number | null;
    user: {
      id: string;
      fullName: string;
      phone: string;
    };
  };
}

export default function TaxiDriverDashboardPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loadingDriver, setLoadingDriver] = useState(true);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(false);
  const [selectedRide, setSelectedRide] = useState<PendingRide | null>(null);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [pendingBids, setPendingBids] = useState<PendingBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptedRides, setAcceptedRides] = useState<any[]>([]);

  // Check driver status
  const checkDriverStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/taxi/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.driver) {
          setDriver(data.driver);
          // Don't redirect if not verified - show pending message instead
        } else {
          // No driver profile, redirect to registration
          router.push('/driver/taxi/register');
          return;
        }
      } else if (response.status === 401) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error checking driver status:', error);
    } finally {
      setLoadingDriver(false);
    }
  }, [router]);

  useEffect(() => {
    checkDriverStatus();
    // Set user mode to taxi when this dashboard loads
    const { setUserMode } = require('@/lib/user-mode');
    setUserMode('taxi');
  }, [checkDriverStatus]);

  // Initialize push notifications for drivers (critical for receiving ride requests)
  useEffect(() => {
    if (typeof window !== 'undefined' && driver) {
      console.log('[DRIVER] Initializing push notifications for driver...');
      
      // Initialize push notifications
      initializePushNotifications().then((token) => {
        if (token) {
          console.log('[DRIVER] Push notification token received:', token);
        }
      });

      // Setup event listeners to store token
      setupPushNotificationListeners(
        async (token) => {
          console.log('[DRIVER] [PUSH TOKEN] Received token from Capacitor:', token);
          console.log('[DRIVER] [PUSH TOKEN] Token value length:', token.value?.length || 0);
          
          // Validate token before storing
          if (!token.value || token.value.length < 50) {
            console.error('[DRIVER] [PUSH TOKEN] ❌ Invalid token received. Token too short or empty.');
            return;
          }
          
          // Store token in backend
          try {
            const authToken = localStorage.getItem('nexryde_token');
            if (authToken) {
              console.log('[DRIVER] [PUSH TOKEN] Sending token to backend...');
              const response = await fetch('/api/users/push-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ pushToken: token.value }),
              });
              
              if (response.ok) {
                const data = await response.json();
                console.log('[DRIVER] [PUSH TOKEN] ✅ Token stored successfully:', data.message);
                toast.success('Notifications enabled! You will receive ride requests.');
              } else {
                const error = await response.json();
                console.error('[DRIVER] [PUSH TOKEN] ❌ Failed to store token:', error.error);
                toast.error('Failed to enable notifications. Please try again.');
              }
            } else {
              console.error('[DRIVER] [PUSH TOKEN] ❌ No auth token found');
            }
          } catch (error) {
            console.error('[DRIVER] [PUSH TOKEN] ❌ Error storing push token:', error);
          }
        },
        (notification) => {
          // Show notification when app is in foreground
          toast(notification.title || 'New notification', {
            icon: '🔔',
            duration: 4000,
          });
        },
        (action) => {
          // Handle notification tap
          console.log('[DRIVER] Notification tapped:', action);
          // TODO: Navigate to relevant page based on notification data
        }
      );
    }
  }, [driver]);

  // Redirect to registration if no driver profile exists
  useEffect(() => {
    if (!loadingDriver && !driver) {
      router.push('/driver/taxi/register');
    }
  }, [loadingDriver, driver, router]);

  // Fetch pending rides
  const fetchPendingRides = useCallback(async () => {
    if (!driver || !driver.isVerified || !driver.isOnline) {
      setPendingRides([]);
      return;
    }

    try {
      setLoadingRides(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/taxi/rides/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRides(data.rides || []);
      } else if (response.status === 403) {
        toast.error('Please wait for admin verification');
      } else if (response.status === 400) {
        const data = await response.json();
        setLocationError(data.error);
      }
    } catch (error) {
      console.error('Error fetching pending rides:', error);
      toast.error('Failed to load pending rides');
    } finally {
      setLoadingRides(false);
    }
  }, [driver]);

  // Background location tracking - continues even when app is closed/minimized
  useEffect(() => {
    if (!driver || !driver.isVerified || !driver.isOnline) {
      // Stop tracking if driver goes offline or is not verified
      stopBackgroundLocationTracking();
      return;
    }

    console.log('[DRIVER] Starting background location tracking for driver...');

    // Start background location tracking
    startBackgroundLocationTracking(
      async (lat, lng, accuracy) => {
        try {
          const token = localStorage.getItem('nexryde_token');
          if (!token) return;

          console.log(`[DRIVER] Updating location: (${lat}, ${lng}), accuracy: ${accuracy}m`);

          const response = await fetch('/api/driver/taxi/location', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              lat,
              lng,
            }),
          });

          if (response.ok) {
            setLocationError(null);
            // Refresh pending rides after location update
            fetchPendingRides();
            console.log('[DRIVER] ✅ Location updated successfully');
          } else {
            console.error('[DRIVER] ❌ Failed to update location:', await response.text());
          }
        } catch (error) {
          console.error('[DRIVER] ❌ Error updating location:', error);
        }
      },
      30000 // Update every 30 seconds
    ).catch((error) => {
      console.error('[DRIVER] ❌ Failed to start background tracking:', error);
      // Fallback to regular location tracking
      setLocationError('Background location tracking unavailable. Using standard tracking.');
    });

    // Cleanup on unmount or when driver goes offline
    return () => {
      console.log('[DRIVER] Stopping background location tracking...');
      stopBackgroundLocationTracking();
    };
  }, [driver?.isOnline, driver?.isVerified, fetchPendingRides]);

  // Toggle online status
  const toggleOnlineStatus = async () => {
    if (!driver) return;

    setIsTogglingOnline(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        router.push('/auth/login');
        return;
      }

      const newStatus = !driver.isOnline;

      const response = await fetch('/api/driver/taxi/online-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          isOnline: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update online status');
      }

      // Update local driver state
      setDriver({ ...driver, isOnline: newStatus });
      toast.success(newStatus ? 'You are now online' : 'You are now offline');
      
      // If going offline, clear pending rides
      if (!newStatus) {
        setPendingRides([]);
      } else {
        // If going online, fetch rides
        fetchPendingRides();
      }
    } catch (error: any) {
      console.error('Error toggling online status:', error);
      toast.error(error.message || 'Failed to update online status');
    } finally {
      setIsTogglingOnline(false);
    }
  };

  // Fetch pending bids
  const fetchPendingBids = useCallback(async () => {
    if (!driver || !driver.isVerified) return;

    try {
      setLoadingBids(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/taxi/bids/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingBids(data.bids || []);
      }
    } catch (error) {
      console.error('Error fetching pending bids:', error);
    } finally {
      setLoadingBids(false);
    }
  }, [driver]);

  // Fetch accepted rides (bids that were accepted by user)
  const fetchAcceptedRides = useCallback(async () => {
    if (!driver || !driver.isVerified) return;

    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/taxi/rides/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter for accepted/in_progress rides (status = accepted or in_progress, driverId matches)
        const accepted = (data.rides || []).filter((ride: any) => 
          (ride.status === 'accepted' || ride.status === 'in_progress') && ride.driverId === driver.id
        );
        setAcceptedRides(accepted);
      }
    } catch (error) {
      console.error('Error fetching accepted rides:', error);
    }
  }, [driver]);

  useEffect(() => {
    if (driver && driver.isVerified && driver.isOnline && driver.currentLat && driver.currentLng) {
      fetchPendingRides();
      fetchPendingBids();
      fetchAcceptedRides();
      // Poll for new rides, bids, and updates every 5 seconds
      // This ensures cancelled rides and rejected bids are removed quickly
      const interval = setInterval(() => {
        fetchPendingRides();
        fetchPendingBids();
        fetchAcceptedRides();
      }, 5000);
      return () => clearInterval(interval);
    } else {
      // Clear rides if offline
      setPendingRides([]);
      setPendingBids([]);
    }
  }, [driver, fetchPendingRides, fetchPendingBids, fetchAcceptedRides]);

  // Handle ride selection
  const handleSelectRide = (ride: PendingRide) => {
    setSelectedRide(ride);
    setBidPrice(ride.price);
  };

  // Handle place bid
  const handlePlaceBid = async () => {
    if (!selectedRide) return;

    if (bidPrice <= 0) {
      toast.error('Please enter a valid bid price');
      return;
    }

    setIsPlacingBid(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/taxi/rides/bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rideId: selectedRide.id,
          bidPrice: bidPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bid');
      }

      toast.success('Bid placed successfully! Waiting for user to accept...');
      setSelectedRide(null);
      setBidPrice(0);
      // Refresh to update lists
      fetchPendingRides();
      fetchPendingBids();
      fetchAcceptedRides();
    } catch (error: any) {
      console.error('Error placing bid:', error);
      toast.error(error.message || 'Failed to place bid');
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Handle call user
  const handleCallUser = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Handle get directions
  const handleGetDirections = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Handle start ride
  const handleStartRide = async (rideId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/driver/taxi/rides/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rideId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start ride');
      }

      toast.success('Ride started!');
      // Refresh accepted rides
      fetchAcceptedRides();
    } catch (error: any) {
      console.error('Error starting ride:', error);
      toast.error(error.message || 'Failed to start ride');
    }
  };

  // Handle end ride
  const handleEndRide = async (rideId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/driver/taxi/rides/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rideId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end ride');
      }

      toast.success('Ride completed!');
      // Refresh accepted rides (will remove from list since it's now completed)
      fetchAcceptedRides();
    } catch (error: any) {
      console.error('Error ending ride:', error);
      toast.error(error.message || 'Failed to end ride');
    }
  };

  if (loadingDriver) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!driver) {
    return null; // Will redirect to registration
  }

  // Show verification pending message if not verified
  if (!driver.isVerified) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold text-white">Hi Driver</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/settings')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const { clearUserMode } = require('@/lib/user-mode');
                  clearUserMode();
                  router.push('/dashboard');
                }}
                className="bg-nexryde-yellow/20 hover:bg-nexryde-yellow/30 text-nexryde-yellow border border-nexryde-yellow/30 px-4 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Switch to User</span>
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Verification Pending Message */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 text-center"
          >
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-white font-semibold text-xl mb-3">Waiting for Verification</h2>
            <p className="text-white/70 mb-2">
              Your driver registration documents have been submitted and are currently under review.
            </p>
            <p className="text-white/60 text-sm mb-6">
              Verification may take a few hours. You will be able to start accepting rides once your documents are approved by our admin team.
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-white/80 text-sm font-medium mb-2">Documents Submitted:</p>
              <div className="space-y-2 text-left">
                <div className="flex items-center space-x-2 text-white/70 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Driver License: {driver.licenseNumber}</span>
                </div>
                <div className="flex items-center space-x-2 text-white/70 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Car Registration: {driver.carRegistration}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Back to Settings
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* <h1 className="text-2xl font-bold text-white">Driver</h1> */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/driver/taxi/history')}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>History</span>
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const { clearUserMode } = require('@/lib/user-mode');
                  clearUserMode();
                  router.push('/dashboard');
                }}
                className="bg-nexryde-yellow/20 hover:bg-nexryde-yellow/30 text-nexryde-yellow border border-nexryde-yellow/30 px-4 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Switch to User</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Location Status */}
          {locationError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
              <p className="text-red-400 text-sm">{locationError}</p>
            </div>
          )}

          {/* Driver Info */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg mb-2">Driver Profile</h2>
                <div className="space-y-2 text-white/70 text-sm">
                  <p>License: {driver.licenseNumber}</p>
                  <p>Car Registration: {driver.carRegistration}</p>
                  {/* Rating Display */}
                  {driver.averageRating !== undefined && driver.totalRatings !== undefined && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-semibold">
                          {driver.averageRating > 0 ? driver.averageRating.toFixed(1) : '0.0'}
                        </span>
                      </div>
                      <span className="text-white/50 text-xs">
                        ({driver.totalRatings} {driver.totalRatings === 1 ? 'rating' : 'ratings'})
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
            
            {/* Online/Offline Toggle */}
            <div className="pt-4 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Power className={`w-5 h-5 ${driver.isOnline ? 'text-green-400' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-white font-medium">Status</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${driver.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <span className="text-white/70 text-sm">{driver.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleOnlineStatus}
                  disabled={isTogglingOnline}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    driver.isOnline ? 'bg-nexryde-yellow' : 'bg-gray-600'
                  } ${isTogglingOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      driver.isOnline ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {!driver.isOnline && (
                <p className="text-white/60 text-xs mt-3">
                  Turn on to start receiving ride requests
                </p>
              )}
            </div>
          </div>

          {/* Pending Rides */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Pending Rides (Within 5km)</h2>
              <button
                onClick={fetchPendingRides}
                disabled={loadingRides}
                className="text-nexryde-yellow hover:text-nexryde-yellow-dark text-sm font-medium disabled:opacity-50"
              >
                {loadingRides ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingRides ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                <p className="text-white/70 text-sm">Loading rides...</p>
              </div>
            ) : pendingRides.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No pending rides within 5km</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRides.map((ride, index) => (
                  <motion.div
                    key={ride.id || `pending-ride-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedRide?.id === ride.id
                        ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                    onClick={() => handleSelectRide(ride)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white font-medium text-sm">
                            {ride.pickupAddress}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm">
                            {ride.destinationAddress}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <span>Distance: {ride.distance.toFixed(1)} km</span>
                          <span>•</span>
                          <span>{ride.distanceFromDriver.toFixed(1)} km away</span>
                          {ride.isRoundTrip && <span>• Round Trip</span>}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-nexryde-yellow font-bold text-lg">
                          ${ride.price.toFixed(2)}
                        </p>
                        <p className="text-white/60 text-xs">Original Price</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Bids Section */}
          {pendingBids.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h2 className="text-white font-semibold text-lg mb-4">My Pending Bids</h2>
              <div className="space-y-4">
                {pendingBids.map((bid, index) => (
                  <motion.div
                    key={bid.id || `pending-bid-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white font-medium text-sm">{bid.rideRequest.pickupAddress}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm">{bid.rideRequest.destinationAddress}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <span>Passenger: {bid.rideRequest.user.fullName}</span>
                          <span>•</span>
                          <span>Distance: {bid.rideRequest.distance.toFixed(1)} km</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium mb-2">
                          <Clock className="w-3 h-3" />
                          <span>Waiting</span>
                        </div>
                        <p className="text-nexryde-yellow font-bold text-lg">${bid.bidPrice.toFixed(2)}</p>
                        <p className="text-white/60 text-xs">Your Bid</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Rides Section */}
          {acceptedRides.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h2 className="text-white font-semibold text-lg mb-4">Accepted Rides</h2>
              <div className="space-y-4">
                {acceptedRides.map((ride, index) => (
                  <motion.div
                    key={ride.id || `accepted-ride-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 rounded-xl p-4 border border-green-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white font-medium text-sm">{ride.pickupAddress}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm">{ride.destinationAddress}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <span>Passenger: {ride.user.fullName}</span>
                          <span>•</span>
                          <span>Distance: {ride.distance.toFixed(1)} km</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium mb-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>{ride.status === 'in_progress' ? 'In Progress' : 'Accepted'}</span>
                        </div>
                        <p className="text-nexryde-yellow font-bold text-lg">${(ride.finalPrice || ride.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-white/20">
                      {ride.status === 'accepted' && (
                        <button
                          onClick={() => handleStartRide(ride.id)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span>Start Ride</span>
                        </button>
                      )}
                      {ride.status === 'in_progress' && (
                        <button
                          onClick={() => handleEndRide(ride.id)}
                          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <XCircle className="w-5 h-5" />
                          <span>End Ride</span>
                        </button>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleGetDirections(ride.pickupLat, ride.pickupLng)}
                          className="flex-1 bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <Navigation className="w-4 h-4" />
                          <span>Pick up Location</span>
                        </button>
                        <button
                          onClick={() => handleGetDirections(ride.destinationLat, ride.destinationLng)}
                          className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Destination Location</span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleCallUser(ride.user.phone)}
                        className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Passenger</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Place Bid Modal */}
          {selectedRide && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <h3 className="text-white font-semibold text-lg mb-4">Place Bid</h3>
              
              <div className="space-y-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/70 text-xs mb-1">Passenger</p>
                  <p className="text-white font-medium">{selectedRide.user.fullName}</p>
                  <p className="text-white/60 text-sm">{selectedRide.user.phone}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/70 text-xs mb-1">Route</p>
                  <p className="text-white text-sm mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {selectedRide.pickupAddress}
                  </p>
                  <p className="text-white text-sm">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {selectedRide.destinationAddress}
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/70 text-xs mb-2">Set Your Price</p>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setBidPrice(Math.max(0, bidPrice - 1))}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <div className="flex-1 text-center">
                      <p className="text-nexryde-yellow font-bold text-2xl">${bidPrice.toFixed(2)}</p>
                      <p className="text-white/60 text-xs">
                        Original: ${selectedRide.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => setBidPrice(bidPrice + 1)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedRide(null);
                    setBidPrice(0);
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceBid}
                  disabled={isPlacingBid}
                  className="flex-1 bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-3 px-6 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isPlacingBid ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Placing Bid...</span>
                    </>
                  ) : (
                    <span>Place Bid</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
