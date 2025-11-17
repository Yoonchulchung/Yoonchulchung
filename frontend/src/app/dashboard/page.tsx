'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      // Authentication disabled - use default user for development
      console.log('Using default user (auth disabled)');
      setUser({
        email: 'dev@portfolio.local',
        username: 'Developer',
        role: 'ADMIN'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiClient.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Portfolio Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.email} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Projects</h2>
            <p className="mt-2 text-3xl font-bold text-primary-600">0</p>
            <p className="mt-2 text-sm text-gray-600">Manage your projects</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Portfolio</h2>
            <p className="mt-2 text-3xl font-bold text-primary-600">1</p>
            <p className="mt-2 text-sm text-gray-600">Update your portfolio</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="mt-2 text-sm text-gray-600">
              Welcome, {user?.username}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
