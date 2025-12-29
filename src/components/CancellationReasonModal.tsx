'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';

interface CancellationReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customReason?: string) => void;
  isSubmitting?: boolean;
}

const PREDEFINED_REASONS = [
  'Changed my mind',
  'Found another ride',
  'Driver too far away',
  'Price too high',
  'No drivers available',
  'Emergency came up',
  'Wrong destination',
  'Other',
];

export default function CancellationReasonModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: CancellationReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const handleConfirm = () => {
    if (!selectedReason) {
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      return;
    }

    onConfirm(selectedReason, selectedReason === 'Other' ? customReason : undefined);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setCustomReason('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Cancel Ride</h2>
          </div>
          {!isSubmitting && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-gray-700">
            Please tell us why you're cancelling this ride. This helps us improve our service.
          </p>

          {/* Reason Options */}
          <div className="space-y-2">
            {PREDEFINED_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedReason === reason
                    ? 'border-nexryde-yellow bg-nexryde-yellow/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="cancellationReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-nexryde-yellow focus:ring-nexryde-yellow"
                />
                <span className="ml-3 text-gray-900 font-medium">{reason}</span>
              </label>
            ))}
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'Other' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify:
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Tell us why you're cancelling..."
                disabled={isSubmitting}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent resize-none"
              />
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Ride
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedReason || (selectedReason === 'Other' && !customReason.trim())}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Cancelling...' : 'Cancel Ride'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
