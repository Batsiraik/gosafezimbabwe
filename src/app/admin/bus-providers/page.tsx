'use client';

import { useEffect, useState } from 'react';
import { Bus, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/admin/Pagination';

interface BusProvider {
  id: string;
  nationalIdUrl: string | null;
  selfieUrl: string | null;
  isVerified: boolean;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
}

export default function AdminBusProvidersPage() {
  const [providers, setProviders] = useState<BusProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<BusProvider | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProviders();
  }, [currentPage]);

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/admin/bus-providers?page=${currentPage}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching bus providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (providerId: string, verify: boolean) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/bus-providers', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId, isVerified: verify }),
      });

      if (response.ok) {
        toast.success(`Bus provider ${verify ? 'verified' : 'unverified'} successfully`);
        fetchProviders();
      } else {
        toast.error('Failed to update provider');
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      toast.error('Failed to update provider');
    }
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this bus provider?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/bus-providers', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId }),
      });

      if (response.ok) {
        toast.success('Bus provider deleted successfully');
        fetchProviders();
      } else {
        toast.error('Failed to delete provider');
      }
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error('Failed to delete provider');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading bus providers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Bus Providers Management</h1>
        <p className="text-gray-400">Manage bus service provider registrations</p>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Provider</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Documents</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{provider.user.fullName}</p>
                      <p className="text-gray-400 text-sm">{provider.user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {provider.nationalIdUrl && (
                        <span className="text-green-400 text-xs">ID</span>
                      )}
                      {provider.selfieUrl && (
                        <span className="text-blue-400 text-xs">Selfie</span>
                      )}
                      {!provider.nationalIdUrl && !provider.selfieUrl && (
                        <span className="text-gray-500 text-xs">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {provider.isVerified ? (
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
                        onClick={() => setSelectedProvider(provider)}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!provider.isVerified && (
                        <button
                          onClick={() => handleVerify(provider.id, true)}
                          className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          title="Verify Provider"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {provider.isVerified && (
                        <button
                          onClick={() => handleVerify(provider.id, false)}
                          className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                          title="Unverify Provider"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title="Delete Provider"
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

      {/* Provider Details Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Bus Provider Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Name</label>
                <p className="text-white">{selectedProvider.user.fullName}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Phone</label>
                <p className="text-white">{selectedProvider.user.phone}</p>
              </div>
              {selectedProvider.nationalIdUrl && (
                <div>
                  <label className="text-gray-400 text-sm">National ID</label>
                  <img src={selectedProvider.nationalIdUrl} alt="National ID" className="mt-2 rounded-lg max-w-xs" />
                </div>
              )}
              {selectedProvider.selfieUrl && (
                <div>
                  <label className="text-gray-400 text-sm">Selfie</label>
                  <img src={selectedProvider.selfieUrl} alt="Selfie" className="mt-2 rounded-lg max-w-xs" />
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedProvider(null)}
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
