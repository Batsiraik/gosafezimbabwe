'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Package, Search, Loader2, Clock, Bike, Phone, CheckCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import RatingModal from './RatingModal';

interface ActiveParcel {
  id: string;
  vehicleType: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: number;
  price: number;
  originalPrice?: number;
  status: string;
  createdAt: string;
  driver?: {
    id: string;
    userId: string;
    fullName: string;
    phone: string;
    licenseNumber: string;
    bikeRegistration: string;
  } | null;
}

interface Bid {
  id: string;
  bidPrice: number;
  status: string;
  createdAt: string;
  driver: {
    id: string;
    licenseNumber: string;
    bikeRegistration: string;
    averageRating?: number;
    totalRatings?: number;
    user: {
      id: string;
      fullName: string;
      phone: string;
    };
  };
}

interface ActiveParcelModalProps {
  activeParcel: ActiveParcel | null;
  onClose: () => void;
  onCancel: () => void;
}

// Only motorbike delivery is available
const VEHICLE_TYPE = 'motorbike';
const VEHICLE_NAME = 'Motorbike';

export default function ActiveParcelModal({ activeParcel, onClose, onCancel }: ActiveParcelModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [dots, setDots] = useState('');
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [checkingRating, setCheckingRating] = useState(false);

  // Fetch bids when status is bid_received
  const fetchBids = useCallback(async () => {
    if (!activeParcel) {
      setBids([]);
      return;
    }

    // Only fetch if status is bid_received
    if (activeParcel.status !== 'bid_received') {
      setBids([]);
      return;
    }

    try {
      setLoadingBids(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch(`/api/parcels/bids?parcelId=${activeParcel.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedBids = data.bids || [];
        setBids(fetchedBids);
        // Log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ActiveParcelModal] Fetched ${fetchedBids.length} bids for parcel ${activeParcel.id}`);
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
  }, [activeParcel]);

  useEffect(() => {
    if (activeParcel?.status === 'bid_received') {
      // Fetch immediately when status changes to bid_received
      fetchBids();
      // Poll for new bids every 3 seconds when status is bid_received
      const interval = setInterval(() => {
        fetchBids();
      }, 3000);
      return () => clearInterval(interval);
    } else {
      // Clear bids if status is not bid_received
      setBids([]);
    }
  }, [activeParcel?.status, activeParcel?.id, fetchBids]);

  // Animate dots for searching status
  useEffect(() => {
    if (activeParcel?.status === 'searching') {
      const interval = setInterval(() => {
        setDots((prev) => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [activeParcel?.status]);

  const handleCancel = async () => {
    if (!activeParcel) return;
    
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in again');
        return;
      }

      const response = await fetch('/api/parcels/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ parcelId: activeParcel.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel parcel');
        return;
      }

      toast.success('Parcel cancelled successfully');
      onCancel(); // This will refresh the parcel status
      onClose(); // Also close the modal
    } catch (error) {
      console.error('Cancel parcel error:', error);
      toast.error('Failed to cancel parcel');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusMessage = () => {
    switch (activeParcel?.status) {
      case 'searching':
        return `Searching for available ${VEHICLE_NAME.toLowerCase()} driver${dots}`;
      case 'bid_received':
        return 'Drivers have placed bids';
      case 'pending':
        return 'Waiting for driver to accept';
      case 'accepted':
        return 'Driver is on the way to pickup';
      case 'in_progress':
        return 'Parcel in transit';
      case 'completed':
        return 'Delivery completed';
      default:
        return 'Processing your request';
    }
  };

  const getStatusColor = () => {
    switch (activeParcel?.status) {
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

  const handleCallDriver = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBid(bidId);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/parcels/bids/accept', {
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

      toast.success('Driver selected! They will contact you soon.');
      onCancel(); // Refresh the parcel status
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      toast.error(error.message || 'Failed to accept bid');
    } finally {
      setAcceptingBid(null);
    }
  };

  // Check if user has already rated this parcel
  const checkIfRated = useCallback(async () => {
    if (!activeParcel || !activeParcel.driver || activeParcel.status !== 'completed') {
      setHasRated(false);
      return;
    }

    try {
      setCheckingRating(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      // Check if rating exists for this parcel
      const response = await fetch(`/api/parcels/rate/check?parcelId=${activeParcel.id}`, {
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
  }, [activeParcel]);

  useEffect(() => {
    checkIfRated();
  }, [checkIfRated]);

  if (!activeParcel) return null;

  return (
    <AnimatePresence>
      {activeParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Active Parcel</h2>
                {/* Remove close button - modal should not be closable when there's an active parcel */}
              </div>

          {/* Search Animation */}
          {activeParcel.status === 'searching' && (
            <div className="mb-6 flex flex-col items-center justify-center py-8">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-full border-4 border-yellow-400/30 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center"
                  >
                    <Search className="w-8 h-8 text-yellow-400" />
                  </motion.div>
                </div>
                {/* Pulsing rings */}
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-yellow-400/20"
                    animate={{
                      scale: [1, 2, 2.5],
                      opacity: [0.5, 0.3, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </motion.div>
              <p className="mt-4 text-yellow-400 font-medium text-lg">
                {getStatusMessage()}
              </p>
              <p className="mt-2 text-white/60 text-sm">
                Finding the closest available driver
              </p>
            </div>
          )}

          {/* Status for non-searching states */}
          {activeParcel.status !== 'searching' && (
            <div className="mb-6 flex items-center justify-center py-4">
              <div className="flex items-center space-x-3">
                <Clock className={`w-6 h-6 ${getStatusColor()}`} />
                <p className={`${getStatusColor()} font-medium text-lg`}>
                  {getStatusMessage()}
                </p>
              </div>
            </div>
          )}

          {/* Parcel Details */}
          <div className="space-y-4 mb-6">
            {/* Vehicle Type - Always Motorbike */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-nexryde-yellow/20 rounded-lg">
                  <div className="text-nexryde-yellow">
                    <Bike className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-xs mb-1">Vehicle Type</p>
                  <p className="text-white font-medium">{VEHICLE_NAME}</p>
                </div>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-start space-x-3 mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <MapPin className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-xs mb-1">Pickup</p>
                  <p className="text-white font-medium">{activeParcel.pickupAddress}</p>
                </div>
              </div>
            </div>

            {/* Delivery Location */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <MapPin className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-xs mb-1">Delivery</p>
                  <p className="text-white font-medium">{activeParcel.deliveryAddress}</p>
                </div>
              </div>
            </div>

            {/* Distance and Price */}
            <div className="flex justify-between items-center pt-4 border-t border-white/20">
              <div>
                <p className="text-white/70 text-sm">Distance</p>
                <p className="text-white font-semibold">{activeParcel.distance.toFixed(2)} km</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-sm">Price</p>
                <p className="text-nexryde-yellow font-bold text-xl">${activeParcel.price.toFixed(2)}</p>
                {activeParcel.originalPrice && activeParcel.originalPrice !== activeParcel.price && (
                  <p className="text-white/50 text-xs line-through">${activeParcel.originalPrice.toFixed(2)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Driver Bids Section */}
          {activeParcel.status === 'bid_received' && (
            <div className="mb-6">
              <h3 className="text-white font-semibold text-lg mb-4">
                Driver Bids ({bids.length})
              </h3>
              
              {loadingBids ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                  <p className="text-white/70 text-sm">Loading bids...</p>
                </div>
              ) : bids.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl">
                  <Bike className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/70">No bids yet</p>
                  <p className="text-white/50 text-sm mt-2">Drivers are reviewing your parcel request...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bids.map((bid, index) => (
                    <motion.div
                      key={bid.id || `bid-${index}-${bid.driver?.id || index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-nexryde-yellow/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                              <Bike className="w-5 h-5 text-nexryde-yellow" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-white font-semibold">{bid.driver.user.fullName}</p>
                                {bid.driver.averageRating !== undefined && bid.driver.averageRating > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-yellow-400 text-xs font-medium">
                                      {bid.driver.averageRating.toFixed(1)}
                                    </span>
                                    {bid.driver.totalRatings !== undefined && bid.driver.totalRatings > 0 && (
                                      <span className="text-white/50 text-xs">
                                        ({bid.driver.totalRatings})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-white/60 text-xs">
                                License: {bid.driver.licenseNumber} • Bike: {bid.driver.bikeRegistration}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-nexryde-yellow font-bold text-2xl">${bid.bidPrice.toFixed(2)}</p>
                          <p className="text-white/60 text-xs">Bid Price</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-4 border-t border-white/10">
                        <button
                          onClick={() => handleCallDriver(bid.driver.user.phone)}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Call Driver</span>
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
                              <span>Accept This Driver</span>
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

          {/* Driver Details - Show when parcel is accepted */}
          {(activeParcel.status === 'accepted' || activeParcel.status === 'in_progress') && activeParcel.driver && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <h3 className="text-white font-semibold text-lg mb-4">Your Driver</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                    <Bike className="w-6 h-6 text-nexryde-yellow" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{activeParcel.driver.fullName}</p>
                    <p className="text-white/60 text-xs">Motorbike Driver</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div>
                    <p className="text-white/70 text-xs mb-1">License Number</p>
                    <p className="text-white font-medium text-sm">{activeParcel.driver.licenseNumber}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs mb-1">Bike Registration</p>
                    <p className="text-white font-medium text-sm">{activeParcel.driver.bikeRegistration}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <p className="text-white/70 text-xs mb-1">Agreed Price</p>
                  <p className="text-nexryde-yellow font-bold text-2xl">${activeParcel.price.toFixed(2)}</p>
                  {activeParcel.originalPrice && activeParcel.originalPrice !== activeParcel.price && (
                    <p className="text-white/50 text-xs line-through mt-1">Original: ${activeParcel.originalPrice.toFixed(2)}</p>
                  )}
                </div>

                <button
                  onClick={() => handleCallDriver(activeParcel.driver!.phone)}
                  className="w-full bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 mt-4"
                >
                  <Phone className="w-5 h-5" />
                  <span>Call Driver</span>
                </button>
              </div>
            </div>
          )}

          {/* Rating Section - Show after delivery is completed */}
          {activeParcel.status === 'completed' && activeParcel.driver && !hasRated && (
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-white font-semibold mb-2">Rate Your Driver</p>
              <p className="text-white/70 text-sm mb-4">How was your experience with {activeParcel.driver.fullName}?</p>
              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Star className="w-5 h-5" />
                <span>Rate Driver</span>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Allow cancellation at any time (except if already cancelled or completed) */}
            {activeParcel.status !== 'cancelled' && activeParcel.status !== 'completed' && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="w-full bg-red-500/20 text-red-400 py-3 px-6 rounded-xl font-semibold hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Cancel Parcel</span>
                )}
              </button>
            )}
            {/* Remove Close button - modal should not be closable when there's an active parcel */}
          </div>
        </motion.div>
        
        {/* Rating Modal */}
        {activeParcel.driver && (
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            parcelId={activeParcel.id}
            rateeId={activeParcel.driver.userId}
            rateeName={activeParcel.driver.fullName}
            raterType="passenger"
            rateeType="driver"
            onRatingSubmitted={() => {
              setHasRated(true);
              // Close modal after rating is submitted
              setTimeout(() => {
                onClose();
                onCancel(); // Refresh parcel status
              }, 1000);
            }}
          />
        )}
        </div>
      )}
    </AnimatePresence>
  );
}
