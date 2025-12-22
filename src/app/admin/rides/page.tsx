'use client';

import { useEffect, useState } from 'react';
import { Car, Filter } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';

interface RideRequest {
  id: string;
  pickupAddress: string;
  destinationAddress: string;
  distance: number;
  price: number;
  finalPrice: number | null;
  status: string;
  isRoundTrip: boolean;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  driver: {
    user: {
      fullName: string;
      phone: string;
    };
  } | null;
}

export default function AdminRidesPage() {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [statusFilter]);

  useEffect(() => {
    fetchRides();
  }, [statusFilter, currentPage]);

  const fetchRides = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const url = `/api/admin/rides?page=${currentPage}&limit=20${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRides(data.rides);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching ride requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading ride requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Ride Requests</h1>
          <p className="text-gray-400">View all ride requests and orders</p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="searching">Searching</option>
            <option value="bid_received">Bid Received</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Route</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Distance</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Price</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Driver</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {rides.map((ride) => (
                <tr key={ride.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{ride.user.fullName}</p>
                      <p className="text-gray-400 text-sm">{ride.user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white text-sm">{ride.pickupAddress}</p>
                      <p className="text-gray-400 text-sm">→ {ride.destinationAddress}</p>
                      {ride.isRoundTrip && (
                        <span className="text-xs text-blue-400">Round Trip</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{ride.distance.toFixed(1)} km</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">${(ride.finalPrice || ride.price).toFixed(2)}</p>
                      {ride.finalPrice && ride.finalPrice !== ride.price && (
                        <p className="text-gray-400 text-xs line-through">${ride.price.toFixed(2)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {ride.driver ? (
                      <div>
                        <p className="text-white text-sm">{ride.driver.user.fullName}</p>
                        <p className="text-gray-400 text-xs">{ride.driver.user.phone}</p>
                      </div>
                    ) : (
                      <span className="text-gray-500">No driver</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ride.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      ride.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      ride.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      ride.status === 'accepted' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {ride.status}
                    </span>
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
    </div>
  );
}
