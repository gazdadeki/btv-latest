import React from 'react';

export function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

interface FormInputProps {
  form: Record<string, unknown>;
  field: string;
  setForm: (v: Record<string, unknown>) => void;
  type?: string;
  placeholder?: string;
}

export function FormInput({
  form,
  field,
  setForm,
  type = 'text',
  placeholder = '',
}: FormInputProps) {
  return (
    <input
      type={type}
      value={String(form[field] ?? '')}
      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
    />
  );
}

interface FormSelectProps {
  form: Record<string, unknown>;
  field: string;
  setForm: (v: Record<string, unknown>) => void;
  options: readonly string[];
}

export function FormSelect({
  form,
  field,
  setForm,
  options,
}: FormSelectProps) {
  return (
    <select
      value={String(form[field] || '')}
      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

interface FormCheckboxProps {
  form: Record<string, unknown>;
  field: string;
  setForm: (v: Record<string, unknown>) => void;
  label: string;
}

export function FormCheckbox({
  form,
  field,
  setForm,
  label,
}: FormCheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={!!form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
        className="rounded"
      />
      {label}
    </label>
  );
}
