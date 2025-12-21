'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, Settings as SettingsIcon, Upload, CheckCircle, XCircle, FileText, Camera, Trash2, AlertTriangle, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  fullName: string;
  phone: string;
  profilePictureUrl?: string | null;
  idDocumentUrl?: string | null;
  licenseUrl?: string | null;
  isVerified: boolean;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhone, setDeletePhone] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if user is logged in (only runs on client)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nexryde_token');
      
      if (!token) {
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }

      // Load user data from localStorage
      loadUserData();
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const loadUserData = async () => {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('nexryde_token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        // Fetch fresh user data from API
        const response = await fetch('/api/user/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Update localStorage with fresh data
          localStorage.setItem('nexryde_user', JSON.stringify(data.user));
        } else {
          // If 401, token might be invalid - silently fall back to localStorage
          if (response.status === 401) {
            // Token invalid or expired - clear it and use localStorage data
            localStorage.removeItem('nexryde_token');
          }
          // Fallback to localStorage if API fails
          const userData = localStorage.getItem('nexryde_user');
          if (userData) {
            try {
              const parsedUser = JSON.parse(userData);
              setUser(parsedUser);
            } catch (parseError) {
              console.error('Error parsing user data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback to localStorage
      const userData = localStorage.getItem('nexryde_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingId(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Convert file to base64
      const base64 = await convertFileToBase64(file);

      const response = await fetch('/api/user/upload-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ idDocumentUrl: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to upload ID document');
        return;
      }

      toast.success('ID document uploaded successfully!');
      setUser(data.user);
      localStorage.setItem('nexryde_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload ID document');
    } finally {
      setUploadingId(false);
      if (idFileInputRef.current) {
        idFileInputRef.current.value = '';
      }
    }
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingProfile(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Convert file to base64
      const base64 = await convertFileToBase64(file);

      const response = await fetch('/api/user/upload-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePictureUrl: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to upload profile picture');
        return;
      }

      toast.success('Profile picture uploaded successfully!');
      setUser(data.user);
      localStorage.setItem('nexryde_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingProfile(false);
      if (profileFileInputRef.current) {
        profileFileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexryde_token');
    localStorage.removeItem('nexryde_user');
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const handleDeleteAccount = async () => {
    if (!deletePhone) {
      toast.error('Please enter your phone number to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please login again');
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmPhone: deletePhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');
      
      // Clear local storage and redirect to login
      localStorage.removeItem('nexryde_token');
      localStorage.removeItem('nexryde_user');
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(error.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-nexryde-yellow/20 rounded-xl">
              <SettingsIcon className="w-6 h-6 text-nexryde-yellow" />
            </div>
            <h2 className="text-xl font-bold text-white">Account Information</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <User className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Full Name</p>
                <p className="text-white font-semibold text-lg">{user.fullName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Phone className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Phone Number</p>
                <p className="text-white font-semibold text-lg">{user.phone}</p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 font-medium">Phone Verified</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-semibold hover:bg-red-500/30 transition-colors"
                >
                  Logout
                </button>
              </div>
              <button
                onClick={() => router.push('/become-provider')}
                className="w-full bg-nexryde-yellow/20 hover:bg-nexryde-yellow/30 text-nexryde-yellow border border-nexryde-yellow/30 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Briefcase className="w-5 h-5" />
                <span>Become a Service Provider</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Identity Verification Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20 mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-nexryde-yellow/20 rounded-xl">
              <FileText className="w-6 h-6 text-nexryde-yellow" />
            </div>
            <h2 className="text-xl font-bold text-white">Identity Verification</h2>
          </div>

          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Important Note</p>
            <p className="text-white/80 text-sm">
              The person in your profile picture must match the person on your ID document. 
              If they don't match, we cannot verify your identity.
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Picture Upload */}
            <div>
              <label className="block text-white/70 text-sm font-medium mb-3">
                Profile Picture
              </label>
              <div className="flex items-start space-x-4">
                <div className="relative">
                  {user.profilePictureUrl ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white/20">
                      <img 
                        src={user.profilePictureUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={profileFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileUpload}
                    className="hidden"
                    disabled={uploadingProfile}
                  />
                  <button
                    onClick={() => profileFileInputRef.current?.click()}
                    disabled={uploadingProfile}
                    className="w-full bg-white/10 text-white px-4 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>{uploadingProfile ? 'Uploading...' : user.profilePictureUrl ? 'Change Picture' : 'Upload Picture'}</span>
                  </button>
                  <p className="text-white/50 text-xs mt-2">Max size: 5MB</p>
                </div>
              </div>
            </div>

            {/* ID Document Upload */}
            <div>
              <label className="block text-white/70 text-sm font-medium mb-3">
                ID Document
              </label>
              <div className="flex items-start space-x-4">
                <div className="relative">
                  {user.idDocumentUrl ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white/20">
                      <img 
                        src={user.idDocumentUrl} 
                        alt="ID Document" 
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
                    ref={idFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdUpload}
                    className="hidden"
                    disabled={uploadingId}
                  />
                  <button
                    onClick={() => idFileInputRef.current?.click()}
                    disabled={uploadingId}
                    className="w-full bg-white/10 text-white px-4 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>{uploadingId ? 'Uploading...' : user.idDocumentUrl ? 'Change ID' : 'Upload ID Document'}</span>
                  </button>
                  <p className="text-white/50 text-xs mt-2">Max size: 5MB</p>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="pt-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {user.isVerified ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="text-green-400 font-medium">Identity Verified</p>
                        <p className="text-white/50 text-xs">Your identity has been verified by our admin</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-yellow-400" />
                      <div>
                        <p className="text-yellow-400 font-medium">Pending Verification</p>
                        <p className="text-white/50 text-xs">
                          {user.idDocumentUrl && user.profilePictureUrl 
                            ? 'Waiting for admin review'
                            : 'Please upload your ID and profile picture'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Delete Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-red-500/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border-2 border-red-500/30"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Account</h2>
          </div>

          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium mb-1">⚠️ Warning: This action cannot be undone</p>
                <p className="text-white/80 text-sm">
                  Deleting your account will permanently remove all your data including bookings, requests, and verification status. 
                  This action is irreversible.
                </p>
              </div>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 px-6 rounded-xl font-semibold transition-all duration-200 border border-red-500/30"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Enter your phone number to confirm deletion
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                  <input
                    type="tel"
                    value={deletePhone}
                    onChange={(e) => setDeletePhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50"
                  />
                </div>
                <p className="text-white/60 text-xs mt-2">
                  Enter your registered phone number: {user.phone}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePhone('');
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !deletePhone}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}