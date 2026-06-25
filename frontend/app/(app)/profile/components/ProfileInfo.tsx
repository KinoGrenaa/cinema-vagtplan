type ProfileInfoProps = {
  label: string;
  value: string;
};

export default function ProfileInfo({ label, value }: ProfileInfoProps) {
  return (
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
