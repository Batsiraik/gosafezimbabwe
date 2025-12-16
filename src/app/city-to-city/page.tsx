'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, Users, Package, Plus, Minus, MapPin, Calendar } from 'lucide-react';
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

type UserType = 'has-car' | 'needs-car' | null;

export default function CityToCityPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>(null);
  const [travelDate, setTravelDate] = useState<string>('');
  const [fromCity, setFromCity] = useState<string>('');
  const [toCity, setToCity] = useState<string>('');
  
  // For users with car
  const [maxPeople, setMaxPeople] = useState<number>(1);
  const [maxBags, setMaxBags] = useState<number>(0);
  
  // For users without car
  const [neededSeats, setNeededSeats] = useState<number>(1);
  const [userBags, setUserBags] = useState<number>(0);

  const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number>>, max: number = 10) => {
    setter(prev => Math.min(prev + 1, max));
  };

  const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number>>, min: number = 0) => {
    setter(prev => Math.max(prev - 1, min));
  };

  const calculateSuggestedPrice = () => {
    // Simple price suggestion based on distance (mock calculation)
    // In real app, this would calculate actual distance between cities
    const basePrice = 50; // Base price for city-to-city
    const pricePerSeat = 20;
    
    if (userType === 'has-car') {
      return basePrice + (maxPeople * pricePerSeat);
    } else {
      return basePrice + (neededSeats * pricePerSeat);
    }
  };

  const handleSendRequest = () => {
    if (!userType) {
      toast.error('Please select whether you have a car or need a ride');
      return;
    }
    if (!travelDate) {
      toast.error('Please select travel date');
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

    // TODO: Handle request submission (backend integration)
    const requestData = {
      userType,
      travelDate,
      fromCity,
      toCity,
      ...(userType === 'has-car' 
        ? { maxPeople, maxBags }
        : { neededSeats, userBags }
      ),
      suggestedPrice: calculateSuggestedPrice()
    };

    console.log('Ride share request:', requestData);
    toast.success('Ride share request sent! Looking for verified riders...');
  };

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
            <h1 className="text-2xl font-bold text-white">City to City / Ride Share</h1>
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
          {/* User Type Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">I want to...</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setUserType('has-car')}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  userType === 'has-car'
                    ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`mb-3 ${userType === 'has-car' ? 'text-nexryde-yellow' : 'text-white/70'}`}>
                    <Car className="w-10 h-10" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">I have a car</h3>
                  <p className="text-white/60 text-sm">
                    Looking to share ride and costs with passengers
                  </p>
                </div>
              </button>

              <button
                onClick={() => setUserType('needs-car')}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  userType === 'needs-car'
                    ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`mb-3 ${userType === 'needs-car' ? 'text-nexryde-yellow' : 'text-white/70'}`}>
                    <Users className="w-10 h-10" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">I need a ride</h3>
                  <p className="text-white/60 text-sm">
                    Looking to join someone's ride and share costs
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Date and City Selection */}
          {userType && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 space-y-4"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Travel Details</h2>
              
              {/* Travel Date */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Travel Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
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
            </motion.div>
          )}

          {/* Info Message */}
          {userType && travelDate && fromCity && toCity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-500/20 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-blue-400/30"
            >
              <p className="text-white/90 text-sm">
                <strong className="text-white">Note:</strong> We'll help you find verified riders to share your journey with. 
                Final price will be discussed and agreed upon with your ride partner. 
                Suggested price: <span className="text-nexryde-yellow font-semibold">${calculateSuggestedPrice()}</span>
              </p>
            </motion.div>
          )}

          {/* Options for Users with Car */}
          {userType === 'has-car' && travelDate && fromCity && toCity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 space-y-6"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Ride Details</h2>
              
              {/* Max People */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-medium">Max Passengers</p>
                    <p className="text-white/60 text-sm">How many people can you take?</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDecrement(setMaxPeople, 1)}
                    disabled={maxPeople <= 1}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white font-bold text-xl w-8 text-center">{maxPeople}</span>
                  <button
                    onClick={() => handleIncrement(setMaxPeople, 8)}
                    disabled={maxPeople >= 8}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Max Bags */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-medium">Max Luggage/Bags</p>
                    <p className="text-white/60 text-sm">How many bags can you accommodate?</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDecrement(setMaxBags, 0)}
                    disabled={maxBags <= 0}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white font-bold text-xl w-8 text-center">{maxBags}</span>
                  <button
                    onClick={() => handleIncrement(setMaxBags, 10)}
                    disabled={maxBags >= 10}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Options for Users without Car */}
          {userType === 'needs-car' && travelDate && fromCity && toCity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 space-y-6"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Your Requirements</h2>
              
              {/* Needed Seats */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-medium">Seats Needed</p>
                    <p className="text-white/60 text-sm">How many people are traveling?</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDecrement(setNeededSeats, 1)}
                    disabled={neededSeats <= 1}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white font-bold text-xl w-8 text-center">{neededSeats}</span>
                  <button
                    onClick={() => handleIncrement(setNeededSeats, 8)}
                    disabled={neededSeats >= 8}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* User Bags */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-medium">Your Bags</p>
                    <p className="text-white/60 text-sm">How many bags are you bringing?</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDecrement(setUserBags, 0)}
                    disabled={userBags <= 0}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white font-bold text-xl w-8 text-center">{userBags}</span>
                  <button
                    onClick={() => handleIncrement(setUserBags, 10)}
                    disabled={userBags >= 10}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Send Request Button */}
          {userType && travelDate && fromCity && toCity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <button
                onClick={handleSendRequest}
                className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
              >
                Send Request
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
