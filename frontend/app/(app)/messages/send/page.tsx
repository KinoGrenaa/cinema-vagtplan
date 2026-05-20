"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type CurrentUser = {
  id: number;
  cinemaId: number;
};

function SendMessageContent() {
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchUsers = useCallback(async () => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    const response = await fetch(
      `http://localhost:3001/users?cinemaId=${user.cinemaId}`,
      {
        headers: getHeaders(),
      }
    );

    const data = await response.json();

    setUsers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchUsers();

    const replyTo = searchParams.get("replyTo");
    const replySubject = searchParams.get("subject");

    if (replyTo) {
      setReceiverId(replyTo);
    }

    if (replySubject) {
      setSubject(replySubject);
    }
  }, [fetchUsers, searchParams]);

  async function sendMessage() {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    const currentUser: CurrentUser = JSON.parse(savedUser);

    if (!subject.trim() || !body.trim()) {
      setStatusMessage("Udfyld både emne og besked.");
      return;
    }

    if (!isBroadcast && !receiverId) {
      setStatusMessage("Vælg en modtager eller send til alle.");
      return;
    }

    const response = await fetch(
      "http://localhost:3001/messages",
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          subject,
          body,
          cinemaId: currentUser.cinemaId,
          senderId: currentUser.id,
          receiverId: isBroadcast
            ? null
            : Number(receiverId),
          isBroadcast,
        }),
      }
    );

    if (!response.ok) {
      setStatusMessage(
        "Beskeden kunne ikke sendes."
      );

      return;
    }

    setSubject("");
    setBody("");
    setReceiverId("");
    setIsBroadcast(false);

    setStatusMessage("Besked sendt.");
  }

  const isReply = Boolean(searchParams.get("replyTo"));

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">
          {isReply ? "Svar på besked" : "Send ny besked"}
        </h1>

        <p className="text-gray-500 mt-2">
          {isReply
            ? "Du svarer på en modtaget besked."
            : "Send beskeder til medarbejdere eller hele biografen."}
        </p>
      </div>

      {statusMessage && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
          {statusMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div>
          <label className="block font-medium mb-1">
            Emne
          </label>

          <input
            value={subject}
            onChange={(e) =>
              setSubject(e.target.value)
            }
            className="w-full border rounded-lg p-3"
            placeholder="Skriv emne..."
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Besked
          </label>

          <textarea
            value={body}
            onChange={(e) =>
              setBody(e.target.value)
            }
            className="w-full border rounded-lg p-3 min-h-24"
            placeholder="Skriv besked..."
          />
        </div>

        {!isReply && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isBroadcast}
              onChange={(e) =>
                setIsBroadcast(e.target.checked)
              }
            />

            Send til alle medarbejdere
          </label>
        )}

        {!isBroadcast && (
          <div>
            <label className="block font-medium mb-1">
              Modtager
            </label>

            <select
              value={receiverId}
              onChange={(e) =>
                setReceiverId(e.target.value)
              }
              className="w-full border rounded-lg p-3"
              disabled={isReply}
            >
              <option value="">
                Vælg modtager
              </option>

              {users.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {user.firstName}{" "}
                  {user.lastName}
                </option>
              ))}
            </select>

            {isReply && (
              <p className="text-sm text-gray-500 mt-2">
                Modtager er valgt automatisk fra den oprindelige besked.
              </p>
            )}
          </div>
        )}

        <button
          onClick={sendMessage}
          className="bg-black text-white px-5 py-3 rounded-lg"
        >
          {isReply ? "Send svar" : "Send besked"}
        </button>
      </div>
    </main>
  );
}

export default function SendMessagePage() {
  return (
    <Suspense fallback={null}>
      <SendMessageContent />
    </Suspense>
  );
}