'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bike, MapPin, DollarSign, Clock, CheckCircle, Loader2, Plus, Minus, Navigation, Calendar, XCircle, Settings, User, Power, Phone, ExternalLink, Star, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccurateLocation } from '@/lib/utils/geolocation';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '@/lib/background-location';
import { initializePushNotifications, setupPushNotificationListeners } from '@/lib/push-notifications';

interface PendingParcel {
  id: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  distance: number;
  price: number;
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
  carRegistration: string; // This is bike registration for parcel drivers
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
  parcelRequest: {
    id: string;
    pickupAddress: string;
    deliveryAddress: string;
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

export default function ParcelDriverDashboardPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loadingDriver, setLoadingDriver] = useState(true);
  const [pendingParcels, setPendingParcels] = useState<PendingParcel[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<PendingParcel | null>(null);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [pendingBids, setPendingBids] = useState<PendingBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptedParcels, setAcceptedParcels] = useState<any[]>([]);

  // Check driver status
  const checkDriverStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/parcel/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.driver) {
          setDriver(data.driver);
        } else {
          router.push('/driver/parcel/register');
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
    // Set user mode to parcel when this dashboard loads
    const { setUserMode } = require('@/lib/user-mode');
    setUserMode('parcel');
  }, [checkDriverStatus]);

  // Initialize push notifications for parcel drivers
  useEffect(() => {
    if (typeof window !== 'undefined' && driver) {
      console.log('[PARCEL DRIVER] Initializing push notifications...');
      
      initializePushNotifications().then((token) => {
        if (token) {
          console.log('[PARCEL DRIVER] Push notification token received:', token);
        }
      });

      setupPushNotificationListeners(
        async (token) => {
          console.log('[PARCEL DRIVER] [PUSH TOKEN] Received token:', token);
          
          if (!token.value || token.value.length < 50) {
            console.error('[PARCEL DRIVER] [PUSH TOKEN] ❌ Invalid token');
            return;
          }
          
          try {
            const authToken = localStorage.getItem('nexryde_token');
            if (authToken) {
              const response = await fetch('/api/users/push-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ pushToken: token.value }),
              });
              
              if (response.ok) {
                console.log('[PARCEL DRIVER] [PUSH TOKEN] ✅ Token stored successfully');
                toast.success('Notifications enabled!');
              } else {
                console.error('[PARCEL DRIVER] [PUSH TOKEN] ❌ Failed to store token');
              }
            }
          } catch (error) {
            console.error('[PARCEL DRIVER] [PUSH TOKEN] ❌ Error:', error);
          }
        },
        (notification) => {
          toast(notification.title || 'New notification', { icon: '🔔', duration: 4000 });
          // Refresh pending parcels when notification received
          if (driver?.isOnline) {
            fetchPendingParcels();
          }
        },
        (action) => {
          // Handle notification click - refresh parcels
          console.log('[PARCEL DRIVER] Notification tapped:', action);
          if (driver?.isOnline) {
            fetchPendingParcels();
            toast.success('Refreshing parcel requests...');
          }
        }
      );
    }
  }, [driver, fetchPendingParcels]);

  // Redirect to registration if no driver profile exists
  if (!loadingDriver && !driver) {
    return null; // Will redirect
  }

  // Fetch pending parcels
  const fetchPendingParcels = useCallback(async () => {
    if (!driver || !driver.isVerified || !driver.isOnline) {
      setPendingParcels([]);
      return;
    }

    try {
      setLoadingParcels(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/parcel/parcels/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const parcels = data.parcels || [];
        setPendingParcels(parcels);
        // Clear location error if parcels were fetched successfully
        if (parcels.length > 0) {
          setLocationError(null);
        }
        // Log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Parcel Driver Dashboard] Fetched ${parcels.length} pending parcels`);
        }
      } else if (response.status === 400) {
        const data = await response.json();
        // Only set error if it's about location, not if it's just no parcels
        if (data.error && data.error.includes('location')) {
          setLocationError(data.error);
        } else {
          setPendingParcels([]);
        }
      } else {
        setPendingParcels([]);
      }
    } catch (error) {
      console.error('Error fetching pending parcels:', error);
      // Don't show toast on every error - might be location not ready yet
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load pending parcels - location may not be ready');
      }
    } finally {
      setLoadingParcels(false);
    }
  }, [driver]);

  // Fetch pending bids
  const fetchPendingBids = useCallback(async () => {
    if (!driver || !driver.isVerified) return;

    try {
      setLoadingBids(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/parcel/bids/pending', {
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

  // Fetch accepted parcels
  const fetchAcceptedParcels = useCallback(async () => {
    if (!driver || !driver.isVerified) return;

    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/parcel/parcels/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const accepted = (data.parcels || []).filter((parcel: any) => 
          (parcel.status === 'accepted' || parcel.status === 'in_progress') && parcel.driverId === driver.id
        );
        setAcceptedParcels(accepted);
      }
    } catch (error) {
      console.error('Error fetching accepted parcels:', error);
    }
  }, [driver]);

  // Update driver location - defined inside useEffect to avoid closure issues

  // Toggle online status
  const toggleOnlineStatus = useCallback(async () => {
    if (!driver || !driver.isVerified) {
      toast.error('You must be verified to go online');
      return;
    }

    setIsTogglingOnline(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/driver/parcel/online-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          isOnline: !driver.isOnline,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update online status');
      }

      setDriver((prev) => {
        if (!prev) return null;
        return { ...prev, isOnline: !prev.isOnline };
      });
      
      if (!driver.isOnline) {
        toast.success('You are now online!');
        // Location tracking will start automatically via useEffect
        // Fetch pending parcels
        fetchPendingParcels();
      } else {
        toast.success('You are now offline');
        // Clear pending parcels and bids when going offline
        setPendingParcels([]);
        setPendingBids([]);
      }
    } catch (error: any) {
      console.error('Error toggling online status:', error);
      toast.error(error.message || 'Failed to update online status');
    } finally {
      setIsTogglingOnline(false);
    }
  }, [driver, fetchPendingParcels]);

  // Handle parcel selection
  const handleSelectParcel = (parcel: PendingParcel) => {
    setSelectedParcel(parcel);
    setBidPrice(parcel.price);
  };

  // Handle place bid
  const handlePlaceBid = async () => {
    if (!selectedParcel) return;

    if (bidPrice <= 0) {
      toast.error('Please enter a valid bid price');
      return;
    }

    setIsPlacingBid(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/driver/parcel/parcels/bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          parcelId: selectedParcel.id,
          bidPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bid');
      }

      toast.success('Bid placed successfully!');
      setSelectedParcel(null);
      fetchPendingParcels();
      fetchPendingBids();
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

  // Handle start delivery
  const handleStartDelivery = async (parcelId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/driver/parcel/parcels/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ parcelId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start delivery');
      }

      toast.success('Delivery started!');
      fetchAcceptedParcels();
    } catch (error: any) {
      console.error('Error starting delivery:', error);
      toast.error(error.message || 'Failed to start delivery');
    }
  };

  // Handle end delivery
  const handleEndDelivery = async (parcelId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/driver/parcel/parcels/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ parcelId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end delivery');
      }

      toast.success('Delivery completed!');
      fetchAcceptedParcels();
    } catch (error: any) {
      console.error('Error ending delivery:', error);
      toast.error(error.message || 'Failed to end delivery');
    }
  };

  // Background location tracking - continues even when app is closed/minimized
  useEffect(() => {
    if (!driver || !driver.isVerified || !driver.isOnline) {
      // Stop tracking if driver goes offline or is not verified
      stopBackgroundLocationTracking();
      return;
    }

    console.log('[PARCEL DRIVER] Starting background location tracking...');

    // Start background location tracking
    startBackgroundLocationTracking(
      async (lat, lng, accuracy) => {
        try {
          const token = localStorage.getItem('nexryde_token');
          if (!token) return;

          console.log(`[PARCEL DRIVER] Updating location: (${lat}, ${lng}), accuracy: ${accuracy}m`);

          const response = await fetch('/api/driver/parcel/location', {
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
            // Refresh pending parcels after location update
            fetchPendingParcels();
            console.log('[PARCEL DRIVER] ✅ Location updated successfully');
          } else {
            console.error('[PARCEL DRIVER] ❌ Failed to update location:', await response.text());
          }
        } catch (error) {
          console.error('[PARCEL DRIVER] ❌ Error updating location:', error);
        }
      },
      30000 // Update every 30 seconds
    ).catch((error) => {
      console.error('[PARCEL DRIVER] ❌ Failed to start background tracking:', error);
      setLocationError('Background location tracking unavailable. Using standard tracking.');
    });

    // Cleanup on unmount or when driver goes offline
    return () => {
      console.log('[PARCEL DRIVER] Stopping background location tracking...');
      stopBackgroundLocationTracking();
    };
  }, [driver?.isOnline, driver?.isVerified, fetchPendingParcels]);

  // Fetch data when driver is verified and online
  useEffect(() => {
    if (driver && driver.isVerified && driver.isOnline) {
      // Fetch immediately (location will be set by the location update useEffect)
      fetchPendingParcels();
      fetchPendingBids();
      fetchAcceptedParcels();
      // Poll for new parcels, bids, and updates every 5 seconds
      const interval = setInterval(() => {
        fetchPendingParcels();
        fetchPendingBids();
        fetchAcceptedParcels();
      }, 5000);
      return () => clearInterval(interval);
    } else {
      // Clear parcels if offline
      setPendingParcels([]);
      setPendingBids([]);
    }
  }, [driver, fetchPendingParcels, fetchPendingBids, fetchAcceptedParcels]);

  if (loadingDriver) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  // Show pending verification message
  if (!driver.isVerified) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker">
        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/settings')}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Settings className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-2xl font-bold text-white">Parcel Driver Dashboard</h1>
              </div>
            </div>
          </div>
        </div>

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
              Your parcel driver registration documents have been submitted and are currently under review.
            </p>
            <p className="text-white/60 text-sm mb-6">
              Verification may take a few hours. You will be able to start accepting parcel delivery requests once your documents are approved by our admin team.
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
                  <span>Bike Registration: {driver.carRegistration}</span>
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
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/driver/parcel/history')}
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
                  <p>Bike Registration: {driver.carRegistration}</p>
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
                  Turn on to start receiving parcel delivery requests
                </p>
              )}
            </div>
          </div>

          {/* Pending Parcels */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Pending Parcels (Within 5km)</h2>
              <button
                onClick={fetchPendingParcels}
                disabled={loadingParcels}
                className="text-nexryde-yellow hover:text-nexryde-yellow-dark text-sm font-medium disabled:opacity-50"
              >
                {loadingParcels ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingParcels ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                <p className="text-white/70 text-sm">Loading parcels...</p>
              </div>
            ) : pendingParcels.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No pending parcels within 5km</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingParcels.map((parcel, index) => (
                  <motion.div
                    key={parcel.id || `pending-parcel-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedParcel?.id === parcel.id
                        ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                    onClick={() => handleSelectParcel(parcel)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white font-medium text-sm">
                            {parcel.pickupAddress}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm">
                            {parcel.deliveryAddress}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <span>Distance: {parcel.distance.toFixed(1)} km</span>
                          <span>•</span>
                          <span>{parcel.distanceFromDriver.toFixed(1)} km away</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-nexryde-yellow font-bold text-lg">
                          ${parcel.price.toFixed(2)}
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
                          <span className="text-white font-medium text-sm">{bid.parcelRequest.pickupAddress}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm">{bid.parcelRequest.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <span>Customer: {bid.parcelRequest.user.fullName}</span>
                          <span>•</span>
                          <span>Distance: {bid.parcelRequest.distance.toFixed(1)} km</span>
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

          {/* Accepted Parcels Section */}
          {acceptedParcels.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h2 className="text-white font-semibold text-lg mb-4">Accepted Deliveries</h2>
              <div className="space-y-4">
                {acceptedParcels.map((parcel, index) => (
                  <motion.div
                    key={parcel.id || `accepted-parcel-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 rounded-xl p-4 border border-green-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white font-medium text-sm">{parcel.pickupAddress}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm">{parcel.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <span>Customer: {parcel.user.fullName}</span>
                          <span>•</span>
                          <span>Distance: {parcel.distance.toFixed(1)} km</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium mb-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>{parcel.status === 'in_progress' ? 'In Progress' : 'Accepted'}</span>
                        </div>
                        <p className="text-nexryde-yellow font-bold text-lg">${(parcel.finalPrice || parcel.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-white/20">
                      {parcel.status === 'accepted' && (
                        <button
                          onClick={() => handleStartDelivery(parcel.id)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span>Start Delivery</span>
                        </button>
                      )}
                      {parcel.status === 'in_progress' && (
                        <button
                          onClick={() => handleEndDelivery(parcel.id)}
                          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <XCircle className="w-5 h-5" />
                          <span>Complete Delivery</span>
                        </button>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleGetDirections(parcel.pickupLat, parcel.pickupLng)}
                          className="flex-1 bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <Navigation className="w-4 h-4" />
                          <span>Pickup Location</span>
                        </button>
                        <button
                          onClick={() => handleGetDirections(parcel.deliveryLat, parcel.deliveryLng)}
                          className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Delivery Location</span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleCallUser(parcel.user.phone)}
                        className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Customer</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Place Bid Modal */}
          {selectedParcel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedParcel(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-white font-semibold text-lg mb-4">Place Bid</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">Original Price: ${selectedParcel.price.toFixed(2)}</p>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setBidPrice(Math.max(0.01, bidPrice - 0.50))}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-white" />
                      </button>
                      <div className="flex-1 text-center">
                        <p className="text-white/70 text-xs mb-1">Your Bid</p>
                        <p className="text-nexryde-yellow font-bold text-2xl">${bidPrice.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => setBidPrice(bidPrice + 0.50)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedParcel(null)}
                      className="flex-1 bg-white/10 text-white py-2 px-4 rounded-xl font-semibold hover:bg-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePlaceBid}
                      disabled={isPlacingBid}
                      className="flex-1 bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-2 px-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPlacingBid ? 'Placing...' : 'Place Bid'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
