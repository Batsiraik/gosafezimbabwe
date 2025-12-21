'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bus, Calendar, Clock, MapPin, Phone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface BusBooking {
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

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/buses/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else if (response.status === 401) {
        toast.error('Please login again');
        router.push('/auth/login');
      } else {
        throw new Error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const formatTime = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
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
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Pending</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">My Bus Tickets</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-xl border border-white/20 text-center"
          >
            <Bus className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-white text-xl font-semibold mb-2">No Bookings Yet</h2>
            <p className="text-white/70 mb-6">You haven't made any bus bookings yet.</p>
            <button
              onClick={() => router.push('/bus-booking')}
              className="bg-nexryde-yellow text-white py-2 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
            >
              Book a Bus
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {bookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                      <Bus className="w-6 h-6 text-nexryde-yellow" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        {booking.busSchedule.fromCity.name} → {booking.busSchedule.toCity.name}
                      </h3>
                      <p className="text-white/70 text-sm">{booking.busSchedule.station}</p>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-white/70">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(booking.travelDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/70">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {formatTime(booking.busSchedule.departureTime)}
                      {booking.busSchedule.arrivalTime && ` → ${formatTime(booking.busSchedule.arrivalTime)}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/70">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{booking.busSchedule.station}</span>
                  </div>
                  <div className="text-white/70">
                    <span className="text-sm">
                      {booking.numberOfTickets} ticket{booking.numberOfTickets > 1 ? 's' : ''} • ${booking.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {booking.busSchedule.conductorPhone && (
                  <div className="pt-4 border-t border-white/20">
                    <button
                      onClick={() => handleCall(booking.busSchedule.conductorPhone!)}
                      className="w-full md:w-auto bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Conductor</span>
                    </button>
                    {booking.status === 'confirmed' && (
                      <p className="text-green-400 text-xs mt-2 text-center md:text-left">
                        ✓ Your ticket has been confirmed by the bus conductor
                      </p>
                    )}
                    {booking.status === 'pending' && (
                      <p className="text-yellow-400 text-xs mt-2 text-center md:text-left">
                        ⏳ Waiting for conductor confirmation. You can call them now.
                      </p>
                    )}
                  </div>
                )}

                {!booking.busSchedule.conductorPhone && booking.status === 'pending' && (
                  <div className="pt-4 border-t border-white/20">
                    <p className="text-white/60 text-xs text-center">
                      Conductor contact will be available after confirmation
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
