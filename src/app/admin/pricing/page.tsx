'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Save, Loader2, Car, Package, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPricingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    ridePricePerKm: 0.60,
    parcelPricePerKm: 0.40,
    parcelMinPrice: 2.00,
    whatsappNumber: '263776954448',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/pricing', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Settings saved successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-nexryde-yellow" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-nexryde-yellow/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-nexryde-yellow" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pricing & Settings</h1>
              <p className="text-white/70 text-sm">Manage app pricing and support settings</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Ride Pricing */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <Car className="w-5 h-5 text-nexryde-yellow" />
                <h2 className="text-xl font-semibold text-white">Ride Service Pricing</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Price per Kilometer (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.ridePricePerKm}
                    onChange={(e) =>
                      setSettings({ ...settings, ridePricePerKm: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                    placeholder="0.60"
                  />
                  <p className="text-white/60 text-xs mt-1">
                    Current: ${settings.ridePricePerKm.toFixed(2)} per km
                  </p>
                </div>
              </div>
            </div>

            {/* Parcel Delivery Pricing */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <Package className="w-5 h-5 text-nexryde-yellow" />
                <h2 className="text-xl font-semibold text-white">Parcel Delivery Pricing</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Price per Kilometer (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.parcelPricePerKm}
                    onChange={(e) =>
                      setSettings({ ...settings, parcelPricePerKm: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                    placeholder="0.40"
                  />
                  <p className="text-white/60 text-xs mt-1">
                    Current: ${settings.parcelPricePerKm.toFixed(2)} per km
                  </p>
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Minimum Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.parcelMinPrice}
                    onChange={(e) =>
                      setSettings({ ...settings, parcelMinPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                    placeholder="2.00"
                  />
                  <p className="text-white/60 text-xs mt-1">
                    Current minimum: ${settings.parcelMinPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp Support */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <MessageCircle className="w-5 h-5 text-nexryde-yellow" />
                <h2 className="text-xl font-semibold text-white">WhatsApp Support</h2>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Support Phone Number
                </label>
                <input
                  type="text"
                  value={settings.whatsappNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappNumber: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  placeholder="263776954448"
                />
                <p className="text-white/60 text-xs mt-1">
                  Format: Country code + number (e.g., 263776954448)
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-3 bg-nexryde-yellow text-gray-900 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
