'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, MapPin, Calendar, Star, Clock, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface RideHistory {
  id: string;
  pickupAddress: string;
  destinationAddress: string;
  distance: number;
  price: number;
  finalPrice: number | null;
  status: string;
  isRoundTrip: boolean;
  createdAt: string;
  driver?: {
    fullName: string;
    phone: string;
    licenseNumber: string;
    carRegistration: string;
  } | null;
}

export default function HistoryPage() {
  const router = useRouter();
  const [rides, setRides] = useState<RideHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    fetchRideHistory();
  }, [statusFilter, dateFilter]);

  const fetchRideHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/rides/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        let filteredRides = data.rides || [];

        // Apply status filter
        if (statusFilter !== 'all') {
          filteredRides = filteredRides.filter((ride: RideHistory) => ride.status === statusFilter);
        }

        // Apply date filter
        if (dateFilter !== 'all') {
          const now = new Date();
          filteredRides = filteredRides.filter((ride: RideHistory) => {
            const rideDate = new Date(ride.createdAt);
            switch (dateFilter) {
              case 'today':
                return rideDate.toDateString() === now.toDateString();
              case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return rideDate >= weekAgo;
              case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return rideDate >= monthAgo;
              default:
                return true;
            }
          });
        }

        setRides(filteredRides);
      } else if (response.status === 401) {
        router.push('/auth/login');
      } else {
        toast.error('Failed to load ride history');
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
      toast.error('Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { text: string; className: string } } = {
      completed: { text: 'Completed', className: 'bg-green-500/20 text-green-400' },
      cancelled: { text: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
      in_progress: { text: 'In Progress', className: 'bg-blue-500/20 text-blue-400' },
      accepted: { text: 'Accepted', className: 'bg-yellow-500/20 text-yellow-400' },
    };
    return badges[status] || { text: status, className: 'bg-white/10 text-white/70' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-nexryde-yellow p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white font-bold text-xl">Ride History</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-white" />
            <h2 className="text-white font-semibold">Filters</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-white/70 text-sm mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-2 text-white focus:outline-none focus:border-nexryde-yellow"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="in_progress">In Progress</option>
                <option value="accepted">Accepted</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="text-white/70 text-sm mb-2 block">Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-2 text-white focus:outline-none focus:border-nexryde-yellow"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ride History List */}
        {loading ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-white/30 mx-auto mb-3 animate-spin" />
            <p className="text-white/70">Loading history...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-12 bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <Car className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70 text-lg mb-2">No rides found</p>
            <p className="text-white/50 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride, index) => {
              const statusBadge = getStatusBadge(ride.status);
              return (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20"
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
                        <span>Distance: {ride.distance.toFixed(1)} km</span>
                        {ride.isRoundTrip && <span>• Round Trip</span>}
                      </div>
                      {ride.driver && (
                        <div className="mt-2 text-white/60 text-xs">
                          <span>Driver: {ride.driver.fullName}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium mb-2 ${statusBadge.className}`}>
                        <span>{statusBadge.text}</span>
                      </div>
                      <p className="text-nexryde-yellow font-bold text-lg">
                        ${(ride.finalPrice || ride.price).toFixed(2)}
                      </p>
                      {ride.finalPrice && ride.finalPrice !== ride.price && (
                        <p className="text-white/50 text-xs line-through">${ride.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                    <Calendar className="w-4 h-4 text-white/50" />
                    <span className="text-white/50 text-xs">{formatDate(ride.createdAt)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
