'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Phone, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Bid {
  id: string;
  bidPrice: number;
  status: string;
  createdAt: string;
  driver: {
    id: string;
    licenseNumber: string;
    carRegistration: string;
    user: {
      id: string;
      fullName: string;
      phone: string;
    };
  };
}

interface RideBidsModalProps {
  rideId: string;
  onClose: () => void;
  onBidAccepted: () => void;
}

export default function RideBidsModal({ rideId, onClose, onBidAccepted }: RideBidsModalProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  useEffect(() => {
    fetchBids();
    // Poll for new bids every 5 seconds
    const interval = setInterval(fetchBids, 5000);
    return () => clearInterval(interval);
  }, [rideId]);

  const fetchBids = async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch(`/api/rides/bids?rideId=${rideId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBids(data.bids || []);
      }
    } catch (error) {
      console.error('Error fetching bids:', error);
    } finally {
      setLoading(false);
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

      const response = await fetch('/api/rides/bids/accept', {
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
      onBidAccepted();
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      toast.error(error.message || 'Failed to accept bid');
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleCallDriver = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Driver Bids</h2>
              <p className="text-white/60 text-sm mt-1">
                {bids.length} driver{bids.length !== 1 ? 's' : ''} {bids.length === 1 ? 'has' : 'have'} placed {bids.length === 1 ? 'a bid' : 'bids'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Bids List */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-3" />
              <p className="text-white/70">Loading bids...</p>
            </div>
          ) : bids.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/70">No bids yet</p>
              <p className="text-white/50 text-sm mt-2">Drivers are reviewing your ride request...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bids.map((bid, index) => (
                <motion.div
                  key={bid.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-nexryde-yellow/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                          <Car className="w-5 h-5 text-nexryde-yellow" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{bid.driver.user.fullName}</p>
                          <p className="text-white/60 text-xs">
                            License: {bid.driver.licenseNumber} • Car: {bid.driver.carRegistration}
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

          {/* Close Button */}
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full bg-white/10 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
