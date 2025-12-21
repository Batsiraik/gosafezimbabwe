'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bus, Calendar, Clock, MapPin, Phone, CheckCircle, XCircle, Loader2, Home } from 'lucide-react';
import toast from 'react-hot-toast';

interface ActiveBusBooking {
  id: string;
  travelDate: string;
  numberOfTickets: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  busSchedule: {
    id: string;
    departureTime: string;
    arrivalTime?: string;
    station: string;
    price: number;
    conductorPhone?: string;
    fromCity: {
      name: string;
    };
    toCity: {
      name: string;
    };
  };
}

interface ActiveBusBookingModalProps {
  activeBooking: ActiveBusBooking;
  onClose: () => void;
  onCancel: () => void;
}

export default function ActiveBusBookingModal({ activeBooking, onClose, onCancel }: ActiveBusBookingModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const formatTime = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleCancel = async () => {
    if (!activeBooking) return;
    
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in again');
        return;
      }

      const response = await fetch('/api/buses/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: activeBooking.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel booking');
        return;
      }

      toast.success('Booking cancelled successfully');
      onCancel();
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) {
      toast.error('Conductor phone number not available');
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Confirmed</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Pending</span>
          </div>
        );
    }
  };

  if (!activeBooking) return null;

  return (
    <AnimatePresence>
      {activeBooking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto z-[70]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Active Bus Booking</h2>
              <button
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                title="Go to Dashboard"
              >
                <Home className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Booking Info */}
            <div className="space-y-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                    <Bus className="w-5 h-5 text-nexryde-yellow" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">
                      {activeBooking.busSchedule.fromCity.name} → {activeBooking.busSchedule.toCity.name}
                    </h3>
                    <p className="text-white/60 text-xs">{activeBooking.busSchedule.station}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  {getStatusBadge(activeBooking.status)}
                </div>
              </div>

              {/* Travel Date */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-white/70 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-white/70 text-xs mb-1">Travel Date</p>
                    <p className="text-white text-sm font-semibold">
                      {new Date(activeBooking.travelDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Departure Time */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-white/70 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-white/70 text-xs mb-1">Departure Time</p>
                    <p className="text-white text-sm font-semibold">
                      {formatTime(activeBooking.busSchedule.departureTime)}
                      {activeBooking.busSchedule.arrivalTime && (
                        <span className="text-white/60"> → {formatTime(activeBooking.busSchedule.arrivalTime)}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Station */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-white/70 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-white/70 text-xs mb-1">Bus Station</p>
                    <p className="text-white text-sm">{activeBooking.busSchedule.station}</p>
                  </div>
                </div>
              </div>

              {/* Tickets & Price */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-xs mb-1">Tickets</p>
                    <p className="text-white text-sm font-semibold">
                      {activeBooking.numberOfTickets} ticket{activeBooking.numberOfTickets > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-xs mb-1">Total Price</p>
                    <p className="text-nexryde-yellow font-bold text-lg">${activeBooking.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            {activeBooking.status === 'confirmed' && (
              <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-green-400 font-semibold text-sm mb-2">
                      ✓ Your ticket has been confirmed!
                    </p>
                    <p className="text-white/80 text-xs mb-1">
                      Please be on time. The bus departs at <strong>{formatTime(activeBooking.busSchedule.departureTime)}</strong> from <strong>{activeBooking.busSchedule.station}</strong>.
                    </p>
                    <p className="text-white/70 text-xs">
                      Make sure to arrive at least 15 minutes before departure time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conductor Phone - Always show if conductor phone exists */}
            {activeBooking.busSchedule.conductorPhone && (
              <div className="mb-6">
                <button
                  onClick={() => handleCall(activeBooking.busSchedule.conductorPhone!)}
                  className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Phone className="w-5 h-5" />
                  <span>Call Conductor</span>
                </button>
                {activeBooking.status === 'pending' && (
                  <p className="text-yellow-400 text-xs mt-2 text-center">
                    ⏳ Waiting for conductor confirmation. You can call them now.
                  </p>
                )}
                {activeBooking.status === 'confirmed' && (
                  <p className="text-green-400 text-xs mt-2 text-center">
                    You can still call the conductor if needed
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Home className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              
              {activeBooking.status !== 'cancelled' && (
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
                    <span>Cancel Booking</span>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
