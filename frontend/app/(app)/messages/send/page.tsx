"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type User = {
  id: number;
  firstName: string;
  lastName: string;
  role?: string;
};

type CurrentUser = {
  id: number;
  cinemaId: number;
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

export default function SendMessagePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [receiverId, setReceiverId] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  function getHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  useEffect(() => {
    async function fetchUsers() {
      try {
        const savedUser = localStorage.getItem("user");

        if (!savedUser) return;

        const response = await fetch(`${API_URL}/users`, {
          headers: getHeaders(),
        });

        if (!response.ok) {
          setUsers([]);
          return;
        }

        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Kunne ikke hente brugere", error);
        setUsers([]);
      }
    }

    fetchUsers();
  }, []);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !body.trim()) {
      alert("Udfyld både emne og besked.");
      return;
    }

    if (!isBroadcast && !receiverId) {
      alert("Vælg en modtager eller send som broadcast.");
      return;
    }

    try {
      setSending(true);

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        alert("Bruger ikke fundet.");
        return;
      }

      const user: CurrentUser = JSON.parse(savedUser);

      const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          receiverId: isBroadcast ? null : Number(receiverId),
          isBroadcast,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke sende beskeden");
      }

      setReceiverId("");
      setIsBroadcast(false);
      setSubject("");
      setBody("");

      alert("Beskeden er sendt.");
    } catch (error) {
      console.error(error);
      alert("Beskeden kunne ikke sendes.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Send besked</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Send en besked til en medarbejder eller til hele biografen.
          </p>
        </div>

        <form
          onSubmit={sendMessage}
          className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <input
              id="broadcast"
              type="checkbox"
              checked={isBroadcast}
              onChange={(event) => {
                setIsBroadcast(event.target.checked);

                if (event.target.checked) {
                  setReceiverId("");
                }
              }}
              className="h-4 w-4"
            />

            <label
              htmlFor="broadcast"
              className="font-medium text-gray-800 dark:text-gray-200"
            >
              Send til alle medarbejdere
            </label>
          </div>

          {!isBroadcast && (
            <div>
              <label className={labelClass}>Modtager</label>

              <select
                value={receiverId}
                onChange={(event) => setReceiverId(event.target.value)}
                className={inputClass}
              >
                <option value="">Vælg medarbejder</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Emne</label>

            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={inputClass}
              placeholder="Skriv emne"
            />
          </div>

          <div>
            <label className={labelClass}>Besked</label>

            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-48 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10"
              placeholder="Skriv din besked..."
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {sending ? "Sender besked..." : "Send besked"}
          </button>
        </form>
      </div>
    </main>
  );
}
