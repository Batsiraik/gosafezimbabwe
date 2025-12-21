'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bus, MapPin, Calendar, Clock, DollarSign, CheckCircle, Loader2, Plus, Settings, User, X, Edit2, Trash2, ArrowLeft } from 'lucide-react';
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

export default function BusSchedulesPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<BusProviderProfile | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [schedules, setSchedules] = useState<BusSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BusSchedule | null>(null);
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
    selectedDays: [] as string[],
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

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    if (!provider || !provider.isVerified) {
      setSchedules([]);
      return;
    }

    try {
      setLoadingSchedules(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/driver/bus/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoadingSchedules(false);
    }
  }, [provider]);

  // Fetch data when provider is verified
  useEffect(() => {
    if (provider && provider.isVerified) {
      fetchSchedules();
    }
  }, [provider, fetchSchedules]);

  // Handle form input change
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const formatTime = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
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

      const url = editingSchedule 
        ? `/api/driver/bus/schedules/${editingSchedule.id}`
        : '/api/driver/bus/schedules';
      
      const method = editingSchedule ? 'PUT' : 'POST';

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

      toast.success(editingSchedule ? 'Schedule updated successfully!' : 'Schedule created successfully!');
      setShowAddSchedule(false);
      setEditingSchedule(null);
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
      fetchSchedules();
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error(error.message || 'Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: BusSchedule) => {
    setEditingSchedule(schedule);
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
      fetchSchedules();
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
      fetchSchedules();
    } catch (error: any) {
      console.error('Error toggling schedule:', error);
      toast.error(error.message || 'Failed to update schedule');
    }
  };

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
                  onClick={() => router.push('/driver/bus/dashboard')}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-2xl font-bold text-white">My Bus Schedules</h1>
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
              onClick={() => router.push('/driver/bus/dashboard')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Back to Dashboard
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
                onClick={() => router.push('/driver/bus/dashboard')}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-2xl font-bold text-white">My Bus Schedules</h1>
            </div>
            <button
              onClick={() => {
                setShowAddSchedule(true);
                setEditingSchedule(null);
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
              <span>Add Schedule</span>
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
        >
          {/* Schedules List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">All Bus Schedules</h2>
              <button
                onClick={fetchSchedules}
                disabled={loadingSchedules}
                className="text-nexryde-yellow hover:text-nexryde-yellow-dark text-sm font-medium disabled:opacity-50"
              >
                {loadingSchedules ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loadingSchedules ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                <p className="text-white/70 text-sm">Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8">
                <Bus className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No bus schedules yet</p>
                <p className="text-white/50 text-sm mt-2">Click "Add Schedule" to create your first route</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule, index) => (
                  <motion.div
                    key={schedule.id || `schedule-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      schedule.isActive
                        ? 'border-green-500/20 bg-green-500/5'
                        : 'border-red-500/20 bg-red-500/5'
                    }`}
                  >
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-nexryde-yellow/20 rounded-lg">
                            <Bus className="w-5 h-5 text-nexryde-yellow" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">
                              {schedule.fromCity.name} → {schedule.toCity.name}
                            </p>
                            <p className="text-white/60 text-xs">{schedule.station}</p>
                          </div>
                        </div>
                        <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ml-3 flex-shrink-0 ${
                          schedule.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {schedule.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3" />
                              <span>Inactive</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-white/60 text-xs mt-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(schedule.departureTime)}</span>
                          {schedule.arrivalTime && (
                            <span> → {formatTime(schedule.arrivalTime)}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-white/50 text-xs">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {schedule.daysOfWeek === 'daily' 
                              ? 'Daily' 
                              : schedule.daysOfWeek.split(',').map(d => {
                                  const day = d.trim();
                                  return day.charAt(0).toUpperCase() + day.slice(1);
                                }).join(', ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>${schedule.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{schedule.availableSeats}/{schedule.totalSeats} seats</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleToggleActive(schedule)}
                        className={`w-full md:flex-1 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 ${
                          schedule.isActive
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                            : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                        }`}
                      >
                        {schedule.isActive ? (
                          <>
                            <X className="w-4 h-4" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="w-full md:flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="w-full md:flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Add/Edit Schedule Modal */}
      {showAddSchedule && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowAddSchedule(false);
            setEditingSchedule(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold text-lg mb-4">
              {editingSchedule ? 'Edit Bus Schedule' : 'Add New Bus Schedule'}
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
                    setEditingSchedule(null);
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
                  {isSubmitting ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
