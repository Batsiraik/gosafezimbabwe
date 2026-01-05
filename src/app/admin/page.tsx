'use client';

import { useEffect, useState } from 'react';
import { Users, Car, Bike, Wrench, Bus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Stats {
  totalUsers: number;
  totalTaxiDrivers: number;
  totalParcelProviders: number;
  totalHomeServiceProviders: number;
  totalBusProviders: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      color: 'bg-blue-500',
    },
    {
      icon: Car,
      label: 'Drivers',
      value: stats?.totalTaxiDrivers || 0,
      color: 'bg-green-500',
    },
    {
      icon: Bike,
      label: 'Parcel Providers',
      value: stats?.totalParcelProviders || 0,
      color: 'bg-yellow-500',
    },
    {
      icon: Wrench,
      label: 'Home Service Providers',
      value: stats?.totalHomeServiceProviders || 0,
      color: 'bg-purple-500',
    },
    {
      icon: Bus,
      label: 'Bus Providers',
      value: stats?.totalBusProviders || 0,
      color: 'bg-red-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Overview of your platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">{card.label}</h3>
              <p className="text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
