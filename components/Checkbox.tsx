"use client";

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <label
      title={title}
      className={`flex items-start gap-2 font-sans text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#7cc4ff]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={checked ? "text-ink-300 line-through decoration-ink-600" : "text-ink-200"}>{label}</span>
    </label>
  );
}
