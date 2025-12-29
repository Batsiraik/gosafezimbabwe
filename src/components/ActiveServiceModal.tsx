'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, DollarSign, FileText, Loader2, Phone, CheckCircle, Star, MessageSquare, Clock, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { getServiceIcon } from '@/lib/utils/service-icons';
import RatingModal from './RatingModal';

interface Service {
  id: string;
  name: string;
  iconName: string;
  isActive: boolean;
}

interface ActiveServiceRequest {
  id: string;
  serviceId: string;
  jobDescription: string;
  budget: number;
  price?: number; // Final price after bid acceptance (from finalPrice in DB)
  originalPrice?: number; // Original budget (same as budget)
  location: string;
  status: string;
  createdAt: string;
  service: Service;
  user?: {
    id: string;
    fullName: string;
    phone: string;
  };
  provider?: {
    id: string;
    userId: string;
    fullName: string;
    phone: string;
  } | null;
}

interface Bid {
  id: string;
  bidPrice: number;
  message: string | null;
  status: string;
  createdAt: string;
  serviceProvider: {
    id: string;
    averageRating?: number;
    totalRatings?: number;
    user: {
      id: string;
      fullName: string;
      phone: string;
    };
  };
}

interface ActiveServiceModalProps {
  activeRequest: ActiveServiceRequest;
  onClose: () => void;
  onCancel: () => void;
}

