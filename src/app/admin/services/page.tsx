'use client';

import { useEffect, useState } from 'react';
import { Wrench, Filter } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';

interface ServiceRequest {
  id: string;
  jobDescription: string;
  budget: number;
  finalPrice: number | null;
  location: string;
  status: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
  };
  provider: {
    user: {
      fullName: string;
      phone: string;
    };
  } | null;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [statusFilter]);

  useEffect(() => {
    fetchServices();
  }, [statusFilter, currentPage]);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const url = `/api/admin/services?page=${currentPage}&limit=20${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading service requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Service Requests</h1>
          <p className="text-gray-400">View all home service requests and orders</p>
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
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Service</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Description</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Location</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Price</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Provider</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{service.user.fullName}</p>
                      <p className="text-gray-400 text-sm">{service.user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                      {service.service.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white text-sm max-w-xs truncate">{service.jobDescription}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-300 text-sm">{service.location}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">${(service.finalPrice || service.budget).toFixed(2)}</p>
                      {service.finalPrice && service.finalPrice !== service.budget && (
                        <p className="text-gray-400 text-xs line-through">${service.budget.toFixed(2)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {service.provider ? (
                      <div>
                        <p className="text-white text-sm">{service.provider.user.fullName}</p>
                        <p className="text-gray-400 text-xs">{service.provider.user.phone}</p>
                      </div>
                    ) : (
                      <span className="text-gray-500">No provider</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      service.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      service.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      service.status === 'accepted' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {service.status}
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
