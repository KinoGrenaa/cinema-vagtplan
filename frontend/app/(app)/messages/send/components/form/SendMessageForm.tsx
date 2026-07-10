import type { FormEvent } from "react";

import { inputClass, labelClass } from "../../helpers/core/sendMessageHelpers";

import type { User } from "../../helpers/core/sendMessageTypes";

type SendMessageFormProps = {
  users: User[];
  receiverId: string;
  isBroadcast: boolean;
  subject: string;
  body: string;
  sending: boolean;
  onReceiverIdChange: (receiverId: string) => void;
  onBroadcastChange: (isBroadcast: boolean) => void;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SendMessageForm({
  users,
  receiverId,
  isBroadcast,
  subject,
  body,
  sending,
  onReceiverIdChange,
  onBroadcastChange,
  onSubjectChange,
  onBodyChange,
  onSubmit,
}: SendMessageFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
        <input
          id="broadcast"
          type="checkbox"
          checked={isBroadcast}
          onChange={(event) => {
            onBroadcastChange(event.target.checked);

            if (event.target.checked) {
              onReceiverIdChange("");
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
            onChange={(event) => onReceiverIdChange(event.target.value)}
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
          onChange={(event) => onSubjectChange(event.target.value)}
          className={inputClass}
          placeholder="Skriv emne"
        />
      </div>

      <div>
        <label className={labelClass}>Besked</label>
        <textarea
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
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
  );
}
