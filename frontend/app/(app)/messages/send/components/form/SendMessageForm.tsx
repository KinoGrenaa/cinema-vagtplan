import { useState } from "react";
import type { FormEvent } from "react";

import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import EmployeePickerModal from "@/app/components/employees/EmployeePickerModal";
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
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const selectedReceiver =
    users.find((user) => String(user.id) === receiverId) ?? null;

  return (
    <>
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
                setEmployeePickerOpen(false);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-gray-600 dark:accent-blue-400 dark:focus-visible:ring-blue-400"
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
                {selectedReceiver ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <EmployeeAvatar
                      name={`${selectedReceiver.firstName} ${selectedReceiver.lastName}`.trim()}
                      profileImage={selectedReceiver.profileImage}
                      className="!h-8 !w-8 !text-xs"
                    />
                    <span className="min-w-0 truncate font-semibold">
                      {selectedReceiver.firstName} {selectedReceiver.lastName}
                    </span>
                  </div>
                ) : (
                  <span className="block truncate font-semibold">
                    Ingen medarbejder valgt
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEmployeePickerOpen(true)}
                disabled={users.length === 0}
                className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950"
              >
                {selectedReceiver ? "Skift" : "Vælg medarbejder"}
              </button>
            </div>
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
            className="min-h-48 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
            placeholder="Skriv din besked..."
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
        >
          {sending ? "Sender besked..." : "Send besked"}
        </button>
      </form>
      <EmployeePickerModal
        open={!isBroadcast && employeePickerOpen}
        title="Vælg modtager"
        description="Vælg den medarbejder, beskeden skal sendes til."
        options={users.map((user) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          profileImage: user.profileImage ?? null,
        }))}
        selectedEmployeeId={selectedReceiver?.id ?? null}
        confirmLabel="Vælg modtager"
        emptyText="Ingen medarbejdere kan vælges."
        onClose={() => setEmployeePickerOpen(false)}
        onConfirm={(employeeId) => {
          onReceiverIdChange(String(employeeId));
        }}
      />
    </>
  );
}
