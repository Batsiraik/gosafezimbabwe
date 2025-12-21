'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, Users, Package, Plus, Minus, MapPin, Calendar, Search, Clock, AlertCircle, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import CityToCityMatchModal from '@/components/CityToCityMatchModal';
import CustomSelect from '@/components/CustomSelect';

type UserType = 'has-car' | 'needs-car' | null;

interface City {
  id: string;
  name: string;
  country: string | null;
}

export default function CityToCityPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>(null);
  const [travelDate, setTravelDate] = useState<string>('');
  const [fromCityId, setFromCityId] = useState<string>('');
  const [toCityId, setToCityId] = useState<string>('');
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  
  // For users with car
  const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
  const [maxBags, setMaxBags] = useState<number>(0);
  const [pricePerPassenger, setPricePerPassenger] = useState<number>(0);
  
  // For users without car
  const [neededSeats, setNeededSeats] = useState<number>(1);
  const [userBags, setUserBags] = useState<number>(0);
  const [willingToPay, setWillingToPay] = useState<number>(0);

  // Note field for both
  const [note, setNote] = useState<string>('');

  // Backend integration
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [matchedDrivers, setMatchedDrivers] = useState<any[]>([]); // For needs-car users to see who matched with them
  const [matchedPassengers, setMatchedPassengers] = useState<any[]>([]); // For has-car users to see their matched passengers
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const searchPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const verificationWarningRef = useRef<HTMLDivElement>(null);

  const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number>>, max: number = 10) => {
    setter(prev => Math.min(prev + 1, max));
  };

  const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number>>, min: number = 0) => {
    setter(prev => Math.max(prev - 1, min));
  };

  // Removed calculateSuggestedPrice - users now enter their own prices

  // Stop polling helper
  const stopPollingMatches = useCallback(() => {
    if (searchPollIntervalRef.current) {
      clearInterval(searchPollIntervalRef.current);
      searchPollIntervalRef.current = null;
    }
  }, []);

  // Poll for matches (only for has-car users)
  const startPollingMatches = useCallback(() => {
    stopPollingMatches();

    searchPollIntervalRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('nexryde_token');
        if (!token) {
          stopPollingMatches();
          return;
        }

        // Only poll if user is has-car
        if (!activeRequest || activeRequest.userType !== 'has-car') {
          stopPollingMatches();
          return;
        }

        const response = await fetch('/api/city-to-city/search', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.expired) {
            toast.error('Your request has expired');
            setActiveRequest(null);
            setMatches([]);
            setSuggestions([]);
            setShowMatchModal(false);
            stopPollingMatches();
            return;
          }

          setMatches(data.matches || []);
          setSuggestions(data.suggestions || []);
          
          // Refresh matched passengers
          const activeResponse = await fetch('/api/city-to-city/active', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (activeResponse.ok) {
            const activeData = await activeResponse.json();
            if (activeData.activeRequest && activeData.activeRequest.matchedPassengers) {
              // Filter to only show active matches (not completed)
              const activePassengers = activeData.activeRequest.matchedPassengers.filter((p: any) => p.status === 'active');
              setMatchedPassengers(activePassengers);
              
              // Check if all seats are filled
              if (activeData.activeRequest.numberOfSeats && 
                  activePassengers.length >= activeData.activeRequest.numberOfSeats) {
                // All seats filled - stop polling but keep modal open to show matched passengers
                stopPollingMatches();
                setActiveRequest((prev: any) => prev ? { ...prev, status: 'matched' } : null);
                setShowMatchModal(true);
                return;
              }
            }
          }
          
          // Show modal if there are matches or matched passengers
          if ((data.matches && data.matches.length > 0) || matchedPassengers.length > 0) {
            setShowMatchModal(true);
          }
        }
      } catch (error) {
        console.error('Error polling matches:', error);
      }
    }, 10000); // Poll every 10 seconds
  }, [stopPollingMatches, activeRequest, matchedPassengers]);

  // Check for matched drivers (for needs-car users)
  const checkMatchedDrivers = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/city-to-city/matched', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show active matches (not completed)
        const activeMatches = (data.matches || []).filter((m: any) => m.status === 'active');
        setMatchedDrivers(activeMatches);
        
        // If there are active matched drivers, show the modal
        if (activeMatches.length > 0) {
          setShowMatchModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking matched drivers:', error);
    }
  }, []);

  // Search for matches (only for has-car users)
  const searchMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/city-to-city/search', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.expired) {
          toast.error('Your request has expired');
          setActiveRequest(null);
          setMatches([]);
          setSuggestions([]);
          setShowMatchModal(false);
          stopPollingMatches();
          return;
        }

        setMatches(data.matches || []);
        setSuggestions(data.suggestions || []);
        
        // If all seats are filled, don't show modal
        if (data.message === 'All seats are filled') {
          setActiveRequest((prev: any) => prev ? { ...prev, status: 'matched' } : null);
          setShowMatchModal(false);
          stopPollingMatches();
          toast.success('All seats filled!');
          return;
        }
        
        if (data.matches && data.matches.length > 0) {
          setShowMatchModal(true);
        }
      }
    } catch (error) {
      console.error('Error searching matches:', error);
    }
  }, [stopPollingMatches, activeRequest]);

  // Check for active request and search matches
  const checkActiveRequest = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) return;

      const response = await fetch('/api/city-to-city/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.activeRequest) {
          setActiveRequest(data.activeRequest);
          
          // If user is needs-car, check for matched drivers
          if (data.activeRequest.userType === 'needs-car') {
            await checkMatchedDrivers();
            // Poll for matched drivers every 10 seconds
            if (searchPollIntervalRef.current) {
              clearInterval(searchPollIntervalRef.current);
            }
            searchPollIntervalRef.current = setInterval(checkMatchedDrivers, 10000);
          } else {
            // If user is has-car, get matched passengers and search for new matches
            if (data.activeRequest.matchedPassengers && data.activeRequest.matchedPassengers.length > 0) {
              // Filter to only show active matches (not completed)
              const activePassengers = data.activeRequest.matchedPassengers.filter((p: any) => p.status === 'active');
              setMatchedPassengers(activePassengers);
              if (activePassengers.length > 0) {
                setShowMatchModal(true);
              }
            }
            
            // Call searchMatches directly (it's defined above)
            const searchResponse = await fetch('/api/city-to-city/search', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              if (searchData.expired) {
                toast.error('Your request has expired');
                setActiveRequest(null);
                setMatches([]);
                setSuggestions([]);
                setMatchedPassengers([]);
                setShowMatchModal(false);
                stopPollingMatches();
                return;
              }

              setMatches(searchData.matches || []);
              setSuggestions(searchData.suggestions || []);
              
              // Refresh matched passengers to check if all seats are filled
              const activeCheckResponse = await fetch('/api/city-to-city/active', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (activeCheckResponse.ok) {
                const activeCheckData = await activeCheckResponse.json();
                if (activeCheckData.activeRequest) {
                  if (activeCheckData.activeRequest.matchedPassengers) {
                    // Filter to only show active matches (not completed)
                    const activePassengers = activeCheckData.activeRequest.matchedPassengers.filter((p: any) => p.status === 'active');
                    setMatchedPassengers(activePassengers);
                    
                    // Check if all seats are filled
                    if (activeCheckData.activeRequest.numberOfSeats && 
                        activePassengers.length >= activeCheckData.activeRequest.numberOfSeats) {
                      // All seats filled - stop polling but keep modal open
                      stopPollingMatches();
                      setActiveRequest((prev: any) => prev ? { ...prev, status: 'matched' } : null);
                      setShowMatchModal(true);
                      return;
                    }
                  }
                }
              }
              
              // Show modal if there are new matches or matched passengers
              if (searchData.matches && searchData.matches.length > 0) {
                setShowMatchModal(true);
              }
            }
            startPollingMatches();
          }
        } else {
          setActiveRequest(null);
          setMatches([]);
          setSuggestions([]);
          setMatchedDrivers([]);
          setMatchedPassengers([]);
          setShowMatchModal(false);
          stopPollingMatches();
        }
      }
    } catch (error) {
      console.error('Error checking active request:', error);
    }
  }, [startPollingMatches, stopPollingMatches, checkMatchedDrivers]);

  // Handle matching with another user (only for has-car users)
  const handleMatch = useCallback(async (matchId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in again');
        return;
      }

      // Only has-car users can match
      if (!activeRequest || activeRequest.userType !== 'has-car') {
        toast.error('Only drivers can accept matches');
        return;
      }

      const response = await fetch('/api/city-to-city/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ matchRequestId: matchId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to match');
        return;
      }

      toast.success('Successfully matched! The passenger will be notified.');
      
      // Refresh active request to get updated matched passengers
      const activeResponse = await fetch('/api/city-to-city/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
          if (activeData.activeRequest) {
            setActiveRequest(activeData.activeRequest);
            if (activeData.activeRequest.matchedPassengers && activeData.activeRequest.matchedPassengers.length > 0) {
              // Filter to only show active matches (not completed)
              const activePassengers = activeData.activeRequest.matchedPassengers.filter((p: any) => p.status === 'active');
              setMatchedPassengers(activePassengers);
              if (activePassengers.length > 0) {
                setShowMatchModal(true); // Show modal to see matched passengers
              }
            }
          }
      }
      
      // Refresh matches to remove the matched one and check if all seats are filled
      const refreshResponse = await fetch('/api/city-to-city/search', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (refreshResponse.ok) {
        const matchData = await refreshResponse.json();
        setMatches(matchData.matches || []);
        
        // Refresh active request to check if all seats are now filled
        const finalActiveResponse = await fetch('/api/city-to-city/active', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (finalActiveResponse.ok) {
          const finalActiveData = await finalActiveResponse.json();
            if (finalActiveData.activeRequest) {
              setActiveRequest(finalActiveData.activeRequest);
              if (finalActiveData.activeRequest.matchedPassengers) {
                // Filter to only show active matches (not completed)
                const activePassengers = finalActiveData.activeRequest.matchedPassengers.filter((p: any) => p.status === 'active');
                setMatchedPassengers(activePassengers);
                
                // Check if all seats are filled
                if (finalActiveData.activeRequest.numberOfSeats && 
                    activePassengers.length >= finalActiveData.activeRequest.numberOfSeats) {
                  stopPollingMatches();
                  setShowMatchModal(true); // Keep modal open to show matched passengers
                  toast.success('All seats filled!');
                } else if (activePassengers.length > 0) {
                  setShowMatchModal(true); // Show modal with updated matches
                }
              }
            }
        }
      }
    } catch (error) {
      console.error('Match error:', error);
      toast.error('Failed to match. Please try again.');
    }
  }, [activeRequest, stopPollingMatches, searchMatches]);

  // Handle end ride
  const handleEndRide = useCallback(async (matchId: string) => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in again');
        return;
      }

      const response = await fetch('/api/city-to-city/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to end ride');
        return;
      }

      toast.success('Ride share completed successfully!');
      
      // Check if the user's request was completed (all matches ended)
      const requestCompleted = (activeRequest?.userType === 'needs-car' && data.passengerRequestCompleted) ||
                               (activeRequest?.userType === 'has-car' && data.driverRequestCompleted);
      
      if (requestCompleted) {
        // All matches completed, clear active request so user can create a new one
        setActiveRequest(null);
        setMatches([]);
        setSuggestions([]);
        setMatchedDrivers([]);
        setMatchedPassengers([]);
        setShowMatchModal(false);
        stopPollingMatches();
        toast.success('All rides completed! You can now create a new request.');
      } else {
        // Still have active matches, refresh to show updated list
        await checkActiveRequest();
        
        // Also refresh matched drivers/passengers
        if (activeRequest?.userType === 'needs-car') {
          await checkMatchedDrivers();
        } else if (activeRequest?.userType === 'has-car') {
          const activeResponse = await fetch('/api/city-to-city/active', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (activeResponse.ok) {
            const activeData = await activeResponse.json();
            if (activeData.activeRequest?.matchedPassengers) {
              const activePassengers = activeData.activeRequest.matchedPassengers.filter((p: any) => p.status === 'active');
              setMatchedPassengers(activePassengers);
              // If no more active passengers, clear the request
              if (activePassengers.length === 0) {
                setActiveRequest(null);
                setShowMatchModal(false);
                stopPollingMatches();
              }
            } else {
              // No active request means all matches completed
              setActiveRequest(null);
              setMatchedPassengers([]);
              setShowMatchModal(false);
              stopPollingMatches();
            }
          }
        }
      }
    } catch (error) {
      console.error('End ride error:', error);
      toast.error('Failed to end ride. Please try again.');
    }
  }, [checkActiveRequest, activeRequest, checkMatchedDrivers]);

  // Handle cancel request
  const handleCancelRequest = useCallback(async () => {
    if (!activeRequest) return;

    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in again');
        return;
      }

      const response = await fetch('/api/city-to-city/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: activeRequest.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel request');
        return;
      }

      toast.success('Request cancelled successfully');
      setActiveRequest(null);
      setMatches([]);
      setSuggestions([]);
      setShowMatchModal(false);
      stopPollingMatches();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel request');
    }
  }, [activeRequest, stopPollingMatches]);

  const handleSendRequest = async () => {
    // Check verification before submitting
    if (!isVerified) {
      toast.error('Please verify your identity first');
      router.push('/settings');
      return;
    }

    if (!userType) {
      toast.error('Please select whether you have a car or need a ride');
      return;
    }
    if (!travelDate) {
      toast.error('Please select travel date');
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
    if (userType === 'has-car' && (!pricePerPassenger || pricePerPassenger <= 0)) {
      toast.error('Please enter price per passenger');
      return;
    }
    if (userType === 'needs-car' && (!willingToPay || willingToPay <= 0)) {
      toast.error('Please enter how much you are willing to pay');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in to send a request');
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/city-to-city/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userType,
          travelDate,
          fromCityId,
          toCityId,
          ...(userType === 'has-car' 
            ? { numberOfSeats, maxBags, pricePerPassenger }
            : { neededSeats, userBags, willingToPay }
          ),
          note: note || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create request');
        return;
      }

      toast.success('Request created! Searching for matches...');
      // Refresh active request and search for matches
      await checkActiveRequest();
    } catch (error) {
      console.error('Request error:', error);
      toast.error('Failed to create request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check user verification status
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const token = localStorage.getItem('nexryde_token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch('/api/user/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsVerified(data.user?.isVerified || false);
        } else if (response.status === 401) {
          toast.error('Please login again');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      } finally {
        setLoadingVerification(false);
      }
    };

    checkVerification();
  }, [router]);

  // Fetch cities from database
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('/api/cities');
        if (response.ok) {
          const data = await response.json();
          setCities(data.cities || []);
          
          // If no cities exist, seed them
          if (data.cities.length === 0) {
            const seedResponse = await fetch('/api/cities/seed', { method: 'POST' });
            if (seedResponse.ok) {
              const seedData = await seedResponse.json();
              // Fetch again after seeding
              const refreshResponse = await fetch('/api/cities');
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setCities(refreshData.cities || []);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
        toast.error('Failed to load cities');
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  // Check for active request on mount - show immediately
  useEffect(() => {
    checkActiveRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // When active request loads, automatically search for matches
  useEffect(() => {
    if (activeRequest && activeRequest.status === 'searching') {
      // Small delay to ensure state is set
      const timer = setTimeout(() => {
        searchMatches();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequest?.id]); // Run when activeRequest changes

  // Show modal when matches are found
  useEffect(() => {
    if (matches.length > 0 && activeRequest) {
      setShowMatchModal(true);
    }
  }, [matches.length, activeRequest]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPollingMatches();
    };
  }, [stopPollingMatches]);

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
          {/* Identity Verification Warning */}
          {!loadingVerification && isVerified === false && (
            <motion.div
              ref={verificationWarningRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border-2 border-red-500/50 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-red-400 font-semibold text-lg mb-2">
                    Identity Verification Required
                  </h3>
                  <p className="text-white/90 mb-4">
                    You cannot use the City-to-City Ride Share service unless you verify your identity. 
                    Please verify your identity to continue.
                  </p>
                  <button
                    onClick={() => router.push('/settings')}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Verify Identity Now</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

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
                    <h3 className="text-white font-semibold">Active Ride Share Request</h3>
                    <p className="text-white/70 text-sm">
                      {activeRequest.fromCity?.name || cities.find(c => c.id === activeRequest.fromCityId)?.name || 'N/A'} → {activeRequest.toCity?.name || cities.find(c => c.id === activeRequest.toCityId)?.name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-white/70 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(activeRequest.travelDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {activeRequest.userType === 'has-car' && (
                  <div className="text-white/70 text-sm">
                    Looking for {activeRequest.numberOfSeats || 1} passenger(s) • ${activeRequest.pricePerPassenger?.toFixed(2) || '0.00'} per passenger
                  </div>
                )}
                {activeRequest.userType === 'needs-car' && (
                  <div className="text-white/70 text-sm">
                    Willing to pay: ${activeRequest.willingToPay?.toFixed(2) || '0.00'}
                  </div>
                )}
                {activeRequest.userType === 'has-car' && activeRequest.matchedPassengers && activeRequest.matchedPassengers.length > 0 && (
                  <div className="text-green-400 text-sm font-medium">
                    ✓ Matched with {activeRequest.matchedPassengers.length} of {activeRequest.numberOfSeats || 1} passenger(s)
                  </div>
                )}
                {activeRequest.status === 'matched' && activeRequest.userType === 'needs-car' && (
                  <div className="text-green-400 text-sm font-medium">
                    ✓ Successfully matched!
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    searchMatches();
                    setShowMatchModal(true);
                  }}
                  className="flex-1 bg-blue-500/20 text-blue-400 py-2 px-4 rounded-xl font-semibold hover:bg-blue-500/30 transition-all duration-200"
                >
                  View Matches
                </button>
                <button
                  onClick={handleCancelRequest}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* User Type Selection - Only show if no active request */}
          {!activeRequest && (
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
          )}

          {/* Date and City Selection - Only show if no active request */}
          {!activeRequest && userType && (
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
              <CustomSelect
                label="From City"
                value={fromCityId}
                onChange={setFromCityId}
                placeholder="Select from city"
                disabled={loadingCities}
                icon={<MapPin className="w-5 h-5 text-white/50" />}
                options={cities.map(city => ({ value: city.id, label: city.name }))}
              />

              {/* To City */}
              <CustomSelect
                label="To City"
                value={toCityId}
                onChange={setToCityId}
                placeholder="Select to city"
                disabled={loadingCities}
                icon={<MapPin className="w-5 h-5 text-white/50" />}
                options={cities.map(city => ({ value: city.id, label: city.name }))}
              />
            </motion.div>
          )}

          {/* Info Message */}
          {userType && travelDate && fromCityId && toCityId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-500/20 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-blue-400/30"
            >
              <p className="text-white/90 text-sm">
                <strong className="text-white">Note:</strong> We'll help you find verified riders to share your journey with. 
                {userType === 'has-car' && pricePerPassenger > 0 && (
                  <>Price per passenger: <span className="text-nexryde-yellow font-semibold">${pricePerPassenger.toFixed(2)}</span></>
                )}
                {userType === 'needs-car' && willingToPay > 0 && (
                  <>You're willing to pay: <span className="text-nexryde-yellow font-semibold">${willingToPay.toFixed(2)}</span></>
                )}
              </p>
            </motion.div>
          )}

          {/* Options for Users with Car - Only show if no active request */}
          {!activeRequest && userType === 'has-car' && travelDate && fromCityId && toCityId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 space-y-6"
            >
              <h2 className="text-white font-semibold text-lg mb-4">Ride Details</h2>
              
              {/* Number of Seats */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-medium">Number of Passengers</p>
                    <p className="text-white/60 text-sm">How many passengers do you want?</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDecrement(setNumberOfSeats, 1)}
                    disabled={numberOfSeats <= 1}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white font-bold text-xl w-8 text-center">{numberOfSeats}</span>
                  <button
                    onClick={() => handleIncrement(setNumberOfSeats, 8)}
                    disabled={numberOfSeats >= 8}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Price Per Passenger */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Price Per Passenger ($)
                </label>
                <input
                  type="number"
                  value={pricePerPassenger || ''}
                  onChange={(e) => setPricePerPassenger(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="Enter price per passenger"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
                <p className="text-white/60 text-xs mt-1">How much do you want each passenger to pay?</p>
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

              {/* Note Field */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., I want to be dropped at the city center, flexible on time..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* Options for Users without Car - Only show if no active request */}
          {!activeRequest && userType === 'needs-car' && travelDate && fromCityId && toCityId && (
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

              {/* Willing to Pay */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  How Much Are You Willing to Pay? ($)
                </label>
                <input
                  type="number"
                  value={willingToPay || ''}
                  onChange={(e) => setWillingToPay(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="Enter amount you're willing to pay"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
                <p className="text-white/60 text-xs mt-1">How much are you willing to pay for the ride?</p>
              </div>

              {/* Note Field */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., I need to be picked up at the bus station, flexible on time..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* Send Request Button - Only show if no active request */}
          {!activeRequest && userType && travelDate && fromCityId && toCityId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <button
                onClick={() => {
                  if (!isVerified) {
                    // Scroll to warning message
                    verificationWarningRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                    });
                    toast.error('Please verify your identity to continue');
                    return;
                  }
                  handleSendRequest();
                }}
                disabled={isSubmitting || !isVerified}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  isVerified
                    ? 'bg-nexryde-yellow text-white hover:bg-nexryde-yellow-dark'
                    : 'bg-gray-500/50 text-white/70 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Creating Request...' : isVerified ? 'Send Request' : 'Verify Identity to Continue'}
              </button>
              {!isVerified && (
                <p className="text-white/60 text-xs mt-2 text-center">
                  Click the button above to see verification requirements
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Match Modal */}
      {showMatchModal && (
        <CityToCityMatchModal
          matches={matches}
          suggestions={suggestions}
          matchedDrivers={matchedDrivers}
          matchedPassengers={matchedPassengers}
          userRequest={activeRequest}
          cities={cities}
          onClose={() => setShowMatchModal(false)}
          onMatch={handleMatch}
          onCancel={handleCancelRequest}
          onEndRide={handleEndRide}
        />
      )}
    </div>
  );
}
