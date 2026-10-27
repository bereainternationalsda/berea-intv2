import type { ReactNode } from "react";
import type { FormState } from "@/lib/admin/types";

const inputClass =
  "mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20";

function borderClass(error?: string) {
  return error
    ? "border-red-400 focus:border-red-500"
    : "border-navy-100 focus:border-navy-600";
}

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-navy-900">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-navy-700/70">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  maxLength?: number;
  type?: "text" | "number";
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
};

export function TextField({
  name,
  label,
  value,
  onChange,
  hint,
  error,
  maxLength,
  type = "text",
  placeholder,
  readOnly,
  required,
}: TextFieldProps) {
  return (
    <FieldShell id={name} label={label} hint={hint} error={error}>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 999 : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${inputClass} ${borderClass(error)} ${readOnly ? "bg-navy-50 text-navy-700" : ""}`}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  value,
  onChange,
  hint,
  error,
  maxLength,
  rows = 4,
}: Omit<TextFieldProps, "type" | "readOnly" | "placeholder"> & { rows?: number }) {
  return (
    <FieldShell id={name} label={label} hint={hint} error={error}>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${inputClass} ${borderClass(error)}`}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  resetKey,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  /**
   * Change this after each form submission. After a form action React resets
   * every field to its *default*, and a <select> never updates its default
   * when the user picks something else. Left alone, the dropdown would snap
   * back to a stale option and the next save would silently submit it.
   * Remounting it with the current choice as its default avoids that.
   *
   * (It is deliberately uncontrolled — `defaultValue`, not `value` — because
   * React only marks an option as the reset target for `defaultValue`.)
   */
  resetKey?: string | number;
}) {
  return (
    <FieldShell id={name} label={label} hint={hint} error={error}>
      <select
        key={resetKey}
        id={name}
        name={name}
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${inputClass} ${borderClass(error)}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function StatusBanner({ state }: { state: FormState }) {
  if (state.status === "idle") return null;

  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`rounded-lg px-4 py-3 text-sm font-medium ${
        isError ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
      }`}
    >
      {state.message}
    </p>
  );
}

export function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
