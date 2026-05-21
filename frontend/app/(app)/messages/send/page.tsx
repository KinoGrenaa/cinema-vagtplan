"use client";

import { useEffect, useState } from "react";

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

        const user: CurrentUser = JSON.parse(savedUser);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users?cinemaId=${user.cinemaId}`,
          {
            headers: getHeaders(),
          }
        );

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

      const response = await fetch("${process.env.NEXT_PUBLIC_API_URL}/messages", {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          cinemaId: user.cinemaId,
          senderId: user.id,
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
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">Send besked</h1>

        <p className="text-gray-500 mt-2">
          Send en besked til en medarbejder eller som broadcast.
        </p>
      </div>

      <form
        onSubmit={sendMessage}
        className="bg-white rounded-xl shadow p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
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

          <label htmlFor="broadcast" className="font-medium">
            Send til alle
          </label>
        </div>

        {!isBroadcast && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Modtager
            </label>

            <select
              value={receiverId}
              onChange={(event) => setReceiverId(event.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Vælg modtager</option>

              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Emne
          </label>

          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Skriv emne"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Besked
          </label>

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-40 w-full rounded-lg border px-3 py-2"
            placeholder="Skriv beskeden her..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "Sender..." : "Send besked"}
          </button>
        </div>
      </form>
    </main>
  );
}