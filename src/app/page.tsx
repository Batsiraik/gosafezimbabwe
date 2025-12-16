'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Bike, MapPin, GraduationCap, Bus } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Handle module selection
  const handleModuleClick = (module: string) => {
    toast.success(`${module} service coming soon!`);
  };

  useEffect(() => {
    // Check if user is authenticated (only runs on client)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nexryde_token');
      const userData = localStorage.getItem('nexryde_user');
      
      if (token && userData) {
        setIsAuthenticated(true);
        // Redirect to dashboard if authenticated
        router.push('/dashboard');
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [router]);

  // Always render the login screen initially - this ensures consistent SSR/client render
  // The redirect will happen client-side if authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-nexryde-yellow rounded-full mx-auto mb-4 flex items-center justify-center"
              >
                <span className="text-2xl">🚗</span>
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">NexRyde</h1>
              <p className="text-white/80">Your ride app for Zimbabwe</p>
            </div>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/auth/register')}
                className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
              >
                Create Account
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/auth/login')}
                className="w-full bg-white/20 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/30 transition-all duration-200 border border-white/30"
              >
                Sign In
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker p-4">
      <div className="max-w-4xl mx-auto">
        {/* Service Modules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModuleClick('Ride')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            <Car className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white text-sm">Ride</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModuleClick('Send Parcel')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            <Bike className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white text-sm">Send Parcel</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModuleClick('City to City')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            <MapPin className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white text-sm">City to City/ Ride Share</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModuleClick('School Run')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            <GraduationCap className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white text-sm">School Run</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModuleClick('Bus Booking')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            <Bus className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white text-sm">Bus Booking</p>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
