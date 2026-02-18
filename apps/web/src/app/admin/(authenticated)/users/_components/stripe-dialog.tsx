'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toastError } from '@/lib/utils';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';
import type { AdminUser, StripeInfo } from '@/types';

interface StripeDialogProps {
  user: AdminUser | null;
  onClose: () => void;
  onChanged: () => void;
}

export function StripeDialog({ user, onClose, onChanged }: StripeDialogProps) {
  const [stripeInfo, setStripeInfo] = useState<StripeInfo | null>(null);
  const [stripeLinkId, setStripeLinkId] = useState('');
  const [loading, setLoading] = useState(false);

  const loadInfo = async (u: AdminUser) => {
    setStripeInfo(null);
    setStripeLinkId('');
    setLoading(true);
    try {
      const info = (await api.getUserStripeInfo(u.id)) as StripeInfo;
      setStripeInfo(info);
    } catch { setStripeInfo(null); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user) loadInfo(user);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLink = async () => {
    if (!user || !stripeLinkId) return;
    try {
      await api.linkStripeCustomer(user.id, stripeLinkId);
      toast.success('Stripe customer linked');
      loadInfo(user);
      onChanged();
    } catch (err) {
      toastError(err);
    }
  };

  const handleUnlink = async () => {
    if (!user) return;
    try {
      await api.unlinkStripeCustomer(user.id);
      toast.success('Stripe customer unlinked');
      loadInfo(user);
      onChanged();
    } catch (err) {
      toastError(err);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    try {
      await api.createStripeCustomer(user.id);
      toast.success('Stripe customer created');
      loadInfo(user);
      onChanged();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={user !== null} onClose={onClose} title="Stripe Management">
      {user && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading Stripe info...</p>
          ) : stripeInfo?.customerId ? (
            <div>
              <table className="w-full text-sm mb-4">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-medium w-1/3">Customer ID</td><td className="font-mono text-xs">{stripeInfo.customerId}</td></tr>
                  {stripeInfo.email && <tr><td className="py-2 font-medium">Email</td><td>{stripeInfo.email}</td></tr>}
                  {stripeInfo.name && <tr><td className="py-2 font-medium">Name</td><td>{stripeInfo.name}</td></tr>}
                </tbody>
              </table>
              <Button variant="danger" onClick={handleUnlink}>Unlink Customer</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">No Stripe customer linked.</p>
              <div className="flex gap-2">
                <input type="text" value={stripeLinkId} onChange={(e) => setStripeLinkId(e.target.value)} placeholder="Stripe Customer ID (cus_...)" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                <Button onClick={handleLink}>Link</Button>
              </div>
              <div className="border-t pt-3">
                <Button variant="success" onClick={handleCreate}>Create New Customer</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
