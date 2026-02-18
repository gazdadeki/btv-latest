'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate, toastError } from '@/lib/utils';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';
import { Tabs } from '@/components/tabs';
import type { AdminUser, WalletTx, PaymentMethod } from '@/types';

interface UserDetailDialogProps {
  user: AdminUser | null;
  onClose: () => void;
  onMutated: () => void;
}

export function UserDetailDialog({ user, onClose, onMutated }: UserDetailDialogProps) {
  const [detailTab, setDetailTab] = useState('overview');
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantDesc, setGrantDesc] = useState('');

  const loadWallet = async (id: number) => {
    try {
      const txs = (await api.getUserWalletTransactions(id)) as WalletTx[];
      setWalletTxs(Array.isArray(txs) ? txs : []);
    } catch { setWalletTxs([]); }
  };

  const loadPaymentMethods = async (id: number) => {
    try {
      const methods = (await api.getUserPaymentMethods(id)) as PaymentMethod[];
      setPaymentMethods(Array.isArray(methods) ? methods : []);
    } catch { setPaymentMethods([]); }
  };

  const handleTabChange = (tab: string) => {
    setDetailTab(tab);
    if (!user) return;
    if (tab === 'wallet') loadWallet(user.id);
    if (tab === 'payments') loadPaymentMethods(user.id);
  };

  const handleGrantCoins = async () => {
    if (!user || !grantAmount) return;
    try {
      await api.grantCoins(user.id, Number(grantAmount), grantDesc || 'Admin grant');
      toast.success('Coins granted');
      setGrantAmount('');
      setGrantDesc('');
      loadWallet(user.id);
      onMutated();
    } catch (err) {
      toastError(err);
    }
  };

  const handleClose = () => {
    setDetailTab('overview');
    setWalletTxs([]);
    setPaymentMethods([]);
    onClose();
  };

  if (!user) return null;

  const balance = user.wallet ? Math.round(parseFloat(String(user.wallet.balance))) : 0;
  const stats = user.statistics || {};

  return (
    <Dialog open onClose={handleClose} title="User Details" className="max-w-3xl">
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'wallet', label: 'Wallet' },
          { id: 'stats', label: 'Statistics' },
          { id: 'payments', label: 'Payment Methods' },
        ]}
        activeTab={detailTab}
        onTabChange={handleTabChange}
      />

      {detailTab === 'overview' && (
        <div className="space-y-4">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 font-medium w-1/3">ID</td><td>{user.id}</td></tr>
              <tr><td className="py-2 font-medium">Email</td><td>{user.email}</td></tr>
              <tr><td className="py-2 font-medium">Username</td><td>{user.username || '-'}</td></tr>
              <tr><td className="py-2 font-medium">Role</td><td>{user.role}</td></tr>
              <tr><td className="py-2 font-medium">Tier</td><td>{user.subscriptionTier}</td></tr>
              <tr><td className="py-2 font-medium">Verified</td><td>{user.isVerified ? 'Yes' : 'No'}</td></tr>
              <tr><td className="py-2 font-medium">Banned</td><td>{user.isBanned ? `Yes${user.bannedUntil ? ` (until ${formatDate(user.bannedUntil)})` : ' (Permanent)'}` : 'No'}</td></tr>
              <tr><td className="py-2 font-medium">Wallet</td><td>{balance} coins</td></tr>
              <tr><td className="py-2 font-medium">Stripe</td><td>{user.stripeCustomerId || 'Not linked'}</td></tr>
              <tr><td className="py-2 font-medium">Created</td><td>{formatDate(user.createdAt)}</td></tr>
            </tbody>
          </table>
          {(user.fullName || user.addressLine1) && (
            <>
              <h4 className="font-medium text-sm mt-3">Address</h4>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-1 font-medium w-1/3">Name</td><td>{user.fullName || '-'}</td></tr>
                  <tr><td className="py-1 font-medium">Address</td><td>{[user.addressLine1, user.addressLine2].filter(Boolean).join(', ') || '-'}</td></tr>
                  <tr><td className="py-1 font-medium">City/State</td><td>{[user.city, user.state].filter(Boolean).join(', ') || '-'}</td></tr>
                  <tr><td className="py-1 font-medium">Country/Zip</td><td>{[user.country, user.zipcode].filter(Boolean).join(' ') || '-'}</td></tr>
                </tbody>
              </table>
            </>
          )}
          {Object.keys(stats).length > 0 && (
            <div className="flex gap-3 flex-wrap mt-3">
              {stats.totalGames !== undefined && <div className="px-3 py-2 bg-blue-50 rounded text-sm"><span className="font-medium">{stats.totalGames}</span> <span className="text-gray-500">games</span></div>}
              {stats.wins !== undefined && <div className="px-3 py-2 bg-green-50 rounded text-sm"><span className="font-medium">{stats.wins}</span> <span className="text-gray-500">wins</span></div>}
              {stats.losses !== undefined && <div className="px-3 py-2 bg-red-50 rounded text-sm"><span className="font-medium">{stats.losses}</span> <span className="text-gray-500">losses</span></div>}
            </div>
          )}
        </div>
      )}

      {detailTab === 'wallet' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg">
            <span className="text-lg font-semibold">{balance} coins</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Grant Coins</h4>
            <div className="flex gap-2">
              <input type="number" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} placeholder="Amount" min={1} className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm" />
              <input type="text" value={grantDesc} onChange={(e) => setGrantDesc(e.target.value)} placeholder="Description" className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" />
              <Button variant="success" size="sm" onClick={handleGrantCoins}>Grant</Button>
            </div>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {walletTxs.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-3 py-2">{tx.id}</td>
                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs ${tx.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tx.type}</span></td>
                    <td className="px-3 py-2">{tx.amount > 0 ? '+' : ''}{tx.amount}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{tx.description}</td>
                    <td className="px-3 py-2">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
                {walletTxs.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No transactions</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailTab === 'stats' && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr><th className="px-3 py-2 text-left">Stat</th><th className="px-3 py-2 text-left">Value</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(stats).map(([key, val]) => (
                <tr key={key}><td className="px-3 py-2 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td><td className="px-3 py-2">{val}</td></tr>
              ))}
              {Object.keys(stats).length === 0 && <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-400">No statistics</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {detailTab === 'payments' && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Brand</th>
                <th className="px-3 py-2 text-left">Last 4</th>
                <th className="px-3 py-2 text-left">Expiry</th>
                <th className="px-3 py-2 text-left">Default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentMethods.map((pm) => (
                <tr key={pm.id}>
                  <td className="px-3 py-2">{pm.type}</td>
                  <td className="px-3 py-2 capitalize">{pm.brand}</td>
                  <td className="px-3 py-2">**** {pm.last4}</td>
                  <td className="px-3 py-2">{pm.expMonth}/{pm.expYear}</td>
                  <td className="px-3 py-2">{pm.isDefault ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Yes</span> : 'No'}</td>
                </tr>
              ))}
              {paymentMethods.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No payment methods</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
