'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bike, MapPin, DollarSign, Calendar, Clock, CheckCircle, XCircle, Loader2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Parcel {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: number;
  price: number;
  driverBidPrice: number | null;
  status: string;
  createdAt: string;
  user: {
    fullName: string;
    phone: string;
  };
}

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  accepted: number;
  totalEarnings: number;
}

export default function ParcelDriverHistoryPage() {
  const router = useRouter();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress' | 'accepted'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/parcel/parcels/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setParcels(data.parcels || []);
        setStats(data.stats || null);
      } else if (response.status === 404) {
        toast.error('Driver profile not found');
        router.push('/driver/parcel/register');
      } else {
        throw new Error('Failed to fetch history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load parcel history');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredParcels = parcels.filter(parcel => {
    // Status filter
    if (filter !== 'all' && parcel.status !== filter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const parcelDate = new Date(parcel.createdAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      switch (dateFilter) {
        case 'today':
          if (parcelDate < today) return false;
          break;
        case 'week':
          if (parcelDate < weekAgo) return false;
          break;
        case 'month':
          if (parcelDate < monthAgo) return false;
          break;
      }
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>In Progress</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>Accepted</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/driver/parcel/dashboard')}
                className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-2xl font-bold text-white">Delivery History & Earnings</h1>
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
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
                <p className="text-white/70 text-xs mb-1">Total Earnings</p>
                <p className="text-nexryde-yellow font-bold text-2xl">${stats.totalEarnings.toFixed(2)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
                <p className="text-white/70 text-xs mb-1">Total Deliveries</p>
                <p className="text-white font-bold text-2xl">{stats.total}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
                <p className="text-white/70 text-xs mb-1">Completed</p>
                <p className="text-green-400 font-bold text-2xl">{stats.completed}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
                <p className="text-white/70 text-xs mb-1">In Progress</p>
                <p className="text-blue-400 font-bold text-2xl">{stats.inProgress}</p>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
            <div className="flex items-center space-x-4 mb-4">
              <Filter className="w-5 h-5 text-white/70" />
              <span className="text-white/70 text-sm font-medium">Filters:</span>
            </div>
            
            {/* Status Filter */}
            <div className="mb-4">
              <p className="text-white/70 text-xs mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'completed', 'in_progress', 'accepted'] as const).map((filterOption) => (
                  <button
                    key={filterOption}
                    onClick={() => setFilter(filterOption)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                      filter === filterOption
                        ? 'bg-nexryde-yellow text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {filterOption === 'all' ? 'All' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1).replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <p className="text-white/70 text-xs mb-2">Date Range</p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'today', 'week', 'month'] as const).map((dateOption) => (
                  <button
                    key={dateOption}
                    onClick={() => setDateFilter(dateOption)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                      dateFilter === dateOption
                        ? 'bg-nexryde-yellow text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {dateOption === 'all' ? 'All Time' : dateOption.charAt(0).toUpperCase() + dateOption.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parcels List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">Deliveries</h2>
            
            {filteredParcels.length === 0 ? (
              <div className="text-center py-8">
                <Bike className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No deliveries found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredParcels.map((parcel) => (
                  <motion.div
                    key={parcel.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white font-medium text-sm">From: {parcel.pickupAddress}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm">To: {parcel.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                          <span>Customer: {parcel.user.fullName}</span>
                          <span>•</span>
                          <span>Distance: {parcel.distance.toFixed(1)} km</span>
                          <span>•</span>
                          <span>{new Date(parcel.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {getStatusBadge(parcel.status)}
                        <p className="text-nexryde-yellow font-bold text-lg mt-2">
                          ${(parcel.driverBidPrice || parcel.price).toFixed(2)}
                        </p>
                        {parcel.driverBidPrice && parcel.driverBidPrice !== parcel.price && (
                          <p className="text-white/60 text-xs line-through">
                            ${parcel.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
