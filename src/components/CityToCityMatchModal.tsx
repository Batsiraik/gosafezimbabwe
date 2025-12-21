'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, DollarSign, Users, Package, MessageCircle, User, Phone, Search, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Match {
  id: string;
  travelDate: string;
  pricePerPassenger?: number;
  willingToPay?: number;
  numberOfSeats?: number;
  maxBags?: number;
  neededSeats?: number;
  userBags?: number;
  note?: string | null;
  user: {
    id: string;
    fullName: string;
    phone: string;
    profilePictureUrl?: string | null;
  };
}

interface Suggestion extends Match {
  dateDifference: number;
}

interface MatchedDriver {
  id: string;
  matchId?: string; // Match ID for ending the ride
  driver: {
    id: string;
    fullName: string;
    phone: string;
    profilePictureUrl?: string | null;
  };
  travelDate: string;
  pricePerPassenger?: number;
  numberOfSeats?: number;
  maxBags?: number;
  note?: string | null;
  fromCity: {
    id: string;
    name: string;
    country: string | null;
  };
  toCity: {
    id: string;
    name: string;
    country: string | null;
  };
  matchedAt: string;
  status?: string; // Match status (active, completed, cancelled)
}

interface MatchedPassenger {
  id: string;
  matchId?: string; // Match ID for ending the ride
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  status?: string; // Match status (active, completed, cancelled)
}

interface CityToCityMatchModalProps {
  matches: Match[];
  suggestions: Suggestion[];
  matchedDrivers?: MatchedDriver[]; // For needs-car users to see who matched with them
  matchedPassengers?: MatchedPassenger[]; // For has-car users to see their matched passengers
  userRequest: {
    id: string;
    userType: string;
    fromCityId: string;
    toCityId: string;
    travelDate: string;
    numberOfSeats?: number;
  } | null;
  cities?: Array<{ id: string; name: string; country: string | null }>;
  onClose: () => void;
  onMatch: (matchId: string) => void;
  onCancel: () => void;
  onEndRide?: (matchId: string) => void; // Callback when ride is ended
}

