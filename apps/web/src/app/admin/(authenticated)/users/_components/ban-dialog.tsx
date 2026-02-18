'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toastError } from '@/lib/utils';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';
import { FormRow } from '@/components/form-fields';

interface BanDialogProps {
  userId: number | null;
  onClose: () => void;
  onBanned: () => void;
}

export function BanDialog({ userId, onClose, onBanned }: BanDialogProps) {
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('permanent');
  const [banDays, setBanDays] = useState('7');

  const handleBan = async () => {
    if (!userId) return;
    let bannedUntil: string | null = null;
    if (banType === 'temporary') {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(banDays, 10));
      d.setHours(23, 59, 59, 999);
      bannedUntil = d.toISOString();
    }
    try {
      await api.banUser(userId, { isBanned: true, bannedUntil });
      toast.success('User banned');
      onClose();
      onBanned();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={userId !== null} onClose={onClose} title="Ban User">
      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={banType === 'permanent'} onChange={() => setBanType('permanent')} /> Permanent</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={banType === 'temporary'} onChange={() => setBanType('temporary')} /> Temporary</label>
        </div>
        {banType === 'temporary' && <FormRow label="Ban for how many days?"><input type="number" value={banDays} onChange={(e) => setBanDays(e.target.value)} min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></FormRow>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleBan}>Ban User</Button>
        </div>
      </div>
    </Dialog>
  );
}
