'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, FileText, Bike, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParcelDriverRegisterPage() {
  const router = useRouter();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bikeRegistration, setBikeRegistration] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [bikePictureFile, setBikePictureFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [bikePicturePreview, setBikePicturePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const bikePictureInputRef = useRef<HTMLInputElement>(null);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLicenseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setLicenseFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLicensePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBikePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setBikePictureFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBikePicturePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licenseNumber.trim()) {
      toast.error('Please enter your license number');
      return;
    }

    if (!licenseFile) {
      toast.error('Please upload your license photo');
      return;
    }

    if (!bikeRegistration.trim()) {
      toast.error('Please enter your bike registration number');
      return;
    }

    if (!bikePictureFile) {
      toast.error('Please upload a picture of your bike showing the registration number clearly');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        router.push('/auth/login');
        return;
      }

      const licenseBase64 = await convertFileToBase64(licenseFile);
      const bikePictureBase64 = await convertFileToBase64(bikePictureFile);

      const response = await fetch('/api/driver/parcel/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          licenseNumber: licenseNumber.trim(),
          licenseUrl: licenseBase64,
          bikeRegistration: bikeRegistration.trim(),
          bikePictureUrl: bikePictureBase64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register as parcel driver');
      }

      toast.success('Registration submitted! Waiting for verification...');
      router.push('/driver/parcel/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/settings')}
              className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Register as Parcel Driver</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
              <Bike className="w-6 h-6 text-nexryde-yellow" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Motorbike Parcel Delivery</h2>
              <p className="text-white/70 text-sm">Complete your registration to start delivering parcels</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* License Number */}
            <div>
              <label className="block text-white font-medium mb-2">
                Driver's License Number *
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Enter your license number"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                required
              />
            </div>

            {/* License Photo */}
            <div>
              <label className="block text-white font-medium mb-2">
                License Photo *
              </label>
              <div className="space-y-3">
                <input
                  ref={licenseInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLicenseUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => licenseInputRef.current?.click()}
                  className="w-full bg-white/10 border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-nexryde-yellow/50 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-white/50 mb-2" />
                    <span className="text-white/70 text-sm">
                      {licenseFile ? 'Change License Photo' : 'Upload License Photo'}
                    </span>
                  </div>
                </button>
                {licensePreview && (
                  <div className="relative">
                    <img
                      src={licensePreview}
                      alt="License preview"
                      className="w-full h-48 object-contain rounded-xl border border-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLicenseFile(null);
                        setLicensePreview(null);
                        if (licenseInputRef.current) licenseInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full"
                    >
                      <span className="text-white text-xs">Remove</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bike Registration */}
            <div>
              <label className="block text-white font-medium mb-2">
                Bike Registration Number *
              </label>
              <input
                type="text"
                value={bikeRegistration}
                onChange={(e) => setBikeRegistration(e.target.value)}
                placeholder="Enter your bike registration number"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                required
              />
            </div>

            {/* Bike Picture */}
            <div>
              <label className="block text-white font-medium mb-2">
                Bike Picture (Showing Registration Number) *
              </label>
              <p className="text-white/60 text-xs mb-2">
                Please upload a clear picture of your bike showing the registration number plate clearly visible
              </p>
              <div className="space-y-3">
                <input
                  ref={bikePictureInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBikePictureUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bikePictureInputRef.current?.click()}
                  className="w-full bg-white/10 border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-nexryde-yellow/50 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-white/50 mb-2" />
                    <span className="text-white/70 text-sm">
                      {bikePictureFile ? 'Change Bike Picture' : 'Upload Bike Picture'}
                    </span>
                  </div>
                </button>
                {bikePicturePreview && (
                  <div className="relative">
                    <img
                      src={bikePicturePreview}
                      alt="Bike preview"
                      className="w-full h-48 object-contain rounded-xl border border-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBikePictureFile(null);
                        setBikePicturePreview(null);
                        if (bikePictureInputRef.current) bikePictureInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full"
                    >
                      <span className="text-white text-xs">Remove</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> Your documents will be reviewed by our admin team. Verification may take a few hours. You'll be able to start accepting parcel delivery requests once verified.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-nexryde-yellow hover:bg-nexryde-yellow-dark text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Submit Registration</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
