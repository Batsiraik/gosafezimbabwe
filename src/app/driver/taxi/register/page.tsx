'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, FileText, Car, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaxiDriverRegisterPage() {
  const router = useRouter();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [carRegistration, setCarRegistration] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [carPictureFile, setCarPictureFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [carPicturePreview, setCarPicturePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const carPictureInputRef = useRef<HTMLInputElement>(null);

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

  const handleCarPictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setCarPictureFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCarPicturePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!licenseNumber) {
      toast.error('Please enter your driver license number');
      return;
    }
    if (!carRegistration) {
      toast.error('Please enter your car registration number');
      return;
    }
    if (!licenseFile) {
      toast.error('Please upload your driver license');
      return;
    }
    if (!carPictureFile) {
      toast.error('Please upload a picture of your car showing the registration number');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login to continue');
        router.push('/auth/login');
        return;
      }

      // Convert files to base64
      const licenseBase64 = await convertFileToBase64(licenseFile);
      const carPictureBase64 = await convertFileToBase64(carPictureFile);

      const response = await fetch('/api/driver/taxi/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          licenseNumber,
          carRegistration,
          licenseUrl: licenseBase64,
          carPictureUrl: carPictureBase64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register as a driver');
      }

      toast.success('Registration submitted! Your documents are under review.');
      const { setUserMode } = require('@/lib/user-mode');
      setUserMode('taxi');
      router.push('/driver/taxi/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register. Please try again.');
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
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Register as a Driver</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Info Message */}
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-6">
            <p className="text-white/90 text-sm">
              <strong className="text-white">Verification Required:</strong> Please provide your driver's license and car registration details. 
              Your documents will be reviewed by our admin team before you can start accepting rides.
            </p>
          </div>

          {/* Driver License Number */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">Driver License Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  License Number
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="Enter your driver license number"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Driver License Photo
                </label>
                <div className="flex items-start space-x-4">
                  <div className="relative">
                    {licensePreview ? (
                      <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white/20">
                        <img 
                          src={licensePreview} 
                          alt="License" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={licenseInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLicenseUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => licenseInputRef.current?.click()}
                      className="w-full bg-white/10 text-white px-4 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-5 h-5" />
                      <span>{licensePreview ? 'Change License' : 'Upload License'}</span>
                    </button>
                    <p className="text-white/50 text-xs mt-2">Max size: 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Car Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">Car Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Car Registration Number
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                  <input
                    type="text"
                    value={carRegistration}
                    onChange={(e) => setCarRegistration(e.target.value.toUpperCase())}
                    placeholder="Enter car registration number"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Car Picture (showing registration number clearly)
                </label>
                <div className="mb-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-yellow-400 text-xs font-medium">
                    ⚠️ Important: The car picture must clearly show the registration number plate
                  </p>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="relative">
                    {carPicturePreview ? (
                      <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white/20">
                        <img 
                          src={carPicturePreview} 
                          alt="Car" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center">
                        <Car className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={carPictureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCarPictureUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => carPictureInputRef.current?.click()}
                      className="w-full bg-white/10 text-white px-4 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-5 h-5" />
                      <span>{carPicturePreview ? 'Change Picture' : 'Upload Car Picture'}</span>
                    </button>
                    <p className="text-white/50 text-xs mt-2">Max size: 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit for Verification</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
