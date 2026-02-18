'use client';

import { FormRow, FormInput, FormSelect } from '@/components/form-fields';
import { RECURRENCE_TYPES, WEEKDAYS } from '@/constants';

interface RecurrenceFormProps {
  form: Record<string, unknown>;
  setForm: (v: Record<string, unknown>) => void;
}

export function RecurrenceForm({ form, setForm }: RecurrenceFormProps) {
  const type = form.recurrenceType as string;
  return (
    <div className="space-y-3">
      <FormRow label="Recurrence Type"><FormSelect form={form} field="recurrenceType" setForm={setForm} options={RECURRENCE_TYPES} /></FormRow>
      {type === 'WEEKLY' && (
        <div>
          <label className="block text-sm font-medium mb-2">Days of Week</label>
          <div className="flex gap-2">
            {WEEKDAYS.map((d, i) => {
              const day = i + 1;
              const days = (form.recurrenceDays as number[]) || [];
              const active = days.includes(day);
              return (
                <button
                  key={d} type="button"
                  onClick={() => setForm({ ...form, recurrenceDays: active ? days.filter((x) => x !== day) : [...days, day].sort() })}
                  className={`px-3 py-1.5 text-xs rounded-full border cursor-pointer ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-gray-50'}`}
                >{d}</button>
              );
            })}
          </div>
        </div>
      )}
      {type === 'MONTHLY' && <FormRow label="Days of Month (comma-separated)"><FormInput form={form} field="recurrenceDays" setForm={(v) => setForm({ ...v, recurrenceDays: String(v.recurrenceDays).split(',').map(Number).filter(Boolean) })} placeholder="e.g. 1,15" /></FormRow>}
      {type === 'YEARLY' && (
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Month (1-12)"><FormInput form={form} field="recurrenceMonth" setForm={setForm} type="number" /></FormRow>
          <FormRow label="Day (1-31)"><FormInput form={form} field="recurrenceDay" setForm={setForm} type="number" /></FormRow>
        </div>
      )}
      {type === 'ONCE' && <FormRow label="Date"><input type="date" value={String(form.onceDate || '')} onChange={(e) => setForm({ ...form, onceDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></FormRow>}
    </div>
  );
}
