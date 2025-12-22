'use client';

import { useEffect, useState } from 'react';
import { Navigation, Filter } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';

interface CityToCityRequest {
  id: string;
  userType: string;
  travelDate: string;
  willingToPay: number | null;
  pricePerPassenger: number | null;
  neededSeats: number | null;
  numberOfSeats: number | null;
  status: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  fromCity: { id: string; name: string };
  toCity: { id: string; name: string };
}

export default function AdminCityToCityPage() {
  const [requests, setRequests] = useState<CityToCityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, currentPage]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const url = `/api/admin/city-to-city?page=${currentPage}&limit=20${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching city-to-city requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading city-to-city requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">City-to-City Requests</h1>
          <p className="text-gray-400">View all city-to-city ride share requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-nexryde-yellow"
          >
            <option value="all">All Status</option>
            <option value="searching">Searching</option>
            <option value="matched">Matched</option>
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
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Type</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Price/Seats</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{request.user.fullName}</p>
                      <p className="text-gray-400 text-sm">{request.user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">{request.fromCity.name} → {request.toCity.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(request.travelDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                      {request.userType === 'has-car' ? 'Has Car' : 'Needs Car'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {request.userType === 'has-car' ? (
                      <span>${request.pricePerPassenger?.toFixed(2)}/passenger</span>
                    ) : (
                      <span>Willing: ${request.willingToPay?.toFixed(2)}</span>
                    )}
                    {request.userType === 'has-car' && request.numberOfSeats && (
                      <span className="block text-xs text-gray-400">{request.numberOfSeats} seats</span>
                    )}
                    {request.userType === 'needs-car' && request.neededSeats && (
                      <span className="block text-xs text-gray-400">{request.neededSeats} needed</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'matched' ? 'bg-green-500/20 text-green-400' :
                      request.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                      request.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {request.status}
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
