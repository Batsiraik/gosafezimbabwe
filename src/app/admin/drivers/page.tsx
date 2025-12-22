'use client';

import { useEffect, useState } from 'react';
import { Car, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/admin/Pagination';

interface Driver {
  id: string;
  licenseNumber: string | null;
  licenseUrl: string | null;
  carPictureUrl: string | null;
  carRegistration: string | null;
  isVerified: boolean;
  isOnline: boolean;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDrivers();
  }, [currentPage]);

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/admin/drivers?page=${currentPage}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDrivers(data.drivers);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (driverId: string, verify: boolean) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/drivers', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId, isVerified: verify }),
      });

      if (response.ok) {
        toast.success(`Driver ${verify ? 'verified' : 'unverified'} successfully`);
        fetchDrivers();
      } else {
        toast.error('Failed to update driver');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Failed to update driver');
    }
  };

  const handleDelete = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/drivers', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });

      if (response.ok) {
        toast.success('Driver deleted successfully');
        fetchDrivers();
      } else {
        toast.error('Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Failed to delete driver');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Taxi Drivers Management</h1>
        <p className="text-gray-400">Manage taxi driver registrations</p>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Driver</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">License</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Car Registration</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{driver.user.fullName}</p>
                      <p className="text-gray-400 text-sm">{driver.user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{driver.licenseNumber || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-300">{driver.carRegistration || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {driver.isVerified ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!driver.isVerified && (
                        <button
                          onClick={() => handleVerify(driver.id, true)}
                          className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          title="Verify Driver"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {driver.isVerified && (
                        <button
                          onClick={() => handleVerify(driver.id, false)}
                          className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                          title="Unverify Driver"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(driver.id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title="Delete Driver"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Driver Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Name</label>
                <p className="text-white">{selectedDriver.user.fullName}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Phone</label>
                <p className="text-white">{selectedDriver.user.phone}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">License Number</label>
                <p className="text-white">{selectedDriver.licenseNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Car Registration</label>
                <p className="text-white">{selectedDriver.carRegistration || 'N/A'}</p>
              </div>
              {selectedDriver.licenseUrl && (
                <div>
                  <label className="text-gray-400 text-sm">License Document</label>
                  <img src={selectedDriver.licenseUrl} alt="License" className="mt-2 rounded-lg max-w-xs" />
                </div>
              )}
              {selectedDriver.carPictureUrl && (
                <div>
                  <label className="text-gray-400 text-sm">Car Picture</label>
                  <img src={selectedDriver.carPictureUrl} alt="Car" className="mt-2 rounded-lg max-w-xs" />
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedDriver(null)}
              className="mt-6 w-full bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
