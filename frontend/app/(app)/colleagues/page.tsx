'use client';

import { useCallback, useEffect, useState } from 'react';
import AppMenu from '../../components/AppMenu';

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
};

export default function ColleaguesPage() {
  const [users, setUsers] = useState<User[]>([]);

  function getToken() {
    return localStorage.getItem('token');
  }

  const fetchUsers = useCallback(async () => {
    const response = await fetch('http://localhost:3001/users', {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data: User[] = await response.json();
    setUsers(data);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">

      <div className="bg-white rounded-xl shadow p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Kollegaer</h1>

          <p className="text-gray-500">
            Kontaktinformation for medarbejdere
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="border rounded-xl p-5 bg-gray-50"
            >
              <div className="text-xl font-bold">
                {user.firstName} {user.lastName}
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Email:</span>{' '}
                  {user.email}
                </div>

                <div>
                  <span className="font-semibold">Telefon:</span>{' '}
                  {user.phone || '-'}
                </div>

                <div>
                  <span className="font-semibold">Rolle:</span>{' '}
                  {user.role}
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-gray-500">
              Ingen medarbejdere fundet
            </div>
          )}
        </div>
      </div>
    </main>
  );
}