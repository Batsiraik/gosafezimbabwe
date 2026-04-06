/**
 * API client – same backend as Next.js (Vercel).
 * All routes: https://gosafezimbabwe.vercel.app/api/*
 */
const API_BASE = 'https://gosafezimbabwe.vercel.app';

type ApiOptions = RequestInit & { token?: string };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers: optHeaders, ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(optHeaders as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed');
  }
  return data as T;
}

// Auth – same routes as Next.js
export type LoginBody = { phone: string; password: string };
export type LoginResponse = { token: string; user: Record<string, unknown> };
export type RegisterBody = { fullName: string; phone: string; password: string };
export type RegisterResponse = { message?: string; token: string; user: Record<string, unknown> };
export type VerifyOtpBody = { phone: string; otp: string };
export type VerifyOtpResponse = { token: string; user: Record<string, unknown> };
export type ForgotPasswordBody = { phone: string };
export type ResetPasswordBody = { phone: string; otp: string; newPassword: string };

export const authApi = {
  login: (body: LoginBody) =>
    api<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: RegisterBody) =>
    api<RegisterResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  verifyOtp: (body: VerifyOtpBody) =>
    api<VerifyOtpResponse>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: ForgotPasswordBody) =>
    api<{ message?: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: ResetPasswordBody) =>
    api<{ message?: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
};

// Dashboard & settings (token required)
export const settingsApi = {
  whatsapp: (token: string) => api<{ number?: string }>('/api/settings/whatsapp', { token }),
  cities: (token: string) => api<{ cities?: Array<{ id: string; name: string }> }>('/api/cities', { token }),
  pushToken: (token: string, pushToken: string) =>
    api<{ message?: string }>('/api/users/push-token', { method: 'POST', body: JSON.stringify({ pushToken }), token }),
  userMe: (token: string) => api<{ user?: Record<string, unknown> }>('/api/user/me', { token }),
  uploadProfile: (token: string, body: { profilePictureUrl: string }) =>
    api<{ user?: Record<string, unknown> }>('/api/user/upload-profile', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    }),
  uploadId: (token: string, body: { idDocumentUrl: string }) =>
    api<{ user?: Record<string, unknown> }>('/api/user/upload-id', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    }),
  deleteAccount: (token: string, body: { confirmPhone: string }) =>
    api<{ message?: string }>('/api/user/delete', {
      method: 'DELETE',
      body: JSON.stringify(body),
      token,
    }),
};

// City-to-city
export const cityToCityApi = {
  active: (token: string) => api<{ activeRequest?: Record<string, unknown>; expired?: boolean }>('/api/city-to-city/active', { token }),
  create: (token: string, body: Record<string, unknown>) =>
    api<Record<string, unknown>>('/api/city-to-city/create', { method: 'POST', body: JSON.stringify(body), token }),
  search: (token: string) =>
    api<{ matches?: unknown[]; suggestions?: unknown[]; expired?: boolean; message?: string }>('/api/city-to-city/search', { token }),
  matched: (token: string) =>
    api<{ matches?: unknown[]; userRequest?: Record<string, unknown> }>('/api/city-to-city/matched', { token }),
  match: (token: string, body: { matchRequestId: string }) =>
    api<{ message?: string }>('/api/city-to-city/match', { method: 'POST', body: JSON.stringify(body), token }),
  cancel: (token: string, requestId: string) =>
    api<{ message?: string }>('/api/city-to-city/cancel', { method: 'POST', body: JSON.stringify({ requestId }), token }),
};

