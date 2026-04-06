'use client';

import { useEffect, useState } from 'react';
import { Edit2, Eye, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/admin/Pagination';

interface BusSchedule {
  id: string;
  fromCityId: string;
  toCityId: string;
  departureTime: string;
  station: string;
  price: number;
  totalSeats: number;
  daysOfWeek: string;
  isActive: boolean;
  fromCity: { id: string; name: string };
  toCity: { id: string; name: string };
  busProvider: {
    user: {
      fullName: string;
      phone: string;
    };
  };
}

type VerifiedProvider = {
  id: string;
  isVerified: boolean;
  user: { id: string; fullName: string; phone: string };
};

type CityOption = { id: string; name: string };

function scheduleStation(s: BusSchedule & { busStation?: string }) {
  return s.station ?? s.busStation ?? '—';
}

export default function AdminBusSchedulesPage() {
  const [schedules, setSchedules] = useState<BusSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<BusSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<BusSchedule | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    departureTime: '',
    busStation: '',
    price: 0,
    totalSeats: 0,
    daysOfWeek: '',
    isActive: true,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [verifiedProviders, setVerifiedProviders] = useState<VerifiedProvider[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    busProviderId: '',
    fromCityId: '',
    toCityId: '',
    departureTime: '',
    arrivalTime: '',
    station: '',
    price: '' as string | number,
    totalSeats: '' as string | number,
    daysOfWeek: 'daily',
    conductorPhone: '',
    isActive: true,
  });

  useEffect(() => {
    fetchSchedules();
  }, [currentPage]);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/admin/bus-schedules?page=${currentPage}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching bus schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreateLookups = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const [provRes, cityRes] = await Promise.all([
        fetch('/api/admin/bus-providers?verifiedOnly=true&limit=500&page=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/cities?limit=500&page=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (provRes.ok) {
        const d = await provRes.json();
        setVerifiedProviders(d.providers ?? []);
      }
      if (cityRes.ok) {
        const d = await cityRes.json();
        setCities(d.cities ?? []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load providers or cities');
    }
  };

  const openCreate = () => {
    setCreateForm({
      busProviderId: '',
      fromCityId: '',
      toCityId: '',
      departureTime: '',
      arrivalTime: '',
      station: '',
      price: '',
      totalSeats: '',
      daysOfWeek: 'daily',
      conductorPhone: '',
      isActive: true,
    });
    setShowCreate(true);
    void loadCreateLookups();
  };

  const handleCreate = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    if (!createForm.busProviderId) {
      toast.error('Select a verified bus provider');
      return;
    }
    if (!createForm.fromCityId || !createForm.toCityId) {
      toast.error('Select from and to cities');
      return;
    }
    if (createForm.fromCityId === createForm.toCityId) {
      toast.error('From and to cities must differ');
      return;
    }
    const price = Number(createForm.price);
    const totalSeats = Number(createForm.totalSeats);
    if (!createForm.departureTime || !createForm.station.trim()) {
      toast.error('Departure time and station are required');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Enter a valid price');
      return;
    }
    if (!Number.isFinite(totalSeats) || totalSeats < 1) {
      toast.error('Enter total seats (at least 1)');
      return;
    }
    setCreateSubmitting(true);
    try {
      const response = await fetch('/api/admin/bus-schedules', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          busProviderId: createForm.busProviderId,
          fromCityId: createForm.fromCityId,
          toCityId: createForm.toCityId,
          departureTime: createForm.departureTime,
          arrivalTime: createForm.arrivalTime.trim() || undefined,
          station: createForm.station.trim(),
          price,
          totalSeats,
          daysOfWeek: createForm.daysOfWeek.trim() || 'daily',
          conductorPhone: createForm.conductorPhone.trim() || undefined,
          isActive: createForm.isActive,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success('Schedule created — it will show for that provider in the app');
        setShowCreate(false);
        fetchSchedules();
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to create schedule');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create schedule');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEdit = (schedule: BusSchedule & { busStation?: string }) => {
    setEditingSchedule(schedule);
    setFormData({
      departureTime: schedule.departureTime,
      busStation: scheduleStation(schedule),
      price: schedule.price,
      totalSeats: schedule.totalSeats,
      daysOfWeek: schedule.daysOfWeek,
      isActive: schedule.isActive,
    });
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/bus-schedules', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleId: editingSchedule.id,
          ...formData,
        }),
      });

      if (response.ok) {
        toast.success('Bus schedule updated successfully');
        setEditingSchedule(null);
        fetchSchedules();
      } else {
        toast.error('Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading bus schedules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bus Schedules</h1>
          <p className="text-gray-400">
            View and edit schedules. New schedules are tied to a verified bus provider and appear in their driver app.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-nexryde-yellow text-white font-semibold hover:bg-nexryde-yellow-dark transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
          Add schedule
        </button>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Route</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Time</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Station</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Price</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Seats</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Days</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Provider</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{schedule.fromCity.name} → {schedule.toCity.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{schedule.departureTime}</td>
                  <td className="px-6 py-4 text-gray-300">{scheduleStation(schedule)}</td>
                  <td className="px-6 py-4 text-gray-300">${schedule.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-300">{schedule.totalSeats}</td>
                  <td className="px-6 py-4 text-gray-300">{schedule.daysOfWeek}</td>
                  <td className="px-6 py-4">
                    {schedule.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-300 text-sm">
                    {schedule.busProvider?.user?.fullName || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedSchedule(schedule)}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                        title="Edit Schedule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-1">Add bus schedule</h2>
            <p className="text-gray-400 text-sm mb-4">
              Assign to a verified bus provider from{' '}
              <a href="/admin/bus-providers" className="text-nexryde-yellow hover:underline">
                Bus providers
              </a>
              . The schedule appears in that account (app + web).
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Verified bus provider *</label>
                <select
                  value={createForm.busProviderId}
                  onChange={(e) => setCreateForm({ ...createForm, busProviderId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                >
                  <option value="">Select provider…</option>
                  {verifiedProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.fullName} — {p.user.phone}
                    </option>
                  ))}
                </select>
                {verifiedProviders.length === 0 && (
                  <p className="text-amber-400 text-xs mt-1">No verified providers. Verify one under Bus providers first.</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">From city *</label>
                  <select
                    value={createForm.fromCityId}
                    onChange={(e) => setCreateForm({ ...createForm, fromCityId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  >
                    <option value="">From…</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">To city *</label>
                  <select
                    value={createForm.toCityId}
                    onChange={(e) => setCreateForm({ ...createForm, toCityId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  >
                    <option value="">To…</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Departure time *</label>
                  <input
                    type="time"
                    value={createForm.departureTime}
                    onChange={(e) => setCreateForm({ ...createForm, departureTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Arrival time</label>
                  <input
                    type="time"
                    value={createForm.arrivalTime}
                    onChange={(e) => setCreateForm({ ...createForm, arrivalTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Station / terminal *</label>
                <input
                  type="text"
                  value={createForm.station}
                  onChange={(e) => setCreateForm({ ...createForm, station: e.target.value })}
                  placeholder="e.g. Roadport"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Price (USD) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={createForm.price}
                    onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Total seats *</label>
                  <input
                    type="number"
                    min={1}
                    value={createForm.totalSeats}
                    onChange={(e) => setCreateForm({ ...createForm, totalSeats: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Days of week</label>
                <input
                  type="text"
                  value={createForm.daysOfWeek}
                  onChange={(e) => setCreateForm({ ...createForm, daysOfWeek: e.target.value })}
                  placeholder="daily or monday,wednesday,friday"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Conductor phone</label>
                <input
                  type="text"
                  value={createForm.conductorPhone}
                  onChange={(e) => setCreateForm({ ...createForm, conductorPhone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                  id="create-active"
                />
                <label htmlFor="create-active" className="text-gray-300">
                  Active
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={createSubmitting}
                className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={createSubmitting}
                className="flex-1 bg-nexryde-yellow text-white py-3 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors disabled:opacity-50"
              >
                {createSubmitting ? 'Saving…' : 'Create schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Bus Schedule</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Departure Time</label>
                <input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Bus Station</label>
                <input
                  type="text"
                  value={formData.busStation}
                  onChange={(e) => setFormData({ ...formData, busStation: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Price</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Total Seats</label>
                <input
                  type="number"
                  value={formData.totalSeats}
                  onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Days of Week</label>
                <input
                  type="text"
                  value={formData.daysOfWeek}
                  onChange={(e) => setFormData({ ...formData, daysOfWeek: e.target.value })}
                  placeholder="daily, monday,wednesday,friday"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
                />
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label className="text-gray-300">Active</label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingSchedule(null)}
                className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 bg-nexryde-yellow text-white py-3 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedSchedule && !editingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Bus Schedule Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Route</label>
                <p className="text-white">{selectedSchedule.fromCity.name} → {selectedSchedule.toCity.name}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Departure Time</label>
                <p className="text-white">{selectedSchedule.departureTime}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Bus Station</label>
                <p className="text-white">{scheduleStation(selectedSchedule)}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Price</label>
                <p className="text-white">${selectedSchedule.price.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Total Seats</label>
                <p className="text-white">{selectedSchedule.totalSeats}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Days of Week</label>
                <p className="text-white">{selectedSchedule.daysOfWeek}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Provider</label>
                <p className="text-white">{selectedSchedule.busProvider?.user?.fullName || 'N/A'}</p>
                <p className="text-gray-400 text-sm">{selectedSchedule.busProvider?.user?.phone || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedSchedule(null)}
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
