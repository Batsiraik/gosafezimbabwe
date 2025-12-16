'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Wrench, Zap, Hammer, Sprout, Dog, Shield, Square, Phone, Monitor, Sparkles, Scissors, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const services: Service[] = [
  { id: 'plumber', name: 'Plumber', icon: <Wrench className="w-6 h-6" /> },
  { id: 'electrician', name: 'Electrician', icon: <Zap className="w-6 h-6" /> },
  { id: 'builder', name: 'Builder', icon: <Hammer className="w-6 h-6" /> },
  { id: 'gardener', name: 'Gardener', icon: <Sprout className="w-6 h-6" /> },
  { id: 'dog-walker', name: 'Dog Walker', icon: <Dog className="w-6 h-6" /> },
  { id: 'security', name: 'Security', icon: <Shield className="w-6 h-6" /> },
  { id: 'carpenter', name: 'Carpenter', icon: <Square className="w-6 h-6" /> },
  { id: 'phone-repair', name: 'Phone Repair', icon: <Phone className="w-6 h-6" /> },
  { id: 'computer-repair', name: 'Computer Repair', icon: <Monitor className="w-6 h-6" /> },
  { id: 'cleaners', name: 'Cleaners', icon: <Sparkles className="w-6 h-6" /> },
  { id: 'grass-cutter', name: 'Grass Cutter', icon: <Scissors className="w-6 h-6" /> },
];

export default function HomeServicesPage() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update job description prefix when service changes
  useEffect(() => {
    if (selectedService) {
      const serviceName = services.find(s => s.id === selectedService)?.name.toLowerCase() || '';
      setJobDescription(`I am looking for a ${serviceName} to `);
    } else {
      setJobDescription('');
    }
  }, [selectedService]);

  // Handle location input with autocomplete
  const handleLocationInput = async (value: string) => {
    setLocation(value);
    setShowLocationSuggestions(value.length > 0);

    if (value.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        const response = await fetch(
          `https://places.googleapis.com/v1/places:autocomplete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
            },
            body: JSON.stringify({
              input: value,
              includedRegionCodes: ['ZW'],
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          setLocationSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      }
    }, 300);
  };

  // Select location from autocomplete
  const selectLocation = async (placeId: string, text: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
          }
        }
      );

      if (response.ok) {
        const place = await response.json();
        setLocation(place.formattedAddress || place.displayName?.text || text);
        setShowLocationSuggestions(false);
        setLocationSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      toast.error('Could not get location details');
    }
  };

  const handleSubmit = () => {
    if (!selectedService) {
      toast.error('Please select a service');
      return;
    }
    if (!jobDescription || jobDescription.trim() === `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase()} to `) {
      toast.error('Please provide job description');
      return;
    }
    if (!budget) {
      toast.error('Please enter your budget');
      return;
    }
    if (!location) {
      toast.error('Please enter location');
      return;
    }

    // TODO: Handle submission (backend integration)
    const requestData = {
      service: selectedService,
      serviceName: services.find(s => s.id === selectedService)?.name,
      jobDescription,
      budget,
      location,
    };

    console.log('Home service request:', requestData);
    toast.success('Request submitted! We will find you a verified professional.');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

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
            <h1 className="text-2xl font-bold text-white">Home Services</h1>
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
          {/* Service Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">Select Service</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedService === service.id
                      ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`mb-2 ${selectedService === service.id ? 'text-nexryde-yellow' : 'text-white/70'}`}>
                      {service.icon}
                    </div>
                    <span className="text-white text-sm font-medium">{service.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Job Description */}
          {selectedService && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Job Description</h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Describe what you need..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent resize-none"
                rows={4}
              />
              <p className="text-white/60 text-xs mt-2">
                Complete the sentence above to describe your job requirements
              </p>
            </motion.div>
          )}

          {/* Budget */}
          {selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase()} to ` && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Budget</h2>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => {
                    // Allow only numbers
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setBudget(value);
                  }}
                  placeholder="Enter your budget (e.g., 100)"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
              </div>
              {budget && (
                <p className="text-white/60 text-sm mt-2">
                  Budget: ${parseFloat(budget || '0').toLocaleString()}
                </p>
              )}
            </motion.div>
          )}

          {/* Location */}
          {selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase()} to ` && budget && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Location</h2>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                <input
                  ref={locationInputRef}
                  type="text"
                  value={location}
                  onChange={(e) => handleLocationInput(e.target.value)}
                  onFocus={() => {
                    if (locationSuggestions.length > 0) {
                      setShowLocationSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowLocationSuggestions(false), 200);
                  }}
                  placeholder="Enter your location"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => {
                      const placeId = suggestion.placePrediction?.placeId;
                      const text = suggestion.placePrediction?.text?.text || '';
                      if (!placeId) return null;
                      return (
                        <button
                          key={index}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectLocation(placeId, text);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-white/20 transition-colors border-b border-white/10 last:border-b-0"
                        >
                          <p className="text-gray-800 font-medium">{text}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Info Message */}
          {selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase()} to ` && budget && location && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-500/20 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-blue-400/30"
            >
              <p className="text-white/90 text-sm">
                <strong className="text-white">Great!</strong> We will find you a verified professional to do the job for you at your own home. 
                Our professionals are background-checked and experienced.
              </p>
            </motion.div>
          )}

          {/* Submit Button */}
          {selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase()} to ` && budget && location && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <button
                onClick={handleSubmit}
                className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
              >
                Submit Request
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
