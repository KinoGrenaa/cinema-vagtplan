import { useState } from "react";
import type { FormEvent } from "react";

import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import type { MessageParticipant } from "@/app/types/messages";

import {
  inputClass,
  labelClass,
} from "../../helpers/core/sendMessageHelpers";
import type { User } from "../../helpers/core/sendMessageTypes";
import MessageRecipientPickerModal from "./MessageRecipientPickerModal";

type ReplyMode = "REPLY" | "REPLY_ALL" | null;

type SendMessageFormProps = {
  users: User[];
  selectedRecipientIds: number[];
  isBroadcast: boolean;
  canSendBroadcastMessages: boolean;
  replyMode: ReplyMode;
  replyRecipients: MessageParticipant[];
  subject: string;
  body: string;
  sending: boolean;
  onRecipientIdsChange: (recipientIds: number[]) => void;
  onBroadcastChange: (isBroadcast: boolean) => void;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function participantNames(participants: MessageParticipant[]) {
  return participants
    .map(
      (participant) =>
        `${participant.firstName} ${participant.lastName}`,
    )
    .join(", ");
}

export default function SendMessageForm({
  users,
  selectedRecipientIds,
  isBroadcast,
  canSendBroadcastMessages,
  replyMode,
  replyRecipients,
  subject,
  body,
  sending,
  onRecipientIdsChange,
  onBroadcastChange,
  onSubjectChange,
  onBodyChange,
  onSubmit,
}: SendMessageFormProps) {
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);

  const selectedRecipients = users.filter((user) =>
    selectedRecipientIds.includes(user.id),
  );

  const isReply = Boolean(replyMode);
  const hasRecipient =
    isBroadcast ||
    selectedRecipientIds.length > 0;
  const canSubmit =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (isReply || hasRecipient);

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {isReply ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/30">
            <div className="text-sm font-semibold text-blue-950 dark:text-blue-100">
              {replyMode === "REPLY_ALL" ? "Svar alle" : "Svar"}
            </div>
            <div className="mt-1 text-sm text-blue-800 dark:text-blue-200">
              Til: {participantNames(replyRecipients) || "Ingen aktive modtagere"}
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-1 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Modtagere
                </span>

                {canSendBroadcastMessages && (
                  <label
                    htmlFor="broadcast"
                    className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    <input
                      id="broadcast"
                      type="checkbox"
                      checked={isBroadcast}
                      onChange={(event) => {
                        onBroadcastChange(event.target.checked);
                        if (event.target.checked) {
                          onRecipientIdsChange([]);
                          setEmployeePickerOpen(false);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-gray-600 dark:accent-blue-400 dark:focus-visible:ring-blue-400"
                    />
                    <span>
                      Send til alle
                    </span>
                  </label>
                )}
              </div>

              {isBroadcast ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100">
                  Alle medarbejdere
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEmployeePickerOpen(true)}
                  disabled={users.length === 0}
                  aria-haspopup="dialog"
                  className="block min-h-11 w-full rounded-xl border border-gray-300 bg-white p-3 text-left text-gray-900 outline-none transition hover:border-blue-400 hover:bg-blue-50/40 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/20 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/25"
                >
                  {selectedRecipients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipients.map((recipient) => (
                        <span
                          key={recipient.id}
                          className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                          <EmployeeAvatar
                            name={`${recipient.firstName} ${recipient.lastName}`.trim()}
                            profileImage={recipient.profileImage ?? null}
                            className="!h-7 !w-7 !text-[10px]"
                          />
                          <span>
                            {recipient.firstName} {recipient.lastName}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Vælg modtagere...
                    </span>
                  )}
                </button>
              )}
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>Emne</label>
          <input
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            readOnly={isReply}
            aria-readonly={isReply}
            className={`${inputClass} ${
              isReply
                ? "!cursor-default !bg-gray-100 !text-gray-600 dark:!bg-gray-800 dark:!text-gray-400"
                : ""
            }`}
            placeholder="Skriv emne"
          />
        </div>

        <div>
          <label className={labelClass}>Besked</label>
          <textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            className="min-h-64 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
            placeholder={isReply ? "Skriv dit svar..." : "Skriv din besked..."}
          />
        </div>

        <button
          type="submit"
          disabled={sending || !canSubmit}
          className="ml-auto block min-w-36 rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
        >
          {sending
            ? isReply
              ? "Sender svar..."
              : "Sender besked..."
            : isReply
              ? "Send svar"
              : "Send besked"}
        </button>
      </form>

      <MessageRecipientPickerModal
        open={!isReply && !isBroadcast && employeePickerOpen}
        options={users}
        selectedEmployeeIds={selectedRecipientIds}
        onClose={() => setEmployeePickerOpen(false)}
        onConfirm={onRecipientIdsChange}
      />
    </>
  );
}
