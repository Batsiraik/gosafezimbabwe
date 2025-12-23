'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bus, MapPin, Calendar, Clock, CheckCircle, Loader2, Plus, Settings, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/CustomSelect';

interface BusProviderProfile {
  id: string;
  isVerified: boolean;
}

interface City {
  id: string;
  name: string;
  country?: string;
  isActive: boolean;
}

interface BusSchedule {
  id: string;
  fromCityId: string;
  toCityId: string;
  departureTime: string;
  arrivalTime?: string;
  station: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  conductorPhone?: string;
  isActive: boolean;
  daysOfWeek: string;
  fromCity: {
    id: string;
    name: string;
  };
  toCity: {
    id: string;
    name: string;
  };
}

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
    fromCity: {
      name: string;
    };
    toCity: {
      name: string;
    };
  };
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
}

export default function BusProviderDashboardPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<BusProviderProfile | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fromCityId: '',
    toCityId: '',
    departureTime: '',
    arrivalTime: '',
    station: '',
    price: '',
    totalSeats: '',
    conductorPhone: '',
    selectedDays: [] as string[], // Array of selected days
  });

  // Check provider status
  const checkProviderStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/bus/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.provider) {
          setProvider(data.provider);
        } else {
          router.push('/driver/bus/register');
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
    // Set user mode to bus when this dashboard loads
    const { setUserMode } = require('@/lib/user-mode');
    setUserMode('bus');
  }, [checkProviderStatus]);

  // Fetch cities
  const fetchCities = useCallback(async () => {
    try {
      setLoadingCities(true);
      const response = await fetch('/api/cities');
      if (response.ok) {
        const data = await response.json();
        setCities(data.cities || []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    if (provider) {
      fetchCities();
    }
  }, [provider, fetchCities]);


  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!provider || !provider.isVerified) {
      setBookings([]);
      return;
    }

    try {
      setLoadingBookings(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/bus/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoadingBookings(false);
    }
  }, [provider]);

  // Fetch data when provider is verified
  useEffect(() => {
    if (provider && provider.isVerified) {
      fetchBookings();
    }
  }, [provider, fetchBookings]);

  // Handle form input change
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle add/edit schedule
  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromCityId || !formData.toCityId || !formData.departureTime || !formData.station || !formData.price || !formData.totalSeats) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.fromCityId === formData.toCityId) {
      toast.error('From and to cities must be different');
      return;
    }

    if (formData.selectedDays.length === 0) {
      toast.error('Please select at least one day of the week');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const url = '/api/driver/bus/schedules';
      const method = 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromCityId: formData.fromCityId,
          toCityId: formData.toCityId,
          departureTime: formData.departureTime,
          arrivalTime: formData.arrivalTime || null,
          station: formData.station,
          price: parseFloat(formData.price),
          totalSeats: parseInt(formData.totalSeats),
          conductorPhone: formData.conductorPhone || null,
          daysOfWeek: formData.selectedDays.length === 7 ? 'daily' : formData.selectedDays.join(','),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save schedule');
      }

      toast.success('Schedule created successfully!');
      setShowAddSchedule(false);
      setFormData({
        fromCityId: '',
        toCityId: '',
        departureTime: '',
        arrivalTime: '',
        station: '',
        price: '',
        totalSeats: '',
        conductorPhone: '',
        selectedDays: [],
      });
      // Redirect to schedules page to see the new schedule
      router.push('/driver/bus/schedules');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error(error.message || 'Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: BusSchedule) => {
    // Parse daysOfWeek string to array
    let selectedDays: string[] = [];
    if (schedule.daysOfWeek === 'daily') {
      selectedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    } else if (schedule.daysOfWeek) {
      selectedDays = schedule.daysOfWeek.split(',').map(d => d.trim());
    }
    
    setFormData({
      fromCityId: schedule.fromCityId,
      toCityId: schedule.toCityId,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime || '',
      station: schedule.station,
      price: schedule.price.toString(),
      totalSeats: schedule.totalSeats.toString(),
      conductorPhone: schedule.conductorPhone || '',
      selectedDays,
    });
    setShowAddSchedule(true);
  };

  // Handle delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch(`/api/driver/bus/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete schedule');
      }

      toast.success('Schedule deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast.error(error.message || 'Failed to delete schedule');
    }
  };

  // Handle toggle schedule active status
  const handleToggleActive = async (schedule: BusSchedule) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch(`/api/driver/bus/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !schedule.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update schedule');
      }

      toast.success(`Schedule ${!schedule.isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error: any) {
      console.error('Error toggling schedule:', error);
      toast.error(error.message || 'Failed to update schedule');
    }
  };

  // Handle call user
  const handleCallUser = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Handle confirm booking
  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch('/api/driver/bus/bookings/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm booking');
      }

      toast.success('Ticket confirmed successfully!');
      fetchBookings();
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      toast.error(error.message || 'Failed to confirm booking');
    }
  };

  const formatTime = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Generate time options for dropdown (00:00 to 23:30 in 30-minute intervals)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = minute.toString().padStart(2, '0');
        const timeValue = `${hourStr}:${minuteStr}`;
        const hour12 = hour % 12 || 12;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayLabel = `${hour12}:${minuteStr} ${ampm}`;
        options.push({ value: timeValue, label: displayLabel });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

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
                <h1 className="text-2xl font-bold text-white">Bus Provider Dashboard</h1>
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
              Your bus provider registration documents have been submitted and are currently under review.
            </p>
            <p className="text-white/60 text-sm mb-6">
              Verification may take a few hours. You will be able to start adding bus schedules once your documents are approved by our admin team.
            </p>
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
                <h2 className="text-white font-semibold text-lg mb-2">Bus Service Provider</h2>
                <p className="text-white/70 text-sm">Manage your bus schedules and view bookings</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => router.push('/driver/bus/schedules')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>My Schedules</span>
            </button>
            <button
              onClick={() => {
                setShowAddSchedule(true);
                setFormData({
                  fromCityId: '',
                  toCityId: '',
                  departureTime: '',
                  arrivalTime: '',
                  station: '',
                  price: '',
                  totalSeats: '',
                  conductorPhone: '',
                  selectedDays: [],
                });
              }}
              className="bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Bus Schedule</span>
            </button>
          </div>

          {/* Bookings List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Bookings for My Buses</h2>
              <button
                onClick={fetchBookings}
                disabled={loadingBookings}
                className="text-nexryde-yellow hover:text-nexryde-yellow-dark text-sm font-medium disabled:opacity-50"
              >
                {loadingBookings ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-2 mb-4">
              <button
                onClick={() => setBookingFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  bookingFilter === 'all'
                    ? 'bg-nexryde-yellow text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setBookingFilter('pending')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  bookingFilter === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setBookingFilter('confirmed')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  bookingFilter === 'confirmed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Confirmed
              </button>
            </div>

            {loadingBookings ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                <p className="text-white/70 text-sm">Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No bookings yet</p>
              </div>
            ) : (() => {
              // Filter bookings based on selected filter
              const filteredBookings = bookings.filter(booking => {
                if (bookingFilter === 'all') return true;
                if (bookingFilter === 'pending') return booking.status === 'pending';
                if (bookingFilter === 'confirmed') return booking.status === 'confirmed';
                return true;
              });

              if (filteredBookings.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/70">No {bookingFilter === 'all' ? '' : bookingFilter} bookings</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredBookings.map((booking, index) => (
                  <motion.div
                    key={booking.id || `booking-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-nexryde-yellow/20 rounded-lg">
                            <Bus className="w-5 h-5 text-nexryde-yellow" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">
                              {booking.busSchedule.fromCity.name} → {booking.busSchedule.toCity.name}
                            </p>
                            <p className="text-white/60 text-xs">Customer: {booking.user.fullName}</p>
                          </div>
                        </div>
                        <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ml-3 flex-shrink-0 ${
                          booking.status === 'confirmed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {booking.status === 'confirmed' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Confirmed</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(booking.travelDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(booking.busSchedule.departureTime)}</span>
                          {booking.busSchedule.arrivalTime && (
                            <span> → {formatTime(booking.busSchedule.arrivalTime)}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{booking.busSchedule.station}</span>
                        </div>
                      </div>
                      <p className="text-white/70 text-sm mt-2">
                        {booking.numberOfTickets} ticket{booking.numberOfTickets > 1 ? 's' : ''} • ${booking.totalPrice.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleCallUser(booking.user.phone)}
                        className="w-full md:flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Customer</span>
                      </button>
                      {booking.status !== 'confirmed' && booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleConfirmBooking(booking.id)}
                          className="w-full md:flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Confirm Ticket</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Add/Edit Schedule Modal */}
          {showAddSchedule && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowAddSchedule(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-white font-semibold text-lg mb-4">
                  Add New Bus Schedule
                </h3>
                
                <form onSubmit={handleSubmitSchedule} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomSelect
                      label="From City *"
                      value={formData.fromCityId}
                      onChange={(value) => handleInputChange('fromCityId', value)}
                      placeholder="Select from city"
                      disabled={loadingCities}
                      icon={<MapPin className="w-5 h-5 text-white/50" />}
                      options={cities.map(city => ({ value: city.id, label: city.name }))}
                    />

                    <CustomSelect
                      label="To City *"
                      value={formData.toCityId}
                      onChange={(value) => handleInputChange('toCityId', value)}
                      placeholder="Select to city"
                      disabled={loadingCities}
                      icon={<MapPin className="w-5 h-5 text-white/50" />}
                      options={cities.map(city => ({ value: city.id, label: city.name }))}
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">
                      Bus Station *
                    </label>
                    <input
                      type="text"
                      value={formData.station}
                      onChange={(e) => handleInputChange('station', e.target.value)}
                      placeholder="Enter bus station name"
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomSelect
                      label="Departure Time *"
                      value={formData.departureTime}
                      onChange={(value) => handleInputChange('departureTime', value)}
                      placeholder="Select departure time"
                      icon={<Clock className="w-5 h-5 text-white/50" />}
                      options={timeOptions}
                    />

                    <CustomSelect
                      label="Arrival Time - Optional"
                      value={formData.arrivalTime}
                      onChange={(value) => handleInputChange('arrivalTime', value)}
                      placeholder="Select arrival time (optional)"
                      icon={<Clock className="w-5 h-5 text-white/50" />}
                      options={[
                        { value: '', label: 'No arrival time' },
                        ...timeOptions,
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">
                        Price per Ticket * ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="25.00"
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">
                        Total Seats *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.totalSeats}
                        onChange={(e) => handleInputChange('totalSeats', e.target.value)}
                        placeholder="50"
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">
                      Conductor Phone - Optional
                    </label>
                    <input
                      type="tel"
                      value={formData.conductorPhone}
                      onChange={(e) => handleInputChange('conductorPhone', e.target.value)}
                      placeholder="+263776954448"
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                    />
                  </div>

                  {/* Days of Week Selection */}
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-3">
                      Operating Days * (Select all days this bus runs)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: 'monday', label: 'Monday' },
                        { value: 'tuesday', label: 'Tuesday' },
                        { value: 'wednesday', label: 'Wednesday' },
                        { value: 'thursday', label: 'Thursday' },
                        { value: 'friday', label: 'Friday' },
                        { value: 'saturday', label: 'Saturday' },
                        { value: 'sunday', label: 'Sunday' },
                      ].map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const newDays = formData.selectedDays.includes(day.value)
                              ? formData.selectedDays.filter(d => d !== day.value)
                              : [...formData.selectedDays, day.value];
                            setFormData(prev => ({ ...prev, selectedDays: newDays }));
                          }}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                            formData.selectedDays.includes(day.value)
                              ? 'bg-nexryde-yellow/20 border-nexryde-yellow text-nexryde-yellow'
                              : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {formData.selectedDays.length === 0 && (
                      <p className="text-red-400 text-xs mt-2">Please select at least one day</p>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                    type="button"
                    onClick={() => {
                      setShowAddSchedule(false);
                    }}
                      className="flex-1 bg-white/10 text-white py-2 px-4 rounded-xl font-semibold hover:bg-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-2 px-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Schedule'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
