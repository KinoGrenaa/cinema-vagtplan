type JobFunctionTimingRuleFallbackTimeFieldProps = {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

export default function JobFunctionTimingRuleFallbackTimeField({
  label,
  value,
  disabled,
  onChange,
}: JobFunctionTimingRuleFallbackTimeFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        disabled={disabled}
      />
    </label>
  );
}
