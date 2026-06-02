'use client';

export default function SettingsToggle({ checked, onChange, disabled }) {
  return (
    <label
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 peer-focus-visible:ring-offset-1 dark:bg-slate-600 dark:peer-checked:bg-indigo-500" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 dark:bg-slate-100" />
    </label>
  );
}
