type LeaveRequestsSuccessMessageProps = {
  success: string | null;
};

export default function LeaveRequestsSuccessMessage({
  success,
}: LeaveRequestsSuccessMessageProps) {
  if (!success) return null;

  return (
    <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-green-700">
      {success}
    </div>
  );
}
