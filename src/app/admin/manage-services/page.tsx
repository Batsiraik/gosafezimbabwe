'use client';

import { useEffect, useState } from 'react';
import { Wrench, Plus, Edit2, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getServiceIcon, getAvailableIconNames } from '@/lib/utils/service-icons';
import Pagination from '@/components/admin/Pagination';

interface Service {
  id: string;
  name: string;
  iconName: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminManageServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    iconName: 'Wrench',
  });
  const [availableIcons] = useState<string[]>(getAvailableIconNames());

  useEffect(() => {
    fetchServices();
  }, [currentPage]);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/admin/manage-services?page=${currentPage}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/manage-services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Service added successfully');
        setShowAddModal(false);
        setFormData({ name: '', iconName: 'Wrench' });
        fetchServices();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add service');
      }
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      iconName: service.iconName,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingService || !formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/manage-services', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: editingService.id,
          name: formData.name,
          iconName: formData.iconName,
        }),
      });

      if (response.ok) {
        toast.success('Service updated successfully');
        setShowEditModal(false);
        setEditingService(null);
        setFormData({ name: '', iconName: 'Wrench' });
        fetchServices();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/manage-services', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: service.id,
          isActive: !service.isActive,
        }),
      });

      if (response.ok) {
        toast.success(`Service ${!service.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchServices();
      } else {
        toast.error('Failed to update service status');
      }
    } catch (error) {
      console.error('Error toggling service status:', error);
      toast.error('Failed to update service status');
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/manage-services', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceId }),
      });

      if (response.ok) {
        toast.success('Service deleted successfully');
        fetchServices();
      } else {
        toast.error('Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-nexryde-yellow" />
            Manage Services
          </h1>
          <button
            onClick={() => {
              setFormData({ name: '', iconName: 'Wrench' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-nexryde-yellow text-gray-900 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Service
          </button>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Icon</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Service Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Icon Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-lg">
                        {getServiceIcon(service.iconName, 'w-6 h-6 text-nexryde-yellow')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">{service.name}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{service.iconName}</td>
                    <td className="px-6 py-4">
                      {service.isActive ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(service)}
                          className={`p-2 rounded-lg transition-colors ${
                            service.isActive
                              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                          title={service.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {service.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="Edit Service"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          title="Delete Service"
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

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Add Service Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Add New Service</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Service Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Plumber, Electrician"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Icon</label>
                    <div className="grid grid-cols-6 gap-2 mb-3 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded-lg">
                      {availableIcons.map((iconName) => (
                        <button
                          key={iconName}
                          onClick={() => setFormData({ ...formData, iconName })}
                          className={`p-2 rounded-lg transition-colors ${
                            formData.iconName === iconName
                              ? 'bg-nexryde-yellow text-gray-900'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                          title={iconName}
                        >
                          {getServiceIcon(iconName, 'w-5 h-5')}
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs">Selected: {formData.iconName}</p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex-1 bg-nexryde-yellow text-gray-900 py-3 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors"
                  >
                    Add Service
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Service Modal */}
        <AnimatePresence>
          {showEditModal && editingService && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Edit Service</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingService(null);
                    }}
                    className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Service Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Plumber, Electrician"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Icon</label>
                    <div className="grid grid-cols-6 gap-2 mb-3 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded-lg">
                      {availableIcons.map((iconName) => (
                        <button
                          key={iconName}
                          onClick={() => setFormData({ ...formData, iconName })}
                          className={`p-2 rounded-lg transition-colors ${
                            formData.iconName === iconName
                              ? 'bg-nexryde-yellow text-gray-900'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                          title={iconName}
                        >
                          {getServiceIcon(iconName, 'w-5 h-5')}
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs">Selected: {formData.iconName}</p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingService(null);
                    }}
                    className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 bg-nexryde-yellow text-gray-900 py-3 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors"
                  >
                    Update Service
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