// Services (home services)
export type ServiceBid = {
  id: string;
  bidPrice: number;
  message: string | null;
  status: string;
  createdAt: string;
  serviceProvider: {
    id: string;
    averageRating?: number;
    totalRatings?: number;
    user: { id: string; fullName: string; phone: string };
  };
};
export type ServiceRateBody = { serviceRequestId: string; rateeId: string; raterType: string; rateeType: string; rating: number; review?: string | null };
export const servicesApi = {
  active: (token: string) => api<{ request?: Record<string, unknown> }>('/api/services/requests/active', { token }),
  create: (token: string, body: Record<string, unknown>) =>
    api<Record<string, unknown>>('/api/services/requests/create', { method: 'POST', body: JSON.stringify(body), token }),
  list: (token: string) =>
    api<{ services?: Array<{ id: string; name: string; iconName?: string }> }>('/api/services', { token }),
  cancel: (token: string, requestId: string) =>
    api<{ message?: string; request?: Record<string, unknown> }>('/api/services/requests/cancel', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
      token,
    }),
  bids: (token: string, requestId: string) =>
    api<{ bids: ServiceBid[]; count: number }>(`/api/services/requests/bids?requestId=${encodeURIComponent(requestId)}`, { token }),
  acceptBid: (token: string, bidId: string) =>
    api<{ message?: string }>('/api/services/requests/bids/accept', { method: 'POST', body: JSON.stringify({ bidId }), token }),
  rateCheck: (token: string, requestId: string) =>
    api<{ hasRated: boolean }>(`/api/services/requests/rate/check?requestId=${encodeURIComponent(requestId)}`, { token }),
  submitRating: (token: string, body: ServiceRateBody) =>
    api<{ rating?: unknown }>('/api/rides/rate', { method: 'POST', body: JSON.stringify(body), token }),
};

// Nearby drivers (no auth) – for ride map markers
export type NearbyDriver = { userId: string; lat: number; lng: number; distance: number; driverName: string };
export const driversNearbyApi = {
  get: (params: { lat: number; lng: number; radius?: number; serviceType?: 'taxi' | 'parcel' }) => {
    const q = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
      radius: String(params.radius ?? 10),
      serviceType: params.serviceType ?? 'taxi',
    }).toString();
    return api<{ drivers: NearbyDriver[]; count: number }>(`/api/drivers/nearby?${q}`);
  },
};

// Pricing
export const pricingApi = {
  get: (token: string) =>
    api<{
      ridePricePerKm?: number;
      rideMinPrice?: number;
      parcelPricePerKm?: number;
      parcelMinPrice?: number;
    }>('/api/pricing', { token }),
};

// Rides – backend requires lat/lng, distance, price (use placeholder coords until Phase 4 maps)
export type RideCreateBody = {
  pickupLat: number; pickupLng: number; pickupAddress: string;
  destinationLat: number; destinationLng: number; destinationAddress: string;
  distance: number; price: number; isRoundTrip?: boolean;
};
export type RideBid = {
  id: string;
  bidPrice: number;
  status: string;
  createdAt: string;
  driver: {
    id: string;
    carRegistration: string;
    averageRating?: number;
    totalRatings?: number;
    user: { id: string; fullName: string; phone: string; profilePictureUrl?: string | null };
  };
};
export type RateBody = { rideId: string; rateeId: string; raterType: string; rateeType: string; rating: number; review?: string | null };
export const ridesApi = {
  active: (token: string) => api<{ ride?: Record<string, unknown>; activeRide?: Record<string, unknown> }>('/api/rides/active', { token }),
  create: (token: string, body: RideCreateBody) =>
    api<Record<string, unknown>>('/api/rides/create', { method: 'POST', body: JSON.stringify(body), token }),
  cancel: (token: string, body: { rideId: string; reason: string; customReason?: string }) =>
    api<{ message?: string }>('/api/rides/cancel', { method: 'POST', body: JSON.stringify(body), token }),
  bids: (token: string, rideId: string) =>
    api<{ bids: RideBid[]; count: number }>(`/api/rides/bids?rideId=${encodeURIComponent(rideId)}`, { token }),
  acceptBid: (token: string, bidId: string) =>
    api<{ message?: string }>('/api/rides/bids/accept', { method: 'POST', body: JSON.stringify({ bidId }), token }),
  history: (token: string) => api<{ rides?: unknown[] }>('/api/rides/history', { token }),
  rateCheck: (token: string, rideId: string) =>
    api<{ hasRated: boolean }>(`/api/rides/rate/check?rideId=${encodeURIComponent(rideId)}`, { token }),
  submitRating: (token: string, body: RateBody) =>
    api<{ rating?: unknown }>('/api/rides/rate', { method: 'POST', body: JSON.stringify(body), token }),
};

