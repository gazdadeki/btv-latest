'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toastError } from '@/lib/utils';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';

interface ScheduleOption { id: number; name: string }

interface CreateGameDialogProps {
  open: boolean;
  onClose: () => void;
  schedules: ScheduleOption[];
  onCreated: () => void;
}

export function CreateGameDialog({ open, onClose, schedules, onCreated }: CreateGameDialogProps) {
  const [form, setForm] = useState({
    scheduleId: '', startTime: '', isExclusiveToGold: false,
  });

  const handleCreate = async () => {
    if (!form.scheduleId || !form.startTime) {
      toast.error('Schedule and start time are required');
      return;
    }
    try {
      await api.createGame({
        scheduleId: parseInt(form.scheduleId),
        scheduledStartTime: new Date(form.startTime).toISOString(),
        teamAName: 'Scourge', teamBName: 'Sentinel',
        isExclusiveToGold: form.isExclusiveToGold,
      });
      toast.success('Game created');
      setForm({ scheduleId: '', startTime: '', isExclusiveToGold: false });
      onClose();
      onCreated();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Game">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Schedule *</label>
          <select value={form.scheduleId} onChange={(e) => setForm({ ...form, scheduleId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select Schedule</option>
            {schedules.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Scheduled Start Time *</label>
          <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isExclusiveToGold} onChange={(e) => setForm({ ...form, isExclusiveToGold: e.target.checked })} className="rounded" />
          Exclusive to Gold Subscribers
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate}>Create Game</Button>
        </div>
      </div>
    </Dialog>
  );
}
