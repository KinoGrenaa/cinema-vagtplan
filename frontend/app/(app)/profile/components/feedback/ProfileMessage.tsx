type ProfileMessageProps = {
  message: string;
};

export default function ProfileMessage({ message }: ProfileMessageProps) {
  if (!message) return null;

  return (
    <div className="whitespace-pre-line rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {message}
    </div>
  );
}