// Parcels – backend requires lat/lng, distance, price
export type ParcelCreateBody = {
  vehicleType: 'motorbike';
  pickupLat: number; pickupLng: number; pickupAddress: string;
  deliveryLat: number; deliveryLng: number; deliveryAddress: string;
  distance: number; price: number;
};
export type ParcelBid = {
  id: string;
  bidPrice: number;
  status: string;
  createdAt: string;
  driver: {
    id: string;
    licenseNumber: string;
    carRegistration: string;
    averageRating?: number;
    totalRatings?: number;
    user: { id: string; fullName: string; phone: string };
  };
};
export type ParcelRateBody = { parcelId: string; rateeId: string; raterType: string; rateeType: string; rating: number; review?: string | null };
export const parcelsApi = {
  active: (token: string) => api<{ parcel?: Record<string, unknown>; activeParcel?: Record<string, unknown> }>('/api/parcels/active', { token }),
  create: (token: string, body: ParcelCreateBody) =>
    api<Record<string, unknown>>('/api/parcels/create', { method: 'POST', body: JSON.stringify(body), token }),
  cancel: (token: string, body: { parcelId: string }) =>
    api<{ message?: string }>('/api/parcels/cancel', { method: 'POST', body: JSON.stringify(body), token }),
  bids: (token: string, parcelId: string) =>
    api<{ bids: ParcelBid[]; count: number }>(`/api/parcels/bids?parcelId=${encodeURIComponent(parcelId)}`, { token }),
  acceptBid: (token: string, bidId: string) =>
    api<{ message?: string }>('/api/parcels/bids/accept', { method: 'POST', body: JSON.stringify({ bidId }), token }),
  rateCheck: (token: string, parcelId: string) =>
    api<{ hasRated: boolean }>(`/api/parcels/rate/check?parcelId=${encodeURIComponent(parcelId)}`, { token }),
  submitRating: (token: string, body: ParcelRateBody) =>
    api<{ rating?: unknown }>('/api/rides/rate', { method: 'POST', body: JSON.stringify(body), token }),
};

// Buses – search uses fromCityId, toCityId, travelDate (YYYY-MM-DD)
export type BusSearchResult = {
  id: string;
  departureTime: string;
  arrivalTime?: string;
  station: string;
  price: number;
  availableSeats: number;
  fromCity: string;
  toCity: string;
};
export const busesApi = {
  search: (token: string, params: { fromCityId: string; toCityId: string; travelDate: string }) => {
    const q = new URLSearchParams({
      fromCityId: params.fromCityId,
      toCityId: params.toCityId,
      travelDate: params.travelDate,
    }).toString();
    return api<{ buses?: BusSearchResult[] }>(`/api/buses/search?${q}`, { token });
  },
  createBooking: (token: string, body: { busScheduleId: string; travelDate: string; numberOfTickets: number }) =>
    api<{ booking?: { totalPrice: number }; error?: string }>('/api/buses/bookings/create', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    }),
  cancelBooking: (token: string, bookingId: string) =>
    api<{ message?: string; error?: string }>('/api/buses/bookings/cancel', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
      token,
    }),
  bookings: (token: string) => api<{ bookings?: unknown[] }>('/api/buses/bookings', { token }),
  activeBooking: (token: string) => api<{ booking?: unknown }>('/api/buses/bookings/active', { token }),
};

