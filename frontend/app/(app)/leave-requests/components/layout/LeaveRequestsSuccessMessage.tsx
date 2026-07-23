type LeaveRequestsSuccessMessageProps = {
  success: string | null;
};

export default function LeaveRequestsSuccessMessage({
  success,
}: LeaveRequestsSuccessMessageProps) {
  if (!success) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-green-300 bg-green-50 p-3 font-medium text-green-800 shadow-sm transition-colors dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-200"
    >
      {success}
    </div>
  );
}
