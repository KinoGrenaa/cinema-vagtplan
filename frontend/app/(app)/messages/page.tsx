'use client';

import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

type Message = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  isBroadcast: boolean;
  sender: User;
  receiver?: User | null;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [receiverId, setReceiverId] = useState<number | ''>('');
  const [isBroadcast, setIsBroadcast] = useState(false);

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

  const fetchMessages = useCallback(async (user: CurrentUser) => {
    const response = await fetch(
      `http://localhost:3001/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );

    const data: Message[] = await response.json();
    setMessages(data);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      window.location.href = '/';
      return;
    }

    const parsedUser: CurrentUser = JSON.parse(savedUser);

    setCurrentUser(parsedUser);

    fetchUsers();
    fetchMessages(parsedUser);
  }, [fetchUsers, fetchMessages]);

  useEffect(() => {
    if (!currentUser) return;

    const socket = io('http://localhost:3001');

    socket.on('messagesUpdated', () => {
      fetchMessages(currentUser);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser, fetchMessages]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();

    if (!currentUser) return;

    await fetch('http://localhost:3001/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        subject,
        body,
        cinemaId: currentUser.cinemaId,
        senderId: currentUser.id,
        receiverId: isBroadcast ? null : receiverId,
        isBroadcast,
      }),
    });

    setSubject('');
    setBody('');
    setReceiverId('');
    setIsBroadcast(false);

    await fetchMessages(currentUser);
  }

  async function markAsRead(messageId: number) {
    if (!currentUser) return;

    await fetch(`http://localhost:3001/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchMessages(currentUser);
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">Beskeder</h1>

        <p className="text-gray-500">
          Send beskeder til kollegaer eller alle medarbejdere.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Ny besked</h2>

        <form
          onSubmit={sendMessage}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block mb-1 font-medium">Emne</label>

            <input
              className="w-full border rounded-lg px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Modtager</label>

            <select
              className="w-full border rounded-lg px-3 py-2"
              value={receiverId}
              onChange={(e) => setReceiverId(Number(e.target.value))}
              disabled={isBroadcast}
              required={!isBroadcast}
            >
              <option value="">Vælg modtager</option>

              {users
                .filter((user) => user.id !== currentUser?.id)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
            </select>
          </div>

          <label className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={isBroadcast}
              onChange={(e) => setIsBroadcast(e.target.checked)}
            />

            Send til alle
          </label>

          <div className="md:col-span-2">
            <label className="block mb-1 font-medium">Besked</label>

            <textarea
              className="w-full border rounded-lg px-3 py-2 min-h-32"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-black text-white py-3 rounded-lg"
          >
            Send besked
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Mine beskeder</h2>

        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="border rounded-xl p-4 bg-gray-50"
            >
              <div className="flex flex-col md:flex-row md:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{message.subject}</h3>

                  <p className="text-sm text-gray-600">
                    Fra: {message.sender.firstName}{' '}
                    {message.sender.lastName}
                  </p>

                  <p className="text-sm text-gray-600">
                    Til:{' '}
                    {message.isBroadcast
                      ? 'Alle'
                      : message.receiver
                        ? `${message.receiver.firstName} ${message.receiver.lastName}`
                        : '-'}
                  </p>
                </div>

                <div className="text-sm text-gray-500">
                  {new Date(message.createdAt).toLocaleString('da-DK')}
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap">
                {message.body}
              </p>

              <div className="mt-4 flex gap-2 items-center">
                {message.readAt ? (
                  <span className="text-green-700 text-sm">
                    Læst
                  </span>
                ) : (
                  <button
                    onClick={() => markAsRead(message.id)}
                    className="bg-gray-200 px-3 py-1 rounded text-sm"
                  >
                    Marker som læst
                  </button>
                )}
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-gray-500">
              Ingen beskeder endnu.
            </div>
          )}
        </div>
      </div>
    </>
  );
}