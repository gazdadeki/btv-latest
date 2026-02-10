'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDate, formatDateOnly } from '@/lib/utils';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';

interface AdminUser {
  id: number;
  email: string;
  username?: string | null;
  role: string;
  subscriptionTier: string;
  isVerified: boolean;
  isBanned: boolean;
  isVoided?: boolean;
  stripeCustomerId?: string | null;
  createdAt: string;
  wallet?: { balance: string | number };
  statistics?: Record<string, number>;
  fullName?: string | null;
  bannedUntil?: string | null;
}

const columnHelper = createColumnHelper<AdminUser>();

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [banTarget, setBanTarget] = useState<number | null>(null);
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('permanent');
  const [banDays, setBanDays] = useState('7');

  const load = useCallback(async () => {
    try {
      const res = await api.getUsers();
      const list = Array.isArray(res) ? res : (res as { data?: AdminUser[] }).data || [];
      setUsers(list as AdminUser[]);
    } catch (err) {
      toast.error(`Failed to load users: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (u: AdminUser) => {
    setEditForm({
      id: u.id,
      email: u.email,
      username: u.username || '',
      role: u.role,
      subscriptionTier: u.subscriptionTier,
      isVerified: u.isVerified,
      password: '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const data: Record<string, unknown> = {
      email: editForm.email,
      username: (editForm.username as string) || null,
      role: editForm.role,
      subscriptionTier: editForm.subscriptionTier,
      isVerified: editForm.isVerified,
    };
    if (editForm.password) data.password = editForm.password;
    try {
      await api.updateUser(editForm.id as number, data);
      toast.success('User updated');
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBan = async () => {
    if (!banTarget) return;
    let bannedUntil: string | null = null;
    if (banType === 'temporary') {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(banDays, 10));
      d.setHours(23, 59, 59, 999);
      bannedUntil = d.toISOString();
    }
    try {
      await api.updateUser(banTarget, { isBanned: true, bannedUntil });
      toast.success('User banned');
      setBanTarget(null);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnban = async (id: number) => {
    try {
      await api.updateUser(id, { isBanned: false, bannedUntil: null });
      toast.success('User unbanned');
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('username', { header: 'Username', cell: (i) => i.getValue() || '-' }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
          {i.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('subscriptionTier', {
      header: 'Tier',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() === 'GOLD' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
          {i.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('isVerified', {
      header: 'Verified',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {i.getValue() ? 'Yes' : 'No'}
        </span>
      ),
    }),
    columnHelper.accessor('isBanned', {
      header: 'Banned',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {i.getValue() ? 'Yes' : 'No'}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (i) => formatDateOnly(i.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const u = info.row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setViewUser(u)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" title="View">
              <i className="fas fa-eye" />
            </button>
            <button onClick={() => openEdit(u)} className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600" title="Edit">
              <i className="fas fa-edit" />
            </button>
            {u.isBanned ? (
              <button onClick={() => handleUnban(u.id)} className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600" title="Unban">
                <i className="fas fa-unlock" />
              </button>
            ) : (
              <button onClick={() => { setBanTarget(u.id); setBanType('permanent'); }} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Ban">
                <i className="fas fa-ban" />
              </button>
            )}
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Users" />
      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={users} searchPlaceholder="Search users..." />
      </div>

      {/* View User Dialog */}
      <Dialog open={viewUser !== null} onClose={() => setViewUser(null)} title="User Details" className="max-w-2xl">
        {viewUser && (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 font-medium w-1/3">ID</td><td>{viewUser.id}</td></tr>
              <tr><td className="py-2 font-medium">Email</td><td>{viewUser.email}</td></tr>
              <tr><td className="py-2 font-medium">Username</td><td>{viewUser.username || '-'}</td></tr>
              <tr><td className="py-2 font-medium">Role</td><td>{viewUser.role}</td></tr>
              <tr><td className="py-2 font-medium">Tier</td><td>{viewUser.subscriptionTier}</td></tr>
              <tr><td className="py-2 font-medium">Verified</td><td>{viewUser.isVerified ? 'Yes' : 'No'}</td></tr>
              <tr><td className="py-2 font-medium">Banned</td><td>{viewUser.isBanned ? `Yes${viewUser.bannedUntil ? ` (until ${formatDate(viewUser.bannedUntil)})` : ' (Permanent)'}` : 'No'}</td></tr>
              <tr><td className="py-2 font-medium">Wallet</td><td>{viewUser.wallet ? `${Math.round(parseFloat(String(viewUser.wallet.balance)))} coins` : 'N/A'}</td></tr>
              <tr><td className="py-2 font-medium">Stripe</td><td>{viewUser.stripeCustomerId || 'Not linked'}</td></tr>
              <tr><td className="py-2 font-medium">Created</td><td>{formatDate(viewUser.createdAt)}</td></tr>
            </tbody>
          </table>
        )}
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input value={editForm.email as string || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input value={editForm.username as string || ''} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password (leave blank to keep)</label>
            <input type="password" value={editForm.password as string || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select value={editForm.role as string || ''} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subscription Tier</label>
            <select value={editForm.subscriptionTier as string || ''} onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="FREE">FREE</option>
              <option value="GOLD">GOLD</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editForm.isVerified as boolean || false} onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })} /> Verified
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={saveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
          </div>
        </div>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banTarget !== null} onClose={() => setBanTarget(null)} title="Ban User">
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={banType === 'permanent'} onChange={() => setBanType('permanent')} /> Permanent
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={banType === 'temporary'} onChange={() => setBanType('temporary')} /> Temporary
            </label>
          </div>
          {banType === 'temporary' && (
            <div>
              <label className="block text-sm font-medium mb-1">Ban for how many days?</label>
              <input type="number" value={banDays} onChange={(e) => setBanDays(e.target.value)} min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setBanTarget(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={handleBan} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Ban User</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
