'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, MapPin as StationIcon, Bus, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

const cities = [
  'New York, USA',
  'London, UK',
  'Tokyo, Japan',
  'Paris, France',
  'Sydney, Australia',
  'Toronto, Canada',
  'Dubai, UAE',
  'Singapore',
  'Berlin, Germany',
  'Mumbai, India'
];

interface BusOption {
  id: string;
  time: string;
  station: string;
  price: number;
  availableSeats: number;
}

export default function BusBookingPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [fromCity, setFromCity] = useState<string>('');
  const [toCity, setToCity] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [numberOfTickets, setNumberOfTickets] = useState<number>(1);
  const [availableBuses, setAvailableBuses] = useState<BusOption[]>([]);

  // Mock bus data - always returns mock buses for testing
  const getAvailableBuses = (): BusOption[] => {
    // Mock data - different buses at different times
    // In real app, this would come from backend based on date and route
    return [
      {
        id: 'bus-1',
        time: '09:00 AM',
        station: 'Central Bus Station',
        price: 25,
        availableSeats: 15
      },
      {
        id: 'bus-2',
        time: '11:00 AM',
        station: 'Downtown Terminal',
        price: 25,
        availableSeats: 8
      },
      {
        id: 'bus-3',
        time: '02:00 PM',
        station: 'Central Bus Station',
        price: 30,
        availableSeats: 20
      },
      {
        id: 'bus-4',
        time: '05:00 PM',
        station: 'North Station',
        price: 28,
        availableSeats: 12
      },
      {
        id: 'bus-5',
        time: '08:00 PM',
        station: 'Central Bus Station',
        price: 32,
        availableSeats: 5
      }
    ];
  };

  const handleSearch = () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (!fromCity || !toCity) {
      toast.error('Please select both from and to cities');
      return;
    }
    if (fromCity === toCity) {
      toast.error('From and to cities must be different');
      return;
    }

    // Always return mock buses for now
    const buses = getAvailableBuses();
    setAvailableBuses(buses);
    setSelectedBus(null);
    setNumberOfTickets(1);
    
    toast.success(`Found ${buses.length} bus(es) available`);
  };

  const handleBuyTickets = () => {
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

    const totalPrice = bus.price * numberOfTickets;

    // TODO: Handle ticket purchase (backend integration)
    const bookingData = {
      date: selectedDate,
      fromCity,
      toCity,
      busId: selectedBus,
      busTime: bus.time,
      busStation: bus.station,
      numberOfTickets,
      totalPrice
    };

    console.log('Bus booking:', bookingData);
    toast.success(`Successfully booked ${numberOfTickets} ticket(s)! Total: $${totalPrice}`);
  };

  const selectedBusData = availableBuses.find(b => b.id === selectedBus);
  const totalPrice = selectedBusData ? selectedBusData.price * numberOfTickets : 0;

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
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                From City
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                <select
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="" className="bg-gray-800">Select from city</option>
                  {cities.map((city) => (
                    <option key={city} value={city} className="bg-gray-800">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* To City */}
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                To City
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                <select
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="" className="bg-gray-800">Select to city</option>
                  {cities.map((city) => (
                    <option key={city} value={city} className="bg-gray-800">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
            >
              Search Buses
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
                            <span className="text-white font-semibold">{bus.time}</span>
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
                  className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
                >
                  Buy Tickets
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