export default function ActiveServiceModal({ activeRequest, onClose, onCancel }: ActiveServiceModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [dots, setDots] = useState('');
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [checkingRating, setCheckingRating] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);

  // Fetch bids when status is bid_received
  const fetchBids = useCallback(async () => {
    if (!activeRequest) {
      setBids([]);
      return;
    }

    // Only fetch if status is bid_received
    if (activeRequest.status !== 'bid_received') {
      setBids([]);
      return;
    }

    try {
      setLoadingBids(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch(`/api/services/requests/bids?requestId=${activeRequest.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedBids = data.bids || [];
        setBids(fetchedBids);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ActiveServiceModal] Fetched ${fetchedBids.length} bids for request ${activeRequest.id}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch bids:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching bids:', error);
    } finally {
      setLoadingBids(false);
    }
  }, [activeRequest]);

  useEffect(() => {
    if (activeRequest?.status === 'bid_received') {
      // Fetch immediately when status changes to bid_received
      fetchBids();
      // Poll for new bids every 10 seconds when status is bid_received
      const interval = setInterval(() => {
        fetchBids();
      }, 10000);
      return () => clearInterval(interval);
    } else {
      // Clear bids if status is not bid_received
      setBids([]);
    }
  }, [activeRequest?.status, activeRequest?.id, fetchBids]);

  // Check if user has already rated this service request
  const checkIfRated = useCallback(async () => {
    if (!activeRequest || !activeRequest.provider || activeRequest.status !== 'completed') {
      setHasRated(false);
      return;
    }

    try {
      setCheckingRating(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      // Check if rating exists for this service request
      const response = await fetch(`/api/services/requests/rate/check?requestId=${activeRequest.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasRated(data.hasRated || false);
      }
    } catch (error) {
      console.error('Error checking rating:', error);
    } finally {
      setCheckingRating(false);
    }
  }, [activeRequest]);

  useEffect(() => {
    checkIfRated();
  }, [checkIfRated]);

  // Animate dots for searching status
  useEffect(() => {
    if (activeRequest?.status === 'searching') {
      const interval = setInterval(() => {
        setDots((prev) => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [activeRequest?.status]);

  const handleCallProvider = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleStartJob = async () => {
    if (!activeRequest) return;

    setIsStartingJob(true);
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
        body: JSON.stringify({
          requestId: activeRequest.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start service');
      }

      toast.success('Service started!');
      onCancel(); // Refresh the request status
    } catch (error: any) {
      console.error('Error starting service:', error);
      toast.error(error.message || 'Failed to start service');
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!activeRequest) return;

    setIsCompletingJob(true);
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
        body: JSON.stringify({
          requestId: activeRequest.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete service');
      }

      toast.success('Service marked as completed!');
      onCancel(); // Refresh the request status
    } catch (error: any) {
      console.error('Error completing service:', error);
      toast.error(error.message || 'Failed to complete service');
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBid(bidId);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/services/requests/bids/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bidId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept bid');
      }

      toast.success('Provider selected! They will contact you soon.');
      onCancel(); // Refresh the request status
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      toast.error(error.message || 'Failed to accept bid');
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleCancel = async () => {
    if (!activeRequest) return;
    
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in again');
        return;
      }

      const response = await fetch('/api/services/requests/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: activeRequest.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel service request');
        return;
      }

      toast.success('Service request cancelled successfully');
      onCancel();
    } catch (error) {
      console.error('Cancel service request error:', error);
      toast.error('Failed to cancel service request');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusMessage = () => {
    switch (activeRequest?.status) {
      case 'searching':
        return `Searching for service providers${dots}`;
      case 'bid_received':
        return 'Service providers have placed bids';
      case 'pending':
        return 'Waiting for service provider to accept';
      case 'accepted':
        return 'Service provider is on the way';
      case 'in_progress':
        return 'Service in progress';
      case 'completed':
        return 'Service completed';
      default:
        return 'Processing your request';
    }
  };

  const getStatusColor = () => {
    switch (activeRequest?.status) {
      case 'searching':
        return 'text-yellow-400';
      case 'bid_received':
        return 'text-yellow-400';
      case 'pending':
        return 'text-yellow-400';
      case 'accepted':
        return 'text-blue-400';
      case 'in_progress':
        return 'text-green-400';
      case 'completed':
        return 'text-green-400';
      default:
        return 'text-white/70';
    }
  };

  if (!activeRequest) return null;

  return (
    <AnimatePresence>
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Active Service Request</h2>
              {/* Remove close button - modal should not be closable when there's an active request */}
            </div>

          {/* Search Animation */}
          {activeRequest.status === 'searching' && (
            <div className="mb-6 flex flex-col items-center justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"
              />
              <p className="text-yellow-400 font-semibold text-lg">
                {getStatusMessage()}
              </p>
            </div>
          )}

          {/* Service Info */}
          <div className="space-y-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                  {getServiceIcon(activeRequest.service.iconName, "w-5 h-5 text-nexryde-yellow")}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{activeRequest.service.name}</h3>
                  <p className={`text-sm font-medium ${getStatusColor()}`}>
                    {getStatusMessage()}
                  </p>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-white/70 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white/70 text-xs mb-1">Job Description</p>
                  <p className="text-white text-sm">{activeRequest.jobDescription}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-white/70 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white/70 text-xs mb-1">Location</p>
                  <p className="text-white text-sm">{activeRequest.location}</p>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <DollarSign className="w-5 h-5 text-white/70 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white/70 text-xs mb-1">Price</p>
                  <p className="text-nexryde-yellow text-lg font-bold">
                    ${(activeRequest.price || activeRequest.budget).toLocaleString()}
                  </p>
                  {activeRequest.originalPrice && activeRequest.originalPrice !== activeRequest.price && (
                    <p className="text-white/50 text-xs line-through mt-1">
                      Original Budget: ${activeRequest.originalPrice.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Provider Bids Section */}
          {activeRequest.status === 'bid_received' && (
            <div className="mb-6">
              <h3 className="text-white font-semibold text-lg mb-4">
                Provider Bids ({bids.length})
              </h3>
              
              {loadingBids ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                  <p className="text-white/70 text-sm">Loading bids...</p>
                </div>
              ) : bids.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl">
                  <Wrench className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/70">No bids yet</p>
                  <p className="text-white/50 text-sm mt-2">Providers are reviewing your request...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bids.map((bid, index) => (
                    <motion.div
                      key={bid.id || `bid-${index}-${bid.serviceProvider?.id || index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-nexryde-yellow/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                              {getServiceIcon(activeRequest.service.iconName, 'w-5 h-5 text-nexryde-yellow')}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-white font-semibold">{bid.serviceProvider.user.fullName}</p>
                                {bid.serviceProvider.averageRating !== undefined && bid.serviceProvider.averageRating > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-yellow-400 text-xs font-medium">
                                      {bid.serviceProvider.averageRating.toFixed(1)}
                                    </span>
                                    {bid.serviceProvider.totalRatings !== undefined && bid.serviceProvider.totalRatings > 0 && (
                                      <span className="text-white/50 text-xs">
                                        ({bid.serviceProvider.totalRatings})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {bid.message && (
                            <div className="bg-white/5 rounded-lg p-3 mt-2">
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="w-4 h-4 text-white/70 mt-0.5 flex-shrink-0" />
                                <p className="text-white/80 text-sm">{bid.message}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-nexryde-yellow font-bold text-2xl">${bid.bidPrice.toFixed(2)}</p>
                          <p className="text-white/60 text-xs">Bid Price</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-4 border-t border-white/10">
                        <button
                          onClick={() => handleCallProvider(bid.serviceProvider.user.phone)}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Call Provider</span>
                        </button>
                        <button
                          onClick={() => handleAcceptBid(bid.id)}
                          disabled={acceptingBid === bid.id || acceptingBid !== null}
                          className="flex-1 bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-2 px-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {acceptingBid === bid.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Accepting...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>Accept This Provider</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Provider Details - Show when request is accepted */}
          {(activeRequest.status === 'accepted' || activeRequest.status === 'in_progress') && activeRequest.provider && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <h3 className="text-white font-semibold text-lg mb-4">Your Service Provider</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                    {getServiceIcon(activeRequest.service.iconName, 'w-6 h-6 text-nexryde-yellow')}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{activeRequest.provider.fullName}</p>
                    <p className="text-white/60 text-xs">Service Provider</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-white/10">
                  <p className="text-white/70 text-xs mb-1">Agreed Price</p>
                  <p className="text-nexryde-yellow font-bold text-2xl">${(activeRequest.price || activeRequest.budget).toLocaleString()}</p>
                  {activeRequest.originalPrice && activeRequest.originalPrice !== activeRequest.price && (
                    <p className="text-white/50 text-xs line-through mt-1">
                      Original Budget: ${activeRequest.originalPrice.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleCallProvider(activeRequest.provider!.phone)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Call Provider</span>
                  </button>
                  
                  {/* Job Done button for customer */}
                  <button
                    onClick={handleCompleteJob}
                    disabled={isCompletingJob}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isCompletingJob ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Job Done</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rating Section - Show after service is completed */}
          {activeRequest.status === 'completed' && activeRequest.provider && !hasRated && (
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-white font-semibold mb-2">Rate Your Provider</p>
              <p className="text-white/70 text-sm mb-4">How was your experience with {activeRequest.provider.fullName}?</p>
              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Star className="w-5 h-5" />
                <span>Rate Provider</span>
              </button>
            </div>
          )}

          {/* Cancel Button */}
          {activeRequest.status !== 'cancelled' && activeRequest.status !== 'completed' && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Cancel Request</span>
              )}
            </button>
          )}
        
        {/* Rating Modal */}
        {activeRequest.provider && (
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            serviceRequestId={activeRequest.id}
            rateeId={activeRequest.provider.userId}
            rateeName={activeRequest.provider.fullName}
            raterType="customer"
            rateeType="provider"
            onRatingSubmitted={() => {
              setHasRated(true);
              setTimeout(() => {
                onClose();
                onCancel();
              }, 1000);
            }}
          />
        )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