// Placeholder image (minimal 1x1 PNG) for driver registration until Phase 4 image picker
export const PLACEHOLDER_IMAGE_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Driver – taxi
export type DriverTaxiProfile = { id: string; licenseNumber: string; carRegistration: string; isVerified: boolean; isOnline: boolean; currentLat: number | null; currentLng: number | null; averageRating?: number; totalRatings?: number };
export const driverTaxiApi = {
  status: (token: string) => api<{ driver: DriverTaxiProfile | null }>('/api/driver/taxi/status', { token }),
  register: (token: string, body: { licenseNumber: string; carRegistration: string; licenseUrl: string; carPictureUrl: string }) =>
    api<{ driver?: unknown; message?: string }>('/api/driver/taxi/register', { method: 'POST', body: JSON.stringify(body), token }),
  updateVehicle: (token: string, body: { carRegistration: string; carPictureUrl: string }) =>
    api<{ driver?: unknown; message?: string }>('/api/driver/taxi/vehicle', { method: 'PATCH', body: JSON.stringify(body), token }),
  pendingRides: (token: string) => api<{ rides?: unknown[] }>('/api/driver/taxi/rides/pending', { token }),
  placeBid: (token: string, body: { rideId: string; bidPrice: number }) =>
    api<{ message?: string }>('/api/driver/taxi/rides/bid', { method: 'POST', body: JSON.stringify(body), token }),
  onlineStatus: (token: string, isOnline: boolean) =>
    api<{ message?: string }>('/api/driver/taxi/online-status', { method: 'POST', body: JSON.stringify({ isOnline }), token }),
  location: (token: string, lat: number, lng: number) =>
    api<{ message?: string }>('/api/driver/taxi/location', { method: 'POST', body: JSON.stringify({ lat, lng }), token }),
  startRide: (token: string, rideId: string) =>
    api<{ message?: string }>('/api/driver/taxi/rides/start', { method: 'POST', body: JSON.stringify({ rideId }), token }),
  endRide: (token: string, rideId: string) =>
    api<{ message?: string }>('/api/driver/taxi/rides/end', { method: 'POST', body: JSON.stringify({ rideId }), token }),
  pendingBids: (token: string) => api<{ bids?: unknown[] }>('/api/driver/taxi/bids/pending', { token }),
  rideHistory: (token: string) => api<{ rides?: unknown[] }>('/api/driver/taxi/rides/history', { token }),
};

// Driver – parcel
export type DriverParcelProfile = { id: string; licenseNumber: string; carRegistration: string; isVerified: boolean; isOnline: boolean; currentLat: number | null; currentLng: number | null };
export const driverParcelApi = {
  status: (token: string) => api<{ driver: DriverParcelProfile | null }>('/api/driver/parcel/status', { token }),
  register: (token: string, body: { licenseNumber: string; licenseUrl: string; bikeRegistration: string; bikePictureUrl: string }) =>
    api<{ driver?: unknown; message?: string }>('/api/driver/parcel/register', { method: 'POST', body: JSON.stringify(body), token }),
  updateVehicle: (token: string, body: { bikeRegistration: string; bikePictureUrl: string }) =>
    api<{ driver?: unknown; message?: string }>('/api/driver/parcel/vehicle', { method: 'PATCH', body: JSON.stringify(body), token }),
  pendingParcels: (token: string) => api<{ parcels?: unknown[] }>('/api/driver/parcel/parcels/pending', { token }),
  placeBid: (token: string, body: { parcelId: string; bidPrice: number }) =>
    api<{ message?: string }>('/api/driver/parcel/parcels/bid', { method: 'POST', body: JSON.stringify(body), token }),
  onlineStatus: (token: string, isOnline: boolean) =>
    api<{ message?: string }>('/api/driver/parcel/online-status', { method: 'POST', body: JSON.stringify({ isOnline }), token }),
  location: (token: string, lat: number, lng: number) =>
    api<{ message?: string }>('/api/driver/parcel/location', { method: 'POST', body: JSON.stringify({ lat, lng }), token }),
  startDelivery: (token: string, parcelId: string) =>
    api<{ message?: string }>('/api/driver/parcel/parcels/start', { method: 'POST', body: JSON.stringify({ parcelId }), token }),
  endDelivery: (token: string, parcelId: string) =>
    api<{ message?: string }>('/api/driver/parcel/parcels/end', { method: 'POST', body: JSON.stringify({ parcelId }), token }),
  pendingBids: (token: string) => api<{ bids?: unknown[] }>('/api/driver/parcel/bids/pending', { token }),
  history: (token: string) => api<{ parcels?: unknown[] }>('/api/driver/parcel/parcels/history', { token }),
};

