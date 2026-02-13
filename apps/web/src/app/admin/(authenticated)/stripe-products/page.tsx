'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/button';

interface StripeProduct {
  id: number;
  name: string;
  description?: string;
  type: 'SUBSCRIPTION' | 'COIN_PACK';
  isActive: boolean;
  isArchived: boolean;
  syncStatus?: string;
  productData: { price: number; coins?: number; billingPeriod?: string; tier?: string };
  stripeProductId?: string;
  stripePriceId?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

const columnHelper = createColumnHelper<StripeProduct>();

const periodMap: Record<string, string> = {
  MONTHLY: '/month',
  SIX_MONTHS: '/6 months',
  YEARLY: '/year',
};

export default function StripeProductsPage() {
  const [data, setData] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<StripeProduct | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'SUBSCRIPTION' | 'COIN_PACK' | ''>('');
  const [formPrice, setFormPrice] = useState('');
  const [formBillingPeriod, setFormBillingPeriod] = useState('MONTHLY');
  const [formCoins, setFormCoins] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState('0');
  const [formActive, setFormActive] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = (await api.getStripeProducts()) as { products?: StripeProduct[] };
      let products = res.products || [];
      if (showActive) products = products.filter((p) => p.isActive && !p.isArchived);
      setData(products);
    } catch (err) {
      toast.error(`Failed to load products: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [showActive]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDesc('');
    setFormType('');
    setFormPrice('');
    setFormBillingPeriod('MONTHLY');
    setFormCoins('');
    setFormDisplayOrder('0');
    setFormActive(true);
    setModalOpen(true);
  };

  const openEdit = (p: StripeProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDesc(p.description || '');
    setFormType(p.type);
    setFormPrice(String(p.productData.price));
    setFormBillingPeriod(p.productData.billingPeriod || 'MONTHLY');
    setFormCoins(p.productData.coins ? String(p.productData.coins) : '');
    setFormDisplayOrder(String(p.displayOrder || 0));
    setFormActive(p.isActive && !p.isArchived);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formType || !formPrice) {
      toast.error('Please fill all required fields');
      return;
    }
    const productData: Record<string, unknown> = { price: parseFloat(formPrice) };
    if (formType === 'SUBSCRIPTION') {
      productData.billingPeriod = formBillingPeriod;
      productData.tier = 'GOLD';
    } else if (formType === 'COIN_PACK') {
      productData.coins = parseInt(formCoins, 10);
    }
    const payload = {
      name: formName,
      description: formDesc || undefined,
      type: formType,
      price: parseFloat(formPrice),
      productData,
      displayOrder: parseInt(formDisplayOrder, 10) || 0,
      isActive: formActive,
    };

    try {
      if (editingProduct) {
        await api.updateStripeProduct(editingProduct.id, payload);
        toast.success('Product updated');
      } else {
        await api.createStripeProduct(payload);
        toast.success('Product created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await api.archiveStripeProduct(archiveTarget);
      toast.success('Product archived');
      setArchiveTarget(null);
      load();
    } catch (err) {
      toast.error(`Failed to archive: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSync = async (id: number) => {
    try {
      await api.syncStripeProduct(id);
      toast.success('Product synced');
      load();
    } catch (err) {
      toast.error(`Failed to sync: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = (await api.syncFromStripe()) as { created: number; updated: number };
      toast.success(`Sync complete: ${result.created} created, ${result.updated} updated`);
      load();
    } catch (err) {
      toast.error(`Failed to sync: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('name', { header: 'Name' }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: (info) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${info.getValue() === 'SUBSCRIPTION' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {info.getValue() === 'SUBSCRIPTION' ? 'Subscription' : 'Coin Pack'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'price',
      header: 'Price',
      cell: (info) => {
        const p = info.row.original;
        let s = `$${p.productData.price.toFixed(2)}`;
        if (p.type === 'COIN_PACK' && p.productData.coins) s += ` (${p.productData.coins} coins)`;
        else if (p.type === 'SUBSCRIPTION' && p.productData.billingPeriod) s += periodMap[p.productData.billingPeriod] || '';
        return s;
      },
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const p = info.row.original;
        const active = p.isActive && !p.isArchived;
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        );
      },
    }),
    columnHelper.accessor('syncStatus', {
      header: 'Sync',
      cell: (info) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${info.getValue() === 'synced' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {info.getValue() === 'synced' ? 'Synced' : 'Out of Sync'}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const p = info.row.original;
        return (
          <div className="flex gap-1">
            <Button size="xs" onClick={() => openEdit(p)}>
              <i className="fas fa-edit" />
            </Button>
            {p.syncStatus !== 'synced' && (
              <Button variant="warning" size="xs" onClick={() => handleSync(p.id)}>
                <i className="fas fa-sync" />
              </Button>
            )}
            {!p.isArchived && (
              <Button variant="danger" size="xs" onClick={() => setArchiveTarget(p.id)}>
                <i className="fas fa-archive" />
              </Button>
            )}
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Stripe Products"
        actions={
          <div className="flex gap-2">
            <select
              value={showActive ? 'active' : 'all'}
              onChange={(e) => setShowActive(e.target.value === 'active')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="active">Active Only</option>
              <option value="all">All Products</option>
            </select>
            <Button variant="success" size="lg" onClick={handleSyncAll}>
              <i className="fas fa-sync mr-1" /> Sync from Stripe
            </Button>
            <Button variant="primary" size="lg" onClick={openCreate}>
              <i className="fas fa-plus mr-1" /> Create Product
            </Button>
          </div>
        }
      />
      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={data} searchPlaceholder="Search products..." />
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Create Product'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value as 'SUBSCRIPTION' | 'COIN_PACK')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select Type</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="COIN_PACK">Coin Pack</option>
            </select>
          </div>
          {formType === 'SUBSCRIPTION' && (
            <div>
              <label className="block text-sm font-medium mb-1">Billing Period *</label>
              <select value={formBillingPeriod} onChange={(e) => setFormBillingPeriod(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="MONTHLY">Monthly</option>
                <option value="SIX_MONTHS">6 Months</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          )}
          {formType === 'COIN_PACK' && (
            <div>
              <label className="block text-sm font-medium mb-1">Coins *</label>
              <input type="number" value={formCoins} onChange={(e) => setFormCoins(e.target.value)} min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Price (USD) *</label>
            <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} step="0.01" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Display Order</label>
            <input type="number" value={formDisplayOrder} onChange={(e) => setFormDisplayOrder(e.target.value)} min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive Product"
        message="Are you sure you want to archive this product? It will be set to inactive in Stripe."
        confirmLabel="Archive"
        variant="danger"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