export default function CityToCityMatchModal({
  matches,
  suggestions,
  matchedDrivers = [],
  matchedPassengers = [],
  userRequest,
  cities = [],
  onClose,
  onMatch,
  onCancel,
  onEndRide,
}: CityToCityMatchModalProps) {
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [endingRideId, setEndingRideId] = useState<string | null>(null);

  const handleMatch = async (matchId: string) => {
    setMatchingId(matchId);
    try {
      await onMatch(matchId);
    } finally {
      setMatchingId(null);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!userRequest) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 max-w-2xl w-full my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {userRequest.userType === 'has-car' 
                  ? (matchedPassengers.length > 0 ? 'My Matched Passengers' : 'Find Your Match')
                  : 'Matched Drivers'}
              </h2>
              <p className="text-white/70 text-sm mt-1">
                {cities.find(c => c.id === userRequest.fromCityId)?.name || 'N/A'} → {cities.find(c => c.id === userRequest.toCityId)?.name || 'N/A'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* For needs-car users: Show matched drivers */}
          {userRequest.userType === 'needs-car' && matchedDrivers.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <h3 className="text-white font-semibold text-lg">
                  {matchedDrivers.length === 1 ? 'Driver Matched!' : `${matchedDrivers.length} Drivers Matched!`}
                </h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                The following driver(s) want to share the ride with you:
              </p>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {matchedDrivers.map((matched) => (
                  <div
                    key={matched.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {matched.driver.profilePictureUrl ? (
                          <img
                            src={matched.driver.profilePictureUrl}
                            alt={matched.driver.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-nexryde-yellow/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-nexryde-yellow" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{matched.driver.fullName}</p>
                          <p className="text-white/60 text-xs">{matched.driver.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-white/70 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(matched.travelDate)}</span>
                      </div>
                      {matched.pricePerPassenger && (
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          <DollarSign className="w-4 h-4" />
                          <span>${matched.pricePerPassenger.toFixed(2)} per passenger</span>
                        </div>
                      )}
                      {matched.numberOfSeats && (
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          <Users className="w-4 h-4" />
                          <span>Available seats: {matched.numberOfSeats}, Max bags: {matched.maxBags || 0}</span>
                        </div>
                      )}
                      {matched.note && (
                        <div className="mt-2 p-2 bg-white/5 rounded-lg">
                          <p className="text-white/80 text-xs italic">"{matched.note}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCall(matched.driver.phone)}
                        className="flex-1 bg-white/10 text-white py-2 px-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Driver</span>
                      </button>
                      {onEndRide && matched.status !== 'completed' && (
                        <button
                          onClick={() => {
                            if (onEndRide) {
                              const matchId = matched.matchId || matched.id;
                              setEndingRideId(matchId);
                              onEndRide(matchId);
                            }
                          }}
                          disabled={endingRideId === (matched.matchId || matched.id)}
                          className="flex-1 bg-green-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {endingRideId === (matched.matchId || matched.id) ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Ending...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>End Ride</span>
                            </>
                          )}
                        </button>
                      )}
                      {matched.status === 'completed' && (
                        <div className="flex-1 bg-green-500/20 text-green-400 py-2 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 border border-green-500/30">
                          <CheckCircle className="w-4 h-4" />
                          <span>Ride Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* For needs-car users: No matches yet */}
          {userRequest.userType === 'needs-car' && matchedDrivers.length === 0 && (
            <div className="mb-6 text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-400/20 flex items-center justify-center">
                <Search className="w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-white font-medium text-lg mb-2">
                We're still searching...
              </p>
              <p className="text-white/70 text-sm">
                Drivers will see your request and can match with you. You'll be notified when someone matches!
              </p>
            </div>
          )}

          {/* For has-car users: Show matched passengers */}
          {userRequest.userType === 'has-car' && matchedPassengers.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <h3 className="text-white font-semibold text-lg">
                  {matchedPassengers.length === 1 ? 'Matched Passenger' : `${matchedPassengers.length} Matched Passengers`}
                </h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Passengers who have been matched with you:
              </p>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {matchedPassengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <User className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{passenger.user.fullName}</p>
                          <p className="text-white/60 text-xs">{passenger.user.phone}</p>
                        </div>
                      </div>
                    </div>

                    {passenger.willingToPay && (
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          <DollarSign className="w-4 h-4" />
                          <span>Willing to pay: ${passenger.willingToPay.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCall(passenger.user.phone)}
                        className="flex-1 bg-white/10 text-white py-2 px-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Passenger</span>
                      </button>
                      {onEndRide && passenger.status !== 'completed' && (
                        <button
                          onClick={() => {
                            if (onEndRide && passenger.matchId) {
                              setEndingRideId(passenger.matchId);
                              onEndRide(passenger.matchId);
                            }
                          }}
                          disabled={endingRideId === passenger.matchId}
                          className="flex-1 bg-green-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {endingRideId === passenger.matchId ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Ending...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>End Ride</span>
                            </>
                          )}
                        </button>
                      )}
                      {passenger.status === 'completed' && (
                        <div className="flex-1 bg-green-500/20 text-green-400 py-2 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 border border-green-500/30">
                          <CheckCircle className="w-4 h-4" />
                          <span>Ride Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider between matched passengers and available matches */}
          {userRequest.userType === 'has-car' && matchedPassengers.length > 0 && matches.length > 0 && (
            <div className="mb-6 border-t border-white/20 pt-6">
              <h3 className="text-white font-semibold text-lg mb-4">Available Passengers to Match</h3>
            </div>
          )}

          {/* For has-car users: Exact Matches */}
          {userRequest.userType === 'has-car' && matches.length > 0 ? (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <h3 className="text-white font-semibold text-lg">
                  {matches.length === 1 ? 'Match Found!' : `${matches.length} Matches Found!`}
                </h3>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {match.user.profilePictureUrl ? (
                          <img
                            src={match.user.profilePictureUrl}
                            alt={match.user.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-nexryde-yellow/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-nexryde-yellow" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{match.user.fullName}</p>
                          <p className="text-white/60 text-xs">{match.user.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-white/70 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(match.travelDate)}</span>
                      </div>
                      {match.pricePerPassenger && (
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          <DollarSign className="w-4 h-4" />
                          <span>${match.pricePerPassenger.toFixed(2)} per passenger</span>
                        </div>
                      )}
                      {match.willingToPay && (
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          <DollarSign className="w-4 h-4" />
                          <span>Willing to pay: ${match.willingToPay.toFixed(2)}</span>
                        </div>
                      )}
                      {match.numberOfSeats && (
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          <Users className="w-4 h-4" />
                          <span>Looking for {match.numberOfSeats} passenger(s), {match.maxBags || 0} bags max</span>
                        </div>
                      )}
                      {match.neededSeats && (
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          <Users className="w-4 h-4" />
                          <span>Needs {match.neededSeats} seat(s), {match.userBags || 0} bag(s)</span>
                        </div>
                      )}
                      {match.note && (
                        <div className="mt-2 p-2 bg-white/5 rounded-lg">
                          <p className="text-white/80 text-xs italic">"{match.note}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCall(match.user.phone)}
                        className="bg-white/10 text-white py-2 px-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="hidden sm:inline">Call</span>
                      </button>
                      <button
                        onClick={() => handleMatch(match.id)}
                        disabled={matchingId === match.id}
                        className="flex-1 bg-nexryde-yellow text-white py-2 px-4 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {matchingId === match.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Matching...</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4" />
                            <span>Accept Match</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : userRequest.userType === 'has-car' && matchedPassengers.length === 0 ? (
            <div className="mb-6 text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-400/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-white font-medium text-lg mb-2">
                No matches found yet
              </p>
              <p className="text-white/70 text-sm">
                We'll notify you as soon as we find someone traveling the same route!
              </p>
            </div>
          ) : null}

          {/* Suggestions (24h difference, only for needs-car users) */}
          {suggestions.length > 0 && userRequest.userType === 'needs-car' && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <h3 className="text-white font-semibold text-lg">
                  Alternative Options
                </h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                These drivers are traveling a day before or after your date. Consider adjusting your travel plans:
              </p>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {suggestion.user.profilePictureUrl ? (
                          <img
                            src={suggestion.user.profilePictureUrl}
                            alt={suggestion.user.fullName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-yellow-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium text-sm">{suggestion.user.fullName}</p>
                          <p className="text-yellow-400 text-xs">
                            {suggestion.dateDifference} day{suggestion.dateDifference > 1 ? 's' : ''} {new Date(suggestion.travelDate) > new Date(userRequest.travelDate) ? 'after' : 'before'} your date
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="flex items-center space-x-2 text-white/70 text-xs">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(suggestion.travelDate)}</span>
                      </div>
                      {suggestion.pricePerPassenger && (
                        <div className="flex items-center space-x-2 text-white/70 text-xs">
                          <DollarSign className="w-3 h-3" />
                          <span>${suggestion.pricePerPassenger.toFixed(2)} per passenger</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-white/20">
            <button
              onClick={onCancel}
              className="w-full bg-red-500/20 text-red-400 py-3 px-6 rounded-xl font-semibold hover:bg-red-500/30 transition-all duration-200"
            >
              Cancel Request
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/10 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
