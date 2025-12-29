'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, MapPin as StationIcon, Bus, Plus, Minus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/CustomSelect';
import ActiveBusBookingModal from '@/components/ActiveBusBookingModal';

interface City {
  id: string;
  name: string;
  country?: string;
  isActive: boolean;
}

interface BusOption {
  id: string;
  departureTime: string;
  arrivalTime?: string;
  station: string;
  price: number;
  availableSeats: number;
  conductorPhone?: string;
  fromCity: string;
  toCity: string;
}

export default function BusBookingPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [fromCityId, setFromCityId] = useState<string>('');
  const [toCityId, setToCityId] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [numberOfTickets, setNumberOfTickets] = useState<number>(1);
  const [availableBuses, setAvailableBuses] = useState<BusOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [showActiveBookingModal, setShowActiveBookingModal] = useState(false);

  // Fetch cities from API
  const fetchCities = useCallback(async () => {
    try {
      setLoadingCities(true);
      const response = await fetch('/api/cities');
      if (response.ok) {
        const data = await response.json();
        const citiesList = data.cities || [];
        
        // If no cities exist, seed them automatically
        if (citiesList.length === 0) {
          const seedResponse = await fetch('/api/cities/seed', { method: 'POST' });
          if (seedResponse.ok) {
            // Fetch again after seeding
            const refreshResponse = await fetch('/api/cities');
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              setCities(refreshData.cities || []);
              return;
            }
          }
        }
        
        setCities(citiesList);
      } else {
        // If cities API fails, try to seed cities first
        const seedResponse = await fetch('/api/cities/seed', { method: 'POST' });
        if (seedResponse.ok) {
          const citiesResponse = await fetch('/api/cities');
          if (citiesResponse.ok) {
            const citiesData = await citiesResponse.json();
            setCities(citiesData.cities || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast.error('Failed to load cities. Please refresh the page.');
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // Check for active bus booking
  const checkActiveBooking = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/buses/bookings/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.booking) {
          setActiveBooking(data.booking);
          setShowActiveBookingModal(true);
        } else {
          setActiveBooking(null);
          setShowActiveBookingModal(false);
        }
      }
    } catch (error) {
      console.error('Error checking active booking:', error);
    }
  }, []);

  useEffect(() => {
    fetchCities();
    checkActiveBooking();
    // Poll for active booking updates every 10 seconds (to catch confirmation status changes)
    const interval = setInterval(() => {
      checkActiveBooking();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchCities, checkActiveBooking]);

  // Convert 24-hour time to 12-hour format
  const formatTime = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSearch = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (!fromCityId || !toCityId) {
      toast.error('Please select both from and to cities');
      return;
    }
    if (fromCityId === toCityId) {
      toast.error('From and to cities must be different');
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/buses/search?fromCityId=${fromCityId}&toCityId=${toCityId}&travelDate=${selectedDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to search buses');
      }

      const data = await response.json();
      
      // Format buses for display
      const formattedBuses: BusOption[] = data.buses.map((bus: any) => ({
        id: bus.id,
        departureTime: formatTime(bus.departureTime),
        arrivalTime: bus.arrivalTime ? formatTime(bus.arrivalTime) : undefined,
        station: bus.station,
        price: bus.price,
        availableSeats: bus.availableSeats,
        conductorPhone: bus.conductorPhone,
        fromCity: bus.fromCity,
        toCity: bus.toCity,
      }));

      setAvailableBuses(formattedBuses);
      setSelectedBus(null);
      setNumberOfTickets(1);
      
      if (formattedBuses.length === 0) {
        toast.error('No buses available for this route on the selected date');
      } else {
        toast.success(`Found ${formattedBuses.length} bus(es) available`);
      }
    } catch (error) {
      console.error('Error searching buses:', error);
      toast.error('Failed to search buses. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBuyTickets = async () => {
    if (!selectedBus) {
      toast.error('Please select a bus');
      return;
    }
    if (numberOfTickets < 1) {
      toast.error('Please select at least 1 ticket');
      return;
    }

    const bus = availableBuses.find(b => b.id === selectedBus);
    if (!bus) return;

    if (numberOfTickets > bus.availableSeats) {
      toast.error(`Only ${bus.availableSeats} seats available`);
      return;
    }

    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login to continue');
        router.push('/auth/login');
        return;
      }

      setIsSubmitting(true);

      const response = await fetch('/api/buses/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          busScheduleId: selectedBus,
          travelDate: selectedDate,
          numberOfTickets,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      toast.success(`Booking created successfully! Total: $${data.booking.totalPrice.toFixed(2)}`);
      
      // Reset form
      setSelectedBus(null);
      setNumberOfTickets(1);
      setAvailableBuses([]);
      setSelectedDate('');
      setFromCityId('');
      setToCityId('');
      
      // Check for active booking (will show modal)
      await checkActiveBooking();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBusData = availableBuses.find(b => b.id === selectedBus);
  const totalPrice = selectedBusData ? selectedBusData.price * numberOfTickets : 0;
  
  const fromCityName = cities.find(c => c.id === fromCityId)?.name || '';
  const toCityName = cities.find(c => c.id === toCityId)?.name || '';

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

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
            <h1 className="text-2xl font-bold text-white">Bus Booking</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Search Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 space-y-4">
            <h2 className="text-white font-semibold text-lg mb-4">Search Buses</h2>
            
            {/* Date Selection */}
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                Travel Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={today}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
              </div>
            </div>

            {/* From City */}
            <CustomSelect
              label="From City"
              value={fromCityId}
              onChange={setFromCityId}
              placeholder="Select from city"
              disabled={loadingCities}
              icon={<MapPin className="w-5 h-5 text-white/50" />}
              options={[
                ...(cities.length === 0 && !loadingCities
                  ? [{ value: '', label: 'No cities available' }]
                  : cities.map(city => ({ value: city.id, label: city.name }))
                )
              ]}
            />

            {/* To City */}
            <CustomSelect
              label="To City"
              value={toCityId}
              onChange={setToCityId}
              placeholder="Select to city"
              disabled={loadingCities}
              icon={<MapPin className="w-5 h-5 text-white/50" />}
              options={[
                ...(cities.length === 0 && !loadingCities
                  ? [{ value: '', label: 'No cities available' }]
                  : cities.map(city => ({ value: city.id, label: city.name }))
                )
              ]}
            />

            <button
              onClick={handleSearch}
              disabled={isSearching || loadingCities}
              className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Search Buses</span>
              )}
            </button>
          </div>

          {/* Available Buses */}
          {availableBuses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Available Buses</h2>
              <div className="space-y-3">
                {availableBuses.map((bus) => (
                  <button
                    key={bus.id}
                    onClick={() => setSelectedBus(bus.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedBus === bus.id
                        ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${selectedBus === bus.id ? 'bg-nexryde-yellow/30' : 'bg-white/10'}`}>
                          <Bus className={`w-6 h-6 ${selectedBus === bus.id ? 'text-nexryde-yellow' : 'text-white/70'}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="w-4 h-4 text-white/70" />
                            <span className="text-white font-semibold">{bus.departureTime}</span>
                            {bus.arrivalTime && (
                              <span className="text-white/60 text-sm">→ {bus.arrivalTime}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <StationIcon className="w-4 h-4 text-white/70" />
                            <span className="text-white/70 text-sm">{bus.station}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-nexryde-yellow font-bold text-lg">${bus.price}</p>
                        <p className="text-white/60 text-xs">{bus.availableSeats} seats left</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Ticket Selection */}
          {selectedBus && selectedBusData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 space-y-4"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Select Number of Tickets</h2>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="text-white font-medium">Number of Tickets</p>
                  <p className="text-white/60 text-sm">Price per ticket: ${selectedBusData.price}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setNumberOfTickets(Math.max(1, numberOfTickets - 1))}
                    disabled={numberOfTickets <= 1}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white font-bold text-xl w-8 text-center">{numberOfTickets}</span>
                  <button
                    onClick={() => setNumberOfTickets(Math.min(selectedBusData.availableSeats, numberOfTickets + 1))}
                    disabled={numberOfTickets >= selectedBusData.availableSeats}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white font-medium">Total Price:</span>
                  <span className="text-nexryde-yellow font-bold text-xl">${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleBuyTickets}
                  disabled={isSubmitting}
                  className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Buy Tickets</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Active Booking Modal */}
      {showActiveBookingModal && activeBooking && (
        <ActiveBusBookingModal
          activeBooking={activeBooking}
          onClose={() => setShowActiveBookingModal(false)}
          onCancel={() => {
            setActiveBooking(null);
            setShowActiveBookingModal(false);
            checkActiveBooking();
          }}
        />
      )}
    </div>
  );
}
