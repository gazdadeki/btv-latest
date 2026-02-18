'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toastError } from '@/lib/utils';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';
import { FormRow, FormInput } from '@/components/form-fields';
import { USER_ROLES, SUBSCRIPTION_TIERS } from '@/constants';
import type { AdminUser } from '@/types';

const EMPTY_FORM: Record<string, unknown> = {
  email: '', username: '', password: '', role: 'player',
  subscriptionTier: 'FREE', isVerified: false,
  fullName: '', addressLine1: '', addressLine2: '',
  city: '', state: '', country: '', zipcode: '',
};

interface UserFormDialogProps {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormDialog({ open, user, onClose, onSaved }: UserFormDialogProps) {
  const isEdit = user !== null;
  const [form, setForm] = useState<Record<string, unknown>>(EMPTY_FORM);

  useEffect(() => {
    if (open && user) {
      setForm({
        id: user.id, email: user.email, username: user.username || '',
        role: user.role, subscriptionTier: user.subscriptionTier,
        isVerified: user.isVerified, password: '',
        fullName: user.fullName || '',
        addressLine1: user.addressLine1 || '', addressLine2: user.addressLine2 || '',
        city: user.city || '', state: user.state || '',
        country: user.country || '', zipcode: user.zipcode || '',
      });
    } else if (open) {
      setForm({ ...EMPTY_FORM });
    }
  }, [open, user]);

  const handleSave = async () => {
    if (isEdit) {
      const data: Record<string, unknown> = {
        email: form.email, username: (form.username as string) || null,
        role: form.role, subscriptionTier: form.subscriptionTier,
        isVerified: form.isVerified,
        fullName: form.fullName || null,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        city: form.city || null, state: form.state || null,
        country: form.country || null, zipcode: form.zipcode || null,
      };
      if (form.password) data.password = form.password;
      try {
        await api.updateUser(form.id as number, data);
        toast.success('User updated');
        onClose();
        onSaved();
      } catch (err) {
        toastError(err);
      }
    } else {
      if (!form.email || !form.password) { toast.error('Email and password are required'); return; }
      try {
        await api.createUser({
          email: form.email, username: form.username || undefined,
          password: form.password, role: form.role,
          subscriptionTier: form.subscriptionTier,
          isVerified: !!form.isVerified,
          fullName: form.fullName || undefined,
          addressLine1: form.addressLine1 || undefined,
          addressLine2: form.addressLine2 || undefined,
          city: form.city || undefined, state: form.state || undefined,
          country: form.country || undefined, zipcode: form.zipcode || undefined,
        });
        toast.success('User created');
        onClose();
        onSaved();
      } catch (err) {
        toastError(err);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Edit User' : 'Create User'} className="max-w-lg">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label={isEdit ? 'Email' : 'Email *'}><FormInput form={form} field="email" setForm={setForm} type="email" /></FormRow>
          <FormRow label="Username"><FormInput form={form} field="username" setForm={setForm} /></FormRow>
        </div>
        <FormRow label={isEdit ? 'Password (blank to keep)' : 'Password *'}><FormInput form={form} field="password" setForm={setForm} type="password" /></FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Role">
            <select value={String(form.role || '')} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </FormRow>
          <FormRow label="Tier">
            <select value={String(form.subscriptionTier || '')} onChange={(e) => setForm({ ...form, subscriptionTier: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {SUBSCRIPTION_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isVerified} onChange={(e) => setForm({ ...form, isVerified: e.target.checked })} /> Verified</label>
        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-sm font-medium mb-2">Address{isEdit ? '' : ' (optional)'}</h4>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Full Name"><FormInput form={form} field="fullName" setForm={setForm} /></FormRow>
            <FormRow label="Address Line 1"><FormInput form={form} field="addressLine1" setForm={setForm} /></FormRow>
            <FormRow label="Address Line 2"><FormInput form={form} field="addressLine2" setForm={setForm} /></FormRow>
            <FormRow label="City"><FormInput form={form} field="city" setForm={setForm} /></FormRow>
            <FormRow label="State"><FormInput form={form} field="state" setForm={setForm} /></FormRow>
            <FormRow label="Country"><FormInput form={form} field="country" setForm={setForm} /></FormRow>
            <FormRow label="Zipcode"><FormInput form={form} field="zipcode" setForm={setForm} /></FormRow>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEdit ? 'Save' : 'Create User'}</Button>
        </div>
      </div>
    </Dialog>
  );
}
