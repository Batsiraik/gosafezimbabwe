'use client';

import { useEffect, useState } from 'react';
import { Ticket, Filter } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';

interface BusBooking {
  id: string;
  travelDate: string;
  numberOfTickets: number;
  totalPrice: number;
  status: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  busSchedule: {
    id: string;
    departureTime: string;
    busStation: string;
    fromCity: { name: string };
    toCity: { name: string };
    busProvider: {
      user: {
        fullName: string;
        phone: string;
      };
    };
  };
}

export default function AdminBusBookingsPage() {
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, currentPage]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const url = `/api/admin/bus-bookings?page=${currentPage}&limit=20${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching bus bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading bus bookings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bus Bookings</h1>
          <p className="text-gray-400">View all bus ticket bookings</p>
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
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Route</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Travel Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Time</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Tickets</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Total Price</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Provider</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{booking.user.fullName}</p>
                      <p className="text-gray-400 text-sm">{booking.user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">{booking.busSchedule.fromCity.name} → {booking.busSchedule.toCity.name}</p>
                      <p className="text-gray-400 text-xs">{booking.busSchedule.busStation}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(booking.travelDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-300">{booking.busSchedule.departureTime}</td>
                  <td className="px-6 py-4 text-gray-300">{booking.numberOfTickets}</td>
                  <td className="px-6 py-4 text-white font-medium">${booking.totalPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-300">
                    <div>
                      <p className="text-white text-sm">{booking.busSchedule.busProvider?.user?.fullName || 'N/A'}</p>
                      <p className="text-gray-400 text-xs">{booking.busSchedule.busProvider?.user?.phone || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {booking.status}
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
