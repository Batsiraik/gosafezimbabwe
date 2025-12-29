'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, DollarSign, Search, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getServiceIcon } from '@/lib/utils/service-icons';
import ActiveServiceModal from '@/components/ActiveServiceModal';

interface Service {
  id: string;
  name: string;
  iconName: string;
  isActive: boolean;
}

interface ActiveServiceRequest {
  id: string;
  serviceId: string;
  jobDescription: string;
  budget: number;
  location: string;
  status: string;
  createdAt: string;
  service: Service;
}

export default function HomeServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ActiveServiceRequest | null>(null);
  const [showActiveServiceModal, setShowActiveServiceModal] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const jobDescriptionRef = useRef<HTMLDivElement>(null);

  // Fetch services from API
  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      const data = await response.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services. Please refresh the page.');
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    checkActiveRequest();
  }, [fetchServices]);

  // Check for active service request
  const checkActiveRequest = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/services/requests/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.request) {
          setActiveRequest(data.request);
        } else {
          setActiveRequest(null);
        }
      }
    } catch (error) {
      console.error('Error checking active service request:', error);
    }
  }, []);

  // Check for active service request on mount and poll continuously
  useEffect(() => {
    // Check immediately on mount
    checkActiveRequest();
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
      checkActiveRequest();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update job description prefix when service changes and scroll to form
  useEffect(() => {
    if (selectedService) {
      const service = services.find(s => s.id === selectedService);
      const serviceName = service?.name.toLowerCase() || '';
      setJobDescription(`I am looking for a ${serviceName} to `);
      
      // Scroll to job description form after a short delay to ensure DOM is updated
      setTimeout(() => {
        if (jobDescriptionRef.current) {
          jobDescriptionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    } else {
      setJobDescription('');
    }
  }, [selectedService, services]);

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

  const handleSubmit = async () => {
    if (!selectedService) {
      toast.error('Please select a service');
      return;
    }
    const service = services.find(s => s.id === selectedService);
    if (!jobDescription || jobDescription.trim() === `I am looking for a ${service?.name.toLowerCase()} to `) {
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

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login to continue');
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/services/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedService,
          jobDescription: jobDescription.trim(),
          budget,
          location,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      toast.success('Request submitted! We will find you a verified professional.');
      
      // Reset form
      setSelectedService(null);
      setJobDescription('');
      setBudget('');
      setLocation('');
      
      // Check for active request
      await checkActiveRequest();
    } catch (error: any) {
      console.error('Error submitting service request:', error);
      toast.error(error.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Active Request Display - Show at top if exists */}
          {activeRequest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <Search className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Active Service Request</h3>
                    <p className="text-white/70 text-sm">
                      {activeRequest.service.name}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-white/70 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Requested {new Date(activeRequest.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-white/70 text-sm">
                  Budget: ${activeRequest.budget.toLocaleString()}
                </div>
                <div className="text-white/70 text-sm">
                  Location: {activeRequest.location}
                </div>
                <div className={`text-sm font-medium ${
                  activeRequest.status === 'searching' ? 'text-yellow-400' :
                  activeRequest.status === 'accepted' ? 'text-blue-400' :
                  activeRequest.status === 'in_progress' ? 'text-green-400' :
                  'text-white/70'
                }`}>
                  {activeRequest.status === 'searching' && 'Searching for service providers...'}
                  {activeRequest.status === 'pending' && 'Waiting for service provider to accept'}
                  {activeRequest.status === 'accepted' && 'Service provider is on the way'}
                  {activeRequest.status === 'in_progress' && 'Service in progress'}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowActiveServiceModal(true)}
                  className="flex-1 bg-nexryde-yellow text-white py-2 px-4 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          )}

          {/* Service Selection - Only show if no active request */}
          {!activeRequest && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">Select Service</h2>
            {loadingServices ? (
              <div className="text-center py-8">
                <p className="text-white/70">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/70">No services available at the moment.</p>
              </div>
            ) : (
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
                        {getServiceIcon(service.iconName, "w-6 h-6")}
                      </div>
                      <span className="text-white text-sm font-medium">{service.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Job Description - Only show if no active request */}
          {!activeRequest && selectedService && (
            <motion.div
              ref={jobDescriptionRef}
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

          {/* Budget - Only show if no active request */}
          {!activeRequest && selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase() || ''} to ` && (
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

          {/* Location - Only show if no active request */}
          {!activeRequest && selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase() || ''} to ` && budget && (
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

          {/* Info Message - Only show if no active request */}
          {!activeRequest && selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase() || ''} to ` && budget && location && (
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

          {/* Submit Button - Only show if no active request */}
          {!activeRequest && selectedService && jobDescription.trim() !== `I am looking for a ${services.find(s => s.id === selectedService)?.name.toLowerCase() || ''} to ` && budget && location && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Active Service Modal */}
      {showActiveServiceModal && activeRequest && (
        <ActiveServiceModal
          activeRequest={activeRequest}
          onClose={() => setShowActiveServiceModal(false)}
          onCancel={() => {
            setActiveRequest(null);
            setShowActiveServiceModal(false);
            checkActiveRequest();
          }}
        />
      )}
    </div>
  );
}
