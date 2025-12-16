'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock forgot password - backend will be implemented later
    setTimeout(() => {
      toast.success('OTP sent to your phone! (Mock)');
      localStorage.setItem('temp_phone', phone);
      setIsLoading(false);
      router.push('/auth/reset-password');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={() => router.back()}
              className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-nexryde-yellow rounded-full mx-auto mb-4 flex items-center justify-center"
            >
              <span className="text-2xl">🚗</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Forgot Password</h1>
            <p className="text-white/80">Enter your phone number to reset password</p>
          </div>

          {/* Forgot Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0771234567"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </motion.button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <div className="text-white/70 text-sm">
              Remember your password?{' '}
              <button
                onClick={() => router.push('/auth/login')}
                className="text-nexryde-yellow hover:text-nexryde-yellow/80 transition-colors font-medium"
              >
                Sign in
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}