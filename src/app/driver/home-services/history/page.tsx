'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, DollarSign, MapPin, Clock, CheckCircle, XCircle, Loader2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { getServiceIcon } from '@/lib/utils/service-icons';

interface ServiceRequestHistory {
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

interface Statistics {
  totalCompleted: number;
  totalEarnings: number;
}

export default function HomeServiceProviderHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ServiceRequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      const response = await fetch(`/api/driver/home-services/requests/history?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
        setStatistics(data.statistics || null);
      } else if (response.status === 401) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCallUser = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
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
            <Clock className="w-3 h-3" />
            <span>{status}</span>
          </div>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/driver/home-services/dashboard')}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-2xl font-bold text-white">Service History</h1>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
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
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Total Completed</p>
                    <p className="text-white font-bold text-2xl">{statistics.totalCompleted}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-nexryde-yellow" />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Total Earnings</p>
                    <p className="text-white font-bold text-2xl">${statistics.totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 className="text-white font-semibold text-lg mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  >
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  />
                </div>
              </div>
            </div>
          )}

          {/* History List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">Service History</h2>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                <p className="text-white/70 text-sm">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No service history found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((request, index) => (
                  <motion.div
                    key={request.id || `history-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
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
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {getStatusBadge(request.status)}
                        {request.status === 'completed' && request.finalPrice && (
                          <>
                            <p className="text-nexryde-yellow font-bold text-lg mt-2">${request.finalPrice.toFixed(2)}</p>
                            <p className="text-white/60 text-xs">Earned</p>
                          </>
                        )}
                      </div>
                    </div>
                    {request.status === 'completed' && (
                      <button
                        onClick={() => handleCallUser(request.user.phone)}
                        className="w-full bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 mt-3"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Call Customer</span>
                      </button>
                    )}
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
