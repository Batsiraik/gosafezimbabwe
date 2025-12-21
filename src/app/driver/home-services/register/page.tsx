'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  iconName: string;
  isActive: boolean;
}

export default function HomeServiceProviderRegisterPage() {
  const router = useRouter();
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const nationalIdInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
        toast.error('Failed to load services');
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleNationalIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setNationalIdFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setNationalIdPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setSelfieFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelfiePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nationalIdFile) {
      toast.error('Please upload your National ID');
      return;
    }

    if (!selfieFile) {
      toast.error('Please upload a recent selfie');
      return;
    }

    if (selectedServices.length === 0) {
      toast.error('Please select at least one service you want to provide');
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

      const nationalIdBase64 = await convertFileToBase64(nationalIdFile);
      const selfieBase64 = await convertFileToBase64(selfieFile);

      const response = await fetch('/api/driver/home-services/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nationalIdUrl: nationalIdBase64,
          selfieUrl: selfieBase64,
          serviceIds: selectedServices,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to register as service provider';
        const details = data.details ? ` Details: ${data.details}` : '';
        throw new Error(errorMsg + details);
      }

      toast.success('Registration submitted! Waiting for verification...');
      router.push('/driver/home-services/dashboard');
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
            <h1 className="text-2xl font-bold text-white">Register as Service Provider</h1>
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
              <FileText className="w-6 h-6 text-nexryde-yellow" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Home Service Provider</h2>
              <p className="text-white/70 text-sm">Complete your registration to start providing services</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* National ID Upload */}
            <div>
              <label className="block text-white font-medium mb-2">
                National ID Photo *
              </label>
              <div className="space-y-3">
                <input
                  ref={nationalIdInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNationalIdUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => nationalIdInputRef.current?.click()}
                  className="w-full bg-white/10 border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-nexryde-yellow/50 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-white/50 mb-2" />
                    <span className="text-white/70 text-sm">
                      {nationalIdFile ? 'Change National ID Photo' : 'Upload National ID Photo'}
                    </span>
                  </div>
                </button>
                {nationalIdPreview && (
                  <div className="relative">
                    <img
                      src={nationalIdPreview}
                      alt="National ID preview"
                      className="w-full h-48 object-contain rounded-xl border border-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNationalIdFile(null);
                        setNationalIdPreview(null);
                        if (nationalIdInputRef.current) nationalIdInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full"
                    >
                      <span className="text-white text-xs">Remove</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Selfie Upload */}
            <div>
              <label className="block text-white font-medium mb-2">
                Recent Selfie *
              </label>
              <p className="text-white/60 text-xs mb-2">
                Please upload a recent clear photo of yourself. The person in the selfie must match the person on your National ID.
              </p>
              <div className="space-y-3">
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full bg-white/10 border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-nexryde-yellow/50 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-white/50 mb-2" />
                    <span className="text-white/70 text-sm">
                      {selfieFile ? 'Change Selfie' : 'Upload Recent Selfie'}
                    </span>
                  </div>
                </button>
                {selfiePreview && (
                  <div className="relative">
                    <img
                      src={selfiePreview}
                      alt="Selfie preview"
                      className="w-full h-48 object-contain rounded-xl border border-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelfieFile(null);
                        setSelfiePreview(null);
                        if (selfieInputRef.current) selfieInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full"
                    >
                      <span className="text-white text-xs">Remove</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Service Selection */}
            <div>
              <label className="block text-white font-medium mb-2">
                Select Services You Provide * (Select one or more)
              </label>
              {loadingServices ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
                  <p className="text-white/70 text-sm">Loading services...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                  {services.filter(s => s.isActive).map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedServices.includes(service.id)
                          ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {selectedServices.includes(service.id) && (
                          <CheckCircle2 className="w-4 h-4 text-nexryde-yellow flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${
                          selectedServices.includes(service.id) ? 'text-white' : 'text-white/70'
                        }`}>
                          {service.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info Note */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> Your documents will be reviewed by our admin team. Verification may take a few hours. You'll be able to start accepting service requests once verified.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loadingServices}
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
