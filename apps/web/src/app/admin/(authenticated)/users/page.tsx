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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Tabs } from '@/components/tabs';

/* ────── Types ────── */
interface AdminUser {
  id: number; email: string; username?: string | null;
  role: string; subscriptionTier: string;
  isVerified: boolean; isBanned: boolean; isVoided?: boolean;
  stripeCustomerId?: string | null; createdAt: string;
  wallet?: { balance: string | number };
  statistics?: Record<string, number>;
  fullName?: string | null; bannedUntil?: string | null;
  addressLine1?: string; addressLine2?: string;
  city?: string; state?: string; country?: string; zipcode?: string;
}
interface WalletTx { id: number; type: string; amount: number; description: string; createdAt: string }
interface PaymentMethod { id: string; type: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean }
interface StripeInfo { customerId?: string; email?: string; name?: string; created?: string }

const ROLES = ['player', 'admin'];
const TIERS = ['FREE', 'GOLD'];
const columnHelper = createColumnHelper<AdminUser>();

export default function UsersPage() {
  /* ─── State ─── */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  // Filters
  const [filterRole, setFilterRole] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Record<string, unknown>>({
    email: '', username: '', password: '', role: 'player',
    subscriptionTier: 'FREE', isVerified: false,
    fullName: '', addressLine1: '', addressLine2: '',
    city: '', state: '', country: '', zipcode: '',
  });
  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  // Ban
  const [banTarget, setBanTarget] = useState<number | null>(null);
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('permanent');
  const [banDays, setBanDays] = useState('7');
  // Delete
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  // Detail (4 tabs)
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantDesc, setGrantDesc] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  // Stripe management
  const [stripeDialog, setStripeDialog] = useState<AdminUser | null>(null);
  const [stripeInfo, setStripeInfo] = useState<StripeInfo | null>(null);
  const [stripeLinkId, setStripeLinkId] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  // Verification
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  // Confirm
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; variant?: 'danger' | 'default'; onConfirm: () => void;
  } | null>(null);

  /* ─── Load ─── */
  const load = useCallback(async () => {
    try {
      const params: Record<string, string | undefined> = {};
      if (filterRole) params.role = filterRole;
      if (filterVerified) params.isVerified = filterVerified;
      const res = await api.getUsers(params);
      const list = Array.isArray(res) ? res : (res as { data?: AdminUser[] }).data || [];
      setUsers(list as AdminUser[]);
    } catch (err) {
      toast.error(`Failed to load users: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally { setLoading(false); }
  }, [filterRole, filterVerified]);

  useEffect(() => { load(); }, [load]);

  /* ─── Detail loader ─── */
  const loadDetail = async (id: number) => {
    try {
      const u = (await api.getUser(id)) as AdminUser;
      setDetailUser(u);
      setDetailTab('overview');
      setWalletTxs([]);
      setPaymentMethods([]);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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

  /* ─── Tab change handler ─── */
  const handleDetailTabChange = (tab: string) => {
    setDetailTab(tab);
    if (!detailUser) return;
    if (tab === 'wallet') loadWallet(detailUser.id);
    if (tab === 'payments') loadPaymentMethods(detailUser.id);
  };

  /* ─── Create ─── */
  const handleCreate = async () => {
    const f = createForm;
    if (!f.email || !f.password) { toast.error('Email and password are required'); return; }
    try {
      await api.createUser({
        email: f.email, username: f.username || undefined,
        password: f.password, role: f.role,
        subscriptionTier: f.subscriptionTier,
        isVerified: !!f.isVerified,
        fullName: f.fullName || undefined,
        addressLine1: f.addressLine1 || undefined,
        addressLine2: f.addressLine2 || undefined,
        city: f.city || undefined, state: f.state || undefined,
        country: f.country || undefined, zipcode: f.zipcode || undefined,
      });
      toast.success('User created');
      setShowCreate(false);
      setCreateForm({ email: '', username: '', password: '', role: 'player', subscriptionTier: 'FREE', isVerified: false, fullName: '', addressLine1: '', addressLine2: '', city: '', state: '', country: '', zipcode: '' });
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Edit ─── */
  const openEdit = (u: AdminUser) => {
    setEditForm({
      id: u.id, email: u.email, username: u.username || '',
      role: u.role, subscriptionTier: u.subscriptionTier,
      isVerified: u.isVerified, password: '',
      fullName: u.fullName || '',
      addressLine1: u.addressLine1 || '', addressLine2: u.addressLine2 || '',
      city: u.city || '', state: u.state || '',
      country: u.country || '', zipcode: u.zipcode || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const data: Record<string, unknown> = {
      email: editForm.email, username: (editForm.username as string) || null,
      role: editForm.role, subscriptionTier: editForm.subscriptionTier,
      isVerified: editForm.isVerified,
      fullName: editForm.fullName || null,
      addressLine1: editForm.addressLine1 || null,
      addressLine2: editForm.addressLine2 || null,
      city: editForm.city || null, state: editForm.state || null,
      country: editForm.country || null, zipcode: editForm.zipcode || null,
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

  /* ─── Ban / Unban ─── */
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
      await api.banUser(banTarget, { isBanned: true, bannedUntil });
      toast.success('User banned');
      setBanTarget(null);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnban = async (id: number) => {
    try {
      await api.unbanUser(id);
      toast.success('User unbanned');
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget.id, deleteReason || undefined);
      toast.success('User voided');
      setDeleteTarget(null);
      setDeleteReason('');
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Grant Coins ─── */
  const handleGrantCoins = async () => {
    if (!detailUser || !grantAmount) return;
    try {
      await api.grantCoins(detailUser.id, Number(grantAmount), grantDesc || 'Admin grant');
      toast.success('Coins granted');
      setGrantAmount('');
      setGrantDesc('');
      loadDetail(detailUser.id);
      loadWallet(detailUser.id);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Stripe ─── */
  const openStripe = async (u: AdminUser) => {
    setStripeDialog(u);
    setStripeInfo(null);
    setStripeLinkId('');
    setStripeLoading(true);
    try {
      const info = (await api.getUserStripeInfo(u.id)) as StripeInfo;
      setStripeInfo(info);
    } catch { setStripeInfo(null); }
    finally { setStripeLoading(false); }
  };

  const handleLinkStripe = async () => {
    if (!stripeDialog || !stripeLinkId) return;
    try {
      await api.linkStripeCustomer(stripeDialog.id, stripeLinkId);
      toast.success('Stripe customer linked');
      openStripe(stripeDialog);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnlinkStripe = async () => {
    if (!stripeDialog) return;
    try {
      await api.unlinkStripeCustomer(stripeDialog.id);
      toast.success('Stripe customer unlinked');
      openStripe(stripeDialog);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCreateStripeCustomer = async () => {
    if (!stripeDialog) return;
    try {
      await api.createStripeCustomer(stripeDialog.id);
      toast.success('Stripe customer created');
      openStripe(stripeDialog);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Verification ─── */
  const handleRequestVerification = async (u: AdminUser) => {
    try {
      await api.adminRequestVerification(u.id);
      const codeRes = (await api.getLatestVerificationCode(u.id)) as { code?: string };
      setVerifyCode(codeRes.code || 'Code sent');
      toast.success('Verification code requested');
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleVerifyInstantly = (u: AdminUser) => {
    setConfirmAction({
      title: 'Verify User', message: `Verify ${u.email} instantly?`,
      onConfirm: async () => {
        try {
          await api.adminVerifyUser(u.id);
          toast.success('User verified');
          setConfirmAction(null);
          load();
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  /* ─── Columns ─── */
  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('username', { header: 'Username', cell: (i) => i.getValue() || '-' }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: (i) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{i.getValue()}</span>,
    }),
    columnHelper.accessor('subscriptionTier', {
      header: 'Tier',
      cell: (i) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() === 'GOLD' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{i.getValue()}</span>,
    }),
    columnHelper.accessor('isVerified', {
      header: 'Verified',
      cell: (i) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{i.getValue() ? 'Yes' : 'No'}</span>,
    }),
    columnHelper.accessor('createdAt', { header: 'Created', cell: (i) => formatDateOnly(i.getValue()) }),
    columnHelper.display({
      id: 'actions', header: 'Actions',
      cell: (info) => {
        const u = info.row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => loadDetail(u.id)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" title="View"><i className="fas fa-eye" /></button>
            <button onClick={() => openEdit(u)} className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600" title="Edit"><i className="fas fa-edit" /></button>
            <button onClick={() => openStripe(u)} className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700" title="Stripe"><i className="fab fa-stripe-s" /></button>
            {!u.isVerified && (
              <>
                <button onClick={() => handleRequestVerification(u)} className="px-2 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700" title="Verification Code"><i className="fas fa-envelope" /></button>
                <button onClick={() => handleVerifyInstantly(u)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Verify"><i className="fas fa-check-circle" /></button>
              </>
            )}
            {u.isBanned ? (
              <button onClick={() => handleUnban(u.id)} className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600" title="Unban"><i className="fas fa-unlock" /></button>
            ) : (
              <button onClick={() => { setBanTarget(u.id); setBanType('permanent'); }} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Ban"><i className="fas fa-ban" /></button>
            )}
            <button onClick={() => { setDeleteTarget(u); setDeleteReason(''); }} className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700" title="Delete"><i className="fas fa-trash" /></button>
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  const fRow = (label: string, input: React.ReactNode) => (
    <div><label className="block text-sm font-medium mb-1">{label}</label>{input}</div>
  );
  const fInput = (form: Record<string, unknown>, key: string, setForm: (v: Record<string, unknown>) => void, type = 'text', ph = '') => (
    <input type={type} value={String(form[key] ?? '')} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={ph} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
  );

  const balance = detailUser?.wallet ? Math.round(parseFloat(String(detailUser.wallet.balance))) : 0;
  const stats = detailUser?.statistics || {};

  return (
    <div>
      <PageHeader
        title="Users"
        actions={
          <div className="flex items-center gap-2">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterVerified} onChange={(e) => setFilterVerified(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Verified</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
            <button onClick={() => setShowCreate(true)} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              New User
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={users} searchPlaceholder="Search users..." />
      </div>

      {/* ═══ Create User ═══ */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create User" className="max-w-lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {fRow('Email *', fInput(createForm, 'email', setCreateForm, 'email'))}
            {fRow('Username', fInput(createForm, 'username', setCreateForm))}
          </div>
          {fRow('Password *', fInput(createForm, 'password', setCreateForm, 'password'))}
          <div className="grid grid-cols-2 gap-3">
            {fRow('Role', <select value={String(createForm.role)} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>)}
            {fRow('Tier', <select value={String(createForm.subscriptionTier)} onChange={(e) => setCreateForm({ ...createForm, subscriptionTier: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}</select>)}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!createForm.isVerified} onChange={(e) => setCreateForm({ ...createForm, isVerified: e.target.checked })} /> Verified</label>
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-medium mb-2">Address (optional)</h4>
            <div className="grid grid-cols-2 gap-3">
              {fRow('Full Name', fInput(createForm, 'fullName', setCreateForm))}
              {fRow('Address Line 1', fInput(createForm, 'addressLine1', setCreateForm))}
              {fRow('Address Line 2', fInput(createForm, 'addressLine2', setCreateForm))}
              {fRow('City', fInput(createForm, 'city', setCreateForm))}
              {fRow('State', fInput(createForm, 'state', setCreateForm))}
              {fRow('Country', fInput(createForm, 'country', setCreateForm))}
              {fRow('Zipcode', fInput(createForm, 'zipcode', setCreateForm))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create User</button>
          </div>
        </div>
      </Dialog>

      {/* ═══ Edit User ═══ */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit User" className="max-w-lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {fRow('Email', fInput(editForm, 'email', setEditForm, 'email'))}
            {fRow('Username', fInput(editForm, 'username', setEditForm))}
          </div>
          {fRow('Password (blank to keep)', fInput(editForm, 'password', setEditForm, 'password'))}
          <div className="grid grid-cols-2 gap-3">
            {fRow('Role', <select value={String(editForm.role || '')} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>)}
            {fRow('Tier', <select value={String(editForm.subscriptionTier || '')} onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}</select>)}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editForm.isVerified} onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })} /> Verified</label>
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-medium mb-2">Address</h4>
            <div className="grid grid-cols-2 gap-3">
              {fRow('Full Name', fInput(editForm, 'fullName', setEditForm))}
              {fRow('Address Line 1', fInput(editForm, 'addressLine1', setEditForm))}
              {fRow('Address Line 2', fInput(editForm, 'addressLine2', setEditForm))}
              {fRow('City', fInput(editForm, 'city', setEditForm))}
              {fRow('State', fInput(editForm, 'state', setEditForm))}
              {fRow('Country', fInput(editForm, 'country', setEditForm))}
              {fRow('Zipcode', fInput(editForm, 'zipcode', setEditForm))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={saveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
          </div>
        </div>
      </Dialog>

      {/* ═══ User Detail (4 Tabs) ═══ */}
      <Dialog open={detailUser !== null} onClose={() => setDetailUser(null)} title="User Details" className="max-w-3xl">
        {detailUser && (
          <>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'wallet', label: 'Wallet' },
                { id: 'stats', label: 'Statistics' },
                { id: 'payments', label: 'Payment Methods' },
              ]}
              activeTab={detailTab}
              onTabChange={handleDetailTabChange}
            />

            {detailTab === 'overview' && (
              <div className="space-y-4">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-2 font-medium w-1/3">ID</td><td>{detailUser.id}</td></tr>
                    <tr><td className="py-2 font-medium">Email</td><td>{detailUser.email}</td></tr>
                    <tr><td className="py-2 font-medium">Username</td><td>{detailUser.username || '-'}</td></tr>
                    <tr><td className="py-2 font-medium">Role</td><td>{detailUser.role}</td></tr>
                    <tr><td className="py-2 font-medium">Tier</td><td>{detailUser.subscriptionTier}</td></tr>
                    <tr><td className="py-2 font-medium">Verified</td><td>{detailUser.isVerified ? 'Yes' : 'No'}</td></tr>
                    <tr><td className="py-2 font-medium">Banned</td><td>{detailUser.isBanned ? `Yes${detailUser.bannedUntil ? ` (until ${formatDate(detailUser.bannedUntil)})` : ' (Permanent)'}` : 'No'}</td></tr>
                    <tr><td className="py-2 font-medium">Wallet</td><td>{balance} coins</td></tr>
                    <tr><td className="py-2 font-medium">Stripe</td><td>{detailUser.stripeCustomerId || 'Not linked'}</td></tr>
                    <tr><td className="py-2 font-medium">Created</td><td>{formatDate(detailUser.createdAt)}</td></tr>
                  </tbody>
                </table>
                {(detailUser.fullName || detailUser.addressLine1) && (
                  <>
                    <h4 className="font-medium text-sm mt-3">Address</h4>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        <tr><td className="py-1 font-medium w-1/3">Name</td><td>{detailUser.fullName || '-'}</td></tr>
                        <tr><td className="py-1 font-medium">Address</td><td>{[detailUser.addressLine1, detailUser.addressLine2].filter(Boolean).join(', ') || '-'}</td></tr>
                        <tr><td className="py-1 font-medium">City/State</td><td>{[detailUser.city, detailUser.state].filter(Boolean).join(', ') || '-'}</td></tr>
                        <tr><td className="py-1 font-medium">Country/Zip</td><td>{[detailUser.country, detailUser.zipcode].filter(Boolean).join(' ') || '-'}</td></tr>
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
                    <button onClick={handleGrantCoins} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">Grant</button>
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
          </>
        )}
      </Dialog>

      {/* ═══ Stripe Management ═══ */}
      <Dialog open={stripeDialog !== null} onClose={() => setStripeDialog(null)} title="Stripe Management">
        {stripeDialog && (
          <div className="space-y-4">
            {stripeLoading ? (
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
                <button onClick={handleUnlinkStripe} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                  Unlink Customer
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">No Stripe customer linked.</p>
                <div className="flex gap-2">
                  <input type="text" value={stripeLinkId} onChange={(e) => setStripeLinkId(e.target.value)} placeholder="Stripe Customer ID (cus_...)" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                  <button onClick={handleLinkStripe} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Link</button>
                </div>
                <div className="border-t pt-3">
                  <button onClick={handleCreateStripeCustomer} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Create New Customer</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* ═══ Ban ═══ */}
      <Dialog open={banTarget !== null} onClose={() => setBanTarget(null)} title="Ban User">
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={banType === 'permanent'} onChange={() => setBanType('permanent')} /> Permanent</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={banType === 'temporary'} onChange={() => setBanType('temporary')} /> Temporary</label>
          </div>
          {banType === 'temporary' && fRow('Ban for how many days?', <input type="number" value={banDays} onChange={(e) => setBanDays(e.target.value)} min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />)}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setBanTarget(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={handleBan} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Ban User</button>
          </div>
        </div>
      </Dialog>

      {/* ═══ Delete ═══ */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete User">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Are you sure you want to void <strong>{deleteTarget.email}</strong>? This is a soft delete.</p>
            <div>
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Reason for deletion..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══ Verification Code ═══ */}
      <Dialog open={verifyCode !== null} onClose={() => setVerifyCode(null)} title="Verification Code">
        <div className="space-y-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-mono font-bold tracking-widest">{verifyCode}</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(verifyCode || ''); toast.success('Copied!'); }} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Copy to Clipboard
          </button>
        </div>
      </Dialog>

      <ConfirmDialog open={confirmAction !== null} title={confirmAction?.title || ''} message={confirmAction?.message || ''} variant={confirmAction?.variant} onConfirm={() => confirmAction?.onConfirm()} onCancel={() => setConfirmAction(null)} />
    </div>
  );
}
