'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, Package, Wrench, Bus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BecomeProviderPage() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [checkingDriver, setCheckingDriver] = useState(false);

  const services = [
    {
      id: 'taxi',
      name: 'Taxi Driver',
      description: 'Provide ride services to passengers',
      icon: <Car className="w-8 h-8" />,
      route: '/driver/taxi/register',
    },
    {
      id: 'parcel',
      name: 'Parcel Delivery (Motorbike)',
      description: 'Deliver parcels using your motorbike',
      icon: <Package className="w-8 h-8" />,
      route: '/driver/parcel/register',
    },
    {
      id: 'home-service',
      name: 'Home Service Provider',
      description: 'Offer home services (plumber, electrician, etc.)',
      icon: <Wrench className="w-8 h-8" />,
      route: '/driver/home-services/register',
    },
    {
      id: 'bus',
      name: 'Bus Service Provider',
      description: 'Operate bus routes and schedules',
      icon: <Bus className="w-8 h-8" />,
      route: '/driver/bus/register',
    },
  ];

  const checkDriverStatus = async () => {
    try {
      setCheckingDriver(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/taxi/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.driver && data.driver.isVerified) {
          // Driver is verified, go to dashboard
          router.push('/driver/taxi/dashboard');
          return;
        } else if (data.driver && !data.driver.isVerified) {
          // Driver exists but not verified, go to dashboard (will show pending message)
          router.push('/driver/taxi/dashboard');
          return;
        }
      }
      
      // No driver profile or error, go to registration
      router.push('/driver/taxi/register');
    } catch (error) {
      console.error('Error checking driver status:', error);
      // On error, go to registration
      router.push('/driver/taxi/register');
    } finally {
      setCheckingDriver(false);
    }
  };

  const checkParcelDriverStatus = async () => {
    try {
      setCheckingDriver(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/parcel/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.driver && data.driver.isVerified) {
          router.push('/driver/parcel/dashboard');
          return;
        } else if (data.driver && !data.driver.isVerified) {
          router.push('/driver/parcel/dashboard');
          return;
        }
      }
      
      router.push('/driver/parcel/register');
    } catch (error) {
      console.error('Error checking parcel driver status:', error);
      router.push('/driver/parcel/register');
    } finally {
      setCheckingDriver(false);
    }
  };

  const checkHomeServiceProviderStatus = async () => {
    try {
      setCheckingDriver(true);
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/driver/home-services/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.provider && data.provider.isVerified) {
          router.push('/driver/home-services/dashboard');
          return;
        } else if (data.provider && !data.provider.isVerified) {
          router.push('/driver/home-services/dashboard');
          return;
        }
      }
      
      router.push('/driver/home-services/register');
    } catch (error) {
      console.error('Error checking home service provider status:', error);
      router.push('/driver/home-services/register');
    } finally {
      setCheckingDriver(false);
    }
  };

  const checkBusProviderStatus = async () => {
    try {
      setCheckingDriver(true);
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
        if (data.provider && data.provider.isVerified) {
          router.push('/driver/bus/dashboard');
          return;
        } else if (data.provider && !data.provider.isVerified) {
          router.push('/driver/bus/dashboard');
          return;
        }
      }
      
      router.push('/driver/bus/register');
    } catch (error) {
      console.error('Error checking bus provider status:', error);
      router.push('/driver/bus/register');
    } finally {
      setCheckingDriver(false);
    }
  };

  const handleServiceSelect = async (service: typeof services[0]) => {
    if (!service.route) {
      toast.success('This service provider option is coming soon!');
      return;
    }

    // For taxi driver, check if already registered/verified
    if (service.id === 'taxi') {
      await checkDriverStatus();
    } else if (service.id === 'parcel') {
      await checkParcelDriverStatus();
    } else if (service.id === 'home-service') {
      await checkHomeServiceProviderStatus();
    } else if (service.id === 'bus') {
      await checkBusProviderStatus();
    } else {
      router.push(service.route);
    }
  };

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
            <h1 className="text-2xl font-bold text-white">Become a Service Provider</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">What services do you offer?</h2>
            <p className="text-white/70 text-sm mb-6">
              Select the type of service you want to provide. You'll need to complete verification before you can start accepting requests.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  disabled={!service.route || checkingDriver}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedService === service.id
                      ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                      : service.route
                      ? 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                      : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
                  } ${checkingDriver && service.id === 'taxi' ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${
                      selectedService === service.id
                        ? 'bg-nexryde-yellow/30 text-nexryde-yellow'
                        : 'bg-white/10 text-white/70'
                    }`}>
                      {service.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{service.name}</h3>
                      <p className="text-white/60 text-sm">{service.description}</p>
                      {!service.route && (
                        <span className="inline-block mt-2 text-yellow-400 text-xs font-medium">
                          Coming Soon
                        </span>
                      )}
                      {checkingDriver && service.id === 'taxi' && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Loader2 className="w-4 h-4 text-nexryde-yellow animate-spin" />
                          <span className="text-nexryde-yellow text-xs">Checking status...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
