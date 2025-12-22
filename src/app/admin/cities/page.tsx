'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/admin/Pagination';

interface City {
  id: string;
  name: string;
  country: string;
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCity, setNewCity] = useState({ name: '', country: 'Zimbabwe' });
  const [adding, setAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCities();
  }, [currentPage]);

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/admin/cities?page=${currentPage}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCities(data.cities);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCity.name.trim()) {
      toast.error('City name is required');
      return;
    }

    setAdding(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/cities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCity),
      });

      if (response.ok) {
        toast.success('City added successfully');
        setNewCity({ name: '', country: 'Zimbabwe' });
        setShowAddModal(false);
        fetchCities();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add city');
      }
    } catch (error) {
      console.error('Error adding city:', error);
      toast.error('Failed to add city');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (cityId: string) => {
    if (!confirm('Are you sure you want to delete this city?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/cities', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cityId }),
      });

      if (response.ok) {
        toast.success('City deleted successfully');
        fetchCities();
      } else {
        toast.error('Failed to delete city');
      }
    } catch (error) {
      console.error('Error deleting city:', error);
      toast.error('Failed to delete city');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading cities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Cities Management</h1>
          <p className="text-gray-400">Add and manage cities</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-nexryde-yellow text-white px-6 py-3 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add City</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">City Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Country</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {cities.map((city) => (
                <tr key={city.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-white font-medium">{city.name}</td>
                  <td className="px-6 py-4 text-gray-300">{city.country}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(city.id)}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="Delete City"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add City Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Add New City</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">City Name</label>
                <input
                  type="text"
                  value={newCity.name}
                  onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                  placeholder="Harare"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Country</label>
                <input
                  type="text"
                  value={newCity.country}
                  onChange={(e) => setNewCity({ ...newCity, country: e.target.value })}
                  placeholder="Zimbabwe"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCity({ name: '', country: 'Zimbabwe' });
                }}
                className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 bg-nexryde-yellow text-white py-3 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add City'}
              </button>
            </div>
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
