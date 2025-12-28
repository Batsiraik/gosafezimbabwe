'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wrench, MapPin, DollarSign, Clock, CheckCircle, Loader2, Plus, Minus, Calendar, XCircle, Settings, User, Phone, Star, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { getServiceIcon } from '@/lib/utils/service-icons';
import { initializePushNotifications, setupPushNotificationListeners } from '@/lib/push-notifications';

interface PendingRequest {
  id: string;
  serviceId: string;
  jobDescription: string;
  budget: number;
  location: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    iconName: string;
  };
}

interface ProviderProfile {
  id: string;
  isVerified: boolean;
  averageRating?: number;
  totalRatings?: number;
  services: Array<{
    id: string;
    name: string;
    iconName: string;
  }>;
}

interface PendingBid {
  id: string;
  bidPrice: number;
  message: string | null;
  status: string;
  createdAt: string;
  serviceRequest: {
    id: string;
    jobDescription: string;
    budget: number;
    location: string;
    status: string;
    user: {
      id: string;
      fullName: string;
      phone: string;
    };
    service: {
      id: string;
      name: string;
      iconName: string;
    };
  };
}

interface AcceptedRequest {
  id: string;
  jobDescription: string;
  budget: number;
  finalPrice: number | null;
  location: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    iconName: string;
  };
}

export default function HomeServiceProviderDashboardPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [bidMessage, setBidMessage] = useState<string>('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [pendingBids, setPendingBids] = useState<PendingBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptedRequests, setAcceptedRequests] = useState<AcceptedRequest[]>([]);

  // Check provider status
  const checkProviderStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/home-services/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.provider) {
          setProvider(data.provider);
        } else {
          router.push('/driver/home-services/register');
          return;
        }
      } else if (response.status === 401) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error checking provider status:', error);
    } finally {
      setLoadingProvider(false);
    }
  }, [router]);

  useEffect(() => {
    checkProviderStatus();
    // Set user mode to home-services when this dashboard loads
    const { setUserMode } = require('@/lib/user-mode');
    setUserMode('home-services');
  }, [checkProviderStatus]);

  // Initialize push notifications for home service providers
  useEffect(() => {
    if (typeof window !== 'undefined' && provider) {
      console.log('[HOME SERVICES] Initializing push notifications...');
      
      initializePushNotifications().then((token) => {
        if (token) {
          console.log('[HOME SERVICES] Push notification token received:', token);
        }
      });

      setupPushNotificationListeners(
        async (token) => {
          console.log('[HOME SERVICES] [PUSH TOKEN] Received token:', token);
          
          if (!token.value || token.value.length < 50) {
            console.error('[HOME SERVICES] [PUSH TOKEN] ❌ Invalid token');
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
                console.log('[HOME SERVICES] [PUSH TOKEN] ✅ Token stored successfully');
              } else {
                console.error('[HOME SERVICES] [PUSH TOKEN] ❌ Failed to store token');
              }
            }
          } catch (error) {
            console.error('[HOME SERVICES] [PUSH TOKEN] ❌ Error:', error);
          }
        },
        (notification) => {
          toast(notification.title || 'New notification', { icon: '🔔', duration: 4000 });
          // Refresh pending requests when notification received
          if (provider?.isVerified) {
            fetchPendingRequests();
          }
        },
        (action) => {
          // Handle notification click - refresh requests
          console.log('[HOME SERVICES] Notification tapped:', action);
          if (provider?.isVerified) {
            fetchPendingRequests();
            toast.success('Refreshing service requests...');
          }
        }
      );
    }
  }, [provider, fetchPendingRequests]);

  // Redirect to registration if no provider profile exists
  if (!loadingProvider && !provider) {
    return null; // Will redirect
  }

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    if (!provider || !provider.isVerified) {
      setPendingRequests([]);
      return;
    }

    try {
      setLoadingRequests(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/home-services/requests/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('Failed to load pending requests');
    } finally {
      setLoadingRequests(false);
    }
  }, [provider]);

  // Fetch pending bids
  const fetchPendingBids = useCallback(async () => {
    if (!provider || !provider.isVerified) return;

    try {
      setLoadingBids(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/home-services/bids/pending', {
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
  }, [provider]);

  // Fetch accepted requests
  const fetchAcceptedRequests = useCallback(async () => {
    if (!provider || !provider.isVerified) return;

    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/home-services/requests/accepted', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAcceptedRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching accepted requests:', error);
    }
  }, [provider]);

  // Handle request selection
  const handleSelectRequest = (request: PendingRequest) => {
    setSelectedRequest(request);
    setBidPrice(request.budget); // Start with user's budget
    setBidMessage('');
  };

  // Handle place bid
  const handlePlaceBid = async () => {
    if (!selectedRequest) return;

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

      const response = await fetch('/api/driver/home-services/requests/bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          bidPrice,
          message: bidMessage.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bid');
      }

      toast.success('Bid placed successfully!');
      setSelectedRequest(null);
      fetchPendingRequests();
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

  const handleStartJob = async (requestId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/services/requests/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start service');
      }

      toast.success('Service started!');
      // Refresh accepted requests to update status
      fetchAcceptedRequests();
    } catch (error: any) {
      console.error('Error starting service:', error);
      toast.error(error.message || 'Failed to start service');
    }
  };

  const handleCompleteJob = async (requestId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/services/requests/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete service');
      }

      toast.success('Service marked as completed! It has been moved to history.');
      // Refresh accepted requests (completed ones will be removed)
      fetchAcceptedRequests();
    } catch (error: any) {
      console.error('Error completing service:', error);
      toast.error(error.message || 'Failed to complete service');
    }
  };

  // Fetch data when provider is verified
  useEffect(() => {
    if (provider && provider.isVerified) {
      fetchPendingRequests();
      fetchPendingBids();
      fetchAcceptedRequests();
      // Poll for new requests, bids, and updates every 5 seconds
      const interval = setInterval(() => {
        fetchPendingRequests();
        fetchPendingBids();
        fetchAcceptedRequests();
      }, 5000);
      return () => clearInterval(interval);
    } else {
      // Clear requests if not verified
      setPendingRequests([]);
      setPendingBids([]);
    }
  }, [provider, fetchPendingRequests, fetchPendingBids, fetchAcceptedRequests]);

  if (loadingProvider) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  // Show pending verification message
  if (!provider.isVerified) {
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
                <h1 className="text-2xl font-bold text-white">Service Provider Dashboard</h1>
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
              Your service provider registration documents have been submitted and are currently under review.
            </p>
            <p className="text-white/60 text-sm mb-6">
              Verification may take a few hours. You will be able to start accepting service requests once your documents are approved by our admin team.
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-white/80 text-sm font-medium mb-3">Services You Selected:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {provider.services.map((service) => (
                  <span key={service.id} className="px-3 py-1 bg-nexryde-yellow/20 text-nexryde-yellow rounded-full text-sm">
                    {service.name}
                  </span>
                ))}
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
                onClick={() => router.push('/driver/home-services/history')}
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
          {/* Provider Info */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg mb-2">Service Provider Profile</h2>
                <div className="space-y-2 text-white/70 text-sm">
                  <p>Services: {provider.services.map(s => s.name).join(', ')}</p>
                  {/* Rating Display */}
                  {provider.averageRating !== undefined && provider.totalRatings !== undefined && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-semibold">
                          {provider.averageRating > 0 ? provider.averageRating.toFixed(1) : '0.0'}
                        </span>
                      </div>
                      <span className="text-white/50 text-xs">
                        ({provider.totalRatings} {provider.totalRatings === 1 ? 'rating' : 'ratings'})
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
          </div>

          {/* Pending Requests */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Pending Service Requests</h2>
              <button
                onClick={fetchPendingRequests}
                disabled={loadingRequests}
                className="text-nexryde-yellow hover:text-nexryde-yellow-dark text-sm font-medium disabled:opacity-50"
              >
                {loadingRequests ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingRequests ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                <p className="text-white/70 text-sm">Loading requests...</p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No pending service requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request, index) => (
                  <motion.div
                    key={request.id || `pending-request-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedRequest?.id === request.id
                        ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                    onClick={() => handleSelectRequest(request)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-nexryde-yellow/20 rounded-lg">
                            {getServiceIcon(request.service.iconName, 'w-5 h-5 text-nexryde-yellow')}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{request.service.name}</p>
                            <p className="text-white/60 text-xs">Customer: {request.user.fullName}</p>
                          </div>
                        </div>
                        <p className="text-white/70 text-sm mb-2">{request.jobDescription}</p>
                        <div className="flex items-center space-x-4 text-white/60 text-xs">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{request.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Budget: ${request.budget.toFixed(2)}</span>
                          </div>
                        </div>
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
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-nexryde-yellow/20 rounded-lg">
                            {getServiceIcon(bid.serviceRequest.service.iconName, 'w-5 h-5 text-nexryde-yellow')}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{bid.serviceRequest.service.name}</p>
                            <p className="text-white/60 text-xs">Customer: {bid.serviceRequest.user.fullName}</p>
                          </div>
                        </div>
                        <p className="text-white/70 text-sm mb-2">{bid.serviceRequest.jobDescription}</p>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{bid.serviceRequest.location}</span>
                          </div>
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

          {/* Accepted Requests Section */}
          {acceptedRequests.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h2 className="text-white font-semibold text-lg mb-4">Accepted Requests</h2>
              <div className="space-y-4">
                {acceptedRequests.map((request, index) => (
                  <motion.div
                    key={request.id || `accepted-request-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 rounded-xl p-4 border border-green-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-nexryde-yellow/20 rounded-lg">
                            {getServiceIcon(request.service.iconName, 'w-5 h-5 text-nexryde-yellow')}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{request.service.name}</p>
                            <p className="text-white/60 text-xs">Customer: {request.user.fullName}</p>
                          </div>
                        </div>
                        <p className="text-white/70 text-sm mb-2">{request.jobDescription}</p>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{request.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium mb-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>{request.status === 'in_progress' ? 'In Progress' : 'Accepted'}</span>
                        </div>
                        <p className="text-nexryde-yellow font-bold text-lg">${(request.finalPrice || request.budget || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleCallUser(request.user.phone)}
                        className="w-full md:flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Customer</span>
                      </button>
                      
                      {/* Start Job button - only show if status is accepted */}
                      {request.status === 'accepted' && (
                        <button
                          onClick={() => handleStartJob(request.id)}
                          className="w-full md:flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Start Job</span>
                        </button>
                      )}
                      
                      {/* Job Done button - show if status is accepted or in_progress */}
                      {(request.status === 'accepted' || request.status === 'in_progress') && (
                        <button
                          onClick={() => handleCompleteJob(request.id)}
                          className="w-full md:flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Job Done</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Place Bid Modal */}
          {selectedRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedRequest(null)}
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
                    <p className="text-white/70 text-sm mb-2">Customer Budget: ${selectedRequest.budget.toFixed(2)}</p>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setBidPrice(Math.max(0.01, bidPrice - 1))}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-white" />
                      </button>
                      <div className="flex-1 text-center">
                        <p className="text-white/70 text-xs mb-1">Your Bid</p>
                        <p className="text-nexryde-yellow font-bold text-2xl">${bidPrice.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => setBidPrice(bidPrice + 1)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white/70 text-sm mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={bidMessage}
                      onChange={(e) => setBidMessage(e.target.value)}
                      placeholder="Add a message to your bid..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedRequest(null)}
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