// Driver – home-services (provider)
export type HomeServicesProviderProfile = { id: string; isVerified: boolean };
export const driverHomeServicesApi = {
  status: (token: string) => api<{ provider: HomeServicesProviderProfile | null }>('/api/driver/home-services/status', { token }),
  register: (token: string, body: { nationalIdUrl: string; selfieUrl: string; serviceIds: string[] }) =>
    api<{ provider?: unknown; message?: string }>('/api/driver/home-services/register', { method: 'POST', body: JSON.stringify(body), token }),
  pendingRequests: (token: string) => api<{ requests?: unknown[] }>('/api/driver/home-services/requests/pending', { token }),
  placeBid: (token: string, body: { requestId: string; bidPrice: number; message?: string }) =>
    api<{ message?: string }>('/api/driver/home-services/requests/bid', { method: 'POST', body: JSON.stringify(body), token }),
  pendingBids: (token: string) => api<{ bids?: unknown[] }>('/api/driver/home-services/bids/pending', { token }),
  acceptedRequests: (token: string) => api<{ requests?: unknown[] }>('/api/driver/home-services/requests/accepted', { token }),
  startRequest: (token: string, requestId: string) =>
    api<{ message?: string }>('/api/services/requests/start', { method: 'POST', body: JSON.stringify({ requestId }), token }),
  completeRequest: (token: string, requestId: string) =>
    api<{ message?: string }>('/api/services/requests/complete', { method: 'POST', body: JSON.stringify({ requestId }), token }),
};

// Driver – bus (provider)
export type BusProviderProfile = { id: string; isVerified: boolean };
export const driverBusApi = {
  status: (token: string) => api<{ provider: BusProviderProfile | null }>('/api/driver/bus/status', { token }),
  register: (token: string, body: { nationalIdUrl: string; selfieUrl: string }) =>
    api<{ provider?: unknown; message?: string }>('/api/driver/bus/register', { method: 'POST', body: JSON.stringify(body), token }),
  bookings: (token: string) => api<{ bookings?: unknown[] }>('/api/driver/bus/bookings', { token }),
  confirmBooking: (token: string, bookingId: string) =>
    api<{ message?: string }>('/api/driver/bus/bookings/confirm', { method: 'POST', body: JSON.stringify({ bookingId }), token }),
  schedules: (token: string) => api<{ schedules?: unknown[] }>('/api/driver/bus/schedules', { token }),
  createSchedule: (token: string, body: Record<string, unknown>) =>
    api<{ schedule?: unknown }>('/api/driver/bus/schedules', { method: 'POST', body: JSON.stringify(body), token }),
};

// Legacy driver status (for become-provider quick check)
export const driverApi = {
  taxiStatus: (token: string) => api<{ driver?: unknown }>('/api/driver/taxi/status', { token }),
  parcelStatus: (token: string) => api<{ driver?: unknown }>('/api/driver/parcel/status', { token }),
  homeServicesStatus: (token: string) => api<{ provider?: unknown }>('/api/driver/home-services/status', { token }),
  busStatus: (token: string) => api<{ provider?: unknown }>('/api/driver/bus/status', { token }),
};
