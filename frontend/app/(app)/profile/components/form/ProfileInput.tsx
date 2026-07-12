type ProfileInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helpText?: string;
};

export default function ProfileInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helpText,
}: ProfileInputProps) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
      />
      {helpText && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </span>
      )}
    </label>
  );
}
