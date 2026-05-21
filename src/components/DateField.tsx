"use client";
export default function DateField({
  name,
  defaultValue,
  required,
  onChange,
  className = "",
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  onChange?: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="date"
      name={name}
      defaultValue={defaultValue}
      required={required}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full h-11 bg-transparent border border-white/12 rounded-md px-3 text-[13px]
                  text-white placeholder:text-white/30
                  focus:outline-none focus:border-white/45 transition
                  [color-scheme:dark] ${className}`}
    />
  );
}
