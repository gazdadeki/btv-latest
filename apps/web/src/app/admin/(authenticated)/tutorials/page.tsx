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

/* ────── Types ────── */
interface Tutorial {
  id: number; title: string; slug?: string; excerpt?: string;
  content: string; status?: string; isPublished: boolean;
  isFeatured?: boolean; createdAt: string;
  tags?: Array<{ id: number; name: string }>;
  category?: { id: number; name: string };
  categoryId?: number; tagIds?: number[];
}
interface Tag { id: number; name: string }
interface Category { id: number; name: string; description?: string }

const STATUSES = ['DRAFT', 'PUBLISHED'];
const columnHelper = createColumnHelper<Tutorial>();

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function TutorialsPage() {
  /* ─── State ─── */
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tutorials' | 'tags' | 'categories'>('tutorials');
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFeatured, setFilterFeatured] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  // Create/Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '', slug: '', excerpt: '', content: '',
    status: 'DRAFT', isFeatured: false,
    categoryId: '', tagIds: [] as number[],
  });
  // Detail
  const [detailTutorial, setDetailTutorial] = useState<Tutorial | null>(null);
  // Delete
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  // Tags & Categories
  const [newTagName, setNewTagName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');

  /* ─── Load ─── */
  const loadAll = useCallback(async () => {
    try {
      const params: Record<string, string | undefined> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterFeatured) params.featured = filterFeatured;
      if (filterCategory) params.categoryId = filterCategory;
      if (filterTag) params.tagId = filterTag;

      const [t, tg, cat] = await Promise.all([
        api.getTutorials(params) as Promise<Tutorial[]>,
        api.getTutorialTags() as Promise<Tag[]>,
        api.getTutorialCategories() as Promise<Category[]>,
      ]);
      setTutorials(Array.isArray(t) ? t : []);
      setTags(Array.isArray(tg) ? tg : []);
      setCategories(Array.isArray(cat) ? cat : []);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally { setLoading(false); }
  }, [filterStatus, filterFeatured, filterCategory, filterTag]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── Detail ─── */
  const loadDetail = async (id: number) => {
    try {
      const t = (await api.getTutorial(id)) as Tutorial;
      setDetailTutorial(t);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Create / Edit ─── */
  const openCreate = () => {
    setEditingTutorial(null);
    setForm({ title: '', slug: '', excerpt: '', content: '', status: 'DRAFT', isFeatured: false, categoryId: '', tagIds: [] });
    setEditOpen(true);
  };

  const openEdit = (t: Tutorial) => {
    setEditingTutorial(t);
    setForm({
      title: t.title, slug: t.slug || slugify(t.title),
      excerpt: t.excerpt || '', content: t.content,
      status: t.status || (t.isPublished ? 'PUBLISHED' : 'DRAFT'),
      isFeatured: !!t.isFeatured,
      categoryId: t.categoryId || t.category?.id || '',
      tagIds: t.tagIds || t.tags?.map((tg) => tg.id) || [],
    });
    setEditOpen(true);
  };

  const handleTitleChange = (title: string) => {
    const autoSlug = !editingTutorial || form.slug === slugify(String(form.title));
    setForm({
      ...form,
      title,
      ...(autoSlug ? { slug: slugify(title) } : {}),
    });
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    const payload: Record<string, unknown> = {
      title: form.title,
      slug: form.slug || slugify(String(form.title)),
      excerpt: form.excerpt || null,
      content: form.content,
      status: form.status,
      isPublished: form.status === 'PUBLISHED',
      isFeatured: !!form.isFeatured,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      tagIds: (form.tagIds as number[])?.length > 0 ? form.tagIds : [],
    };
    try {
      if (editingTutorial) {
        await api.updateTutorial(editingTutorial.id, payload);
        toast.success('Tutorial updated');
      } else {
        await api.createTutorial(payload);
        toast.success('Tutorial created');
      }
      setEditOpen(false);
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTutorial(deleteTarget);
      toast.success('Tutorial deleted');
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Tags ─── */
  const addTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await api.createTutorialTag({ name: newTagName.trim() });
      toast.success('Tag created');
      setNewTagName('');
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const saveEditTag = async () => {
    if (!editTag || !editTagName.trim()) return;
    try {
      await api.updateTutorialTag(editTag.id, { name: editTagName.trim() });
      toast.success('Tag updated');
      setEditTag(null);
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const deleteTag = async (id: number) => {
    try {
      await api.deleteTutorialTag(id);
      toast.success('Tag deleted');
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Categories ─── */
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.createTutorialCategory({ name: newCategoryName.trim() });
      toast.success('Category created');
      setNewCategoryName('');
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const saveEditCat = async () => {
    if (!editCat || !editCatName.trim()) return;
    try {
      await api.updateTutorialCategory(editCat.id, { name: editCatName.trim(), description: editCatDesc || null });
      toast.success('Category updated');
      setEditCat(null);
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await api.deleteTutorialCategory(id);
      toast.success('Category deleted');
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const toggleTag = (tagId: number) => {
    const ids = (form.tagIds as number[]) || [];
    setForm({
      ...form,
      tagIds: ids.includes(tagId) ? ids.filter((x) => x !== tagId) : [...ids, tagId],
    });
  };

  /* ─── Columns ─── */
  const tutorialColumns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('title', { header: 'Title' }),
    columnHelper.display({
      id: 'status', header: 'Status',
      cell: (i) => {
        const t = i.row.original;
        const st = t.status || (t.isPublished ? 'PUBLISHED' : 'DRAFT');
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${st === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{st}</span>;
      },
    }),
    columnHelper.display({
      id: 'featured', header: 'Featured',
      cell: (i) => i.row.original.isFeatured ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Yes</span> : <span className="text-gray-400 text-xs">No</span>,
    }),
    columnHelper.accessor((row) => row.category?.name || '-', { id: 'category', header: 'Category' }),
    columnHelper.display({
      id: 'tags', header: 'Tags',
      cell: (i) => {
        const t = i.row.original.tags || [];
        return t.length > 0 ? (
          <div className="flex gap-1 flex-wrap">{t.map((tg) => <span key={tg.id} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{tg.name}</span>)}</div>
        ) : '-';
      },
    }),
    columnHelper.accessor('createdAt', { header: 'Created', cell: (i) => formatDate(i.getValue()) }),
    columnHelper.display({
      id: 'actions', header: 'Actions',
      cell: (info) => (
        <div className="flex gap-1">
          <Button variant="primary" size="xs" onClick={() => loadDetail(info.row.original.id)} title="View"><i className="fas fa-eye" /></Button>
          <Button size="xs" onClick={() => openEdit(info.row.original)} title="Edit"><i className="fas fa-edit" /></Button>
          <Button variant="danger" size="xs" onClick={() => setDeleteTarget(info.row.original.id)} title="Delete"><i className="fas fa-trash" /></Button>
        </div>
      ),
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Tutorials" actions={
        <Button variant="primary" size="lg" onClick={openCreate}>
          <i className="fas fa-plus mr-1" /> New Tutorial
        </Button>
      } />

      {/* Section Tabs */}
      <div className="flex gap-2 mb-4">
        {(['tutorials', 'tags', 'categories'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-lg cursor-pointer ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tutorials Tab */}
      {activeTab === 'tutorials' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">All</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Featured</label>
                <select value={filterFeatured} onChange={(e) => setFilterFeatured(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">All</option>
                  {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tag</label>
                <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">All</option>
                  {tags.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
              </div>
              <Button variant="secondary" size="lg" onClick={() => { setFilterStatus(''); setFilterFeatured(''); setFilterCategory(''); setFilterTag(''); }}>Clear</Button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <DataTable columns={tutorialColumns} data={tutorials} searchPlaceholder="Search tutorials..." />
          </div>
        </>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-2 mb-4">
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="New tag name" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
            <Button variant="primary" size="lg" onClick={addTag}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                {t.name}
                <button onClick={() => { setEditTag(t); setEditTagName(t.name); }} className="text-blue-500 hover:text-blue-800 cursor-pointer ml-1" title="Edit"><i className="fas fa-pen text-xs" /></button>
                <button onClick={() => deleteTag(t.id)} className="text-blue-500 hover:text-red-500 cursor-pointer" title="Delete">&times;</button>
              </span>
            ))}
            {tags.length === 0 && <p className="text-gray-400 text-sm">No tags yet</p>}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-2 mb-4">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="New category name" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
            <Button variant="primary" size="lg" onClick={addCategory}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm">
                {c.name}
                <button onClick={() => { setEditCat(c); setEditCatName(c.name); setEditCatDesc(c.description || ''); }} className="text-purple-500 hover:text-purple-800 cursor-pointer ml-1" title="Edit"><i className="fas fa-pen text-xs" /></button>
                <button onClick={() => deleteCategory(c.id)} className="text-purple-500 hover:text-red-500 cursor-pointer" title="Delete">&times;</button>
              </span>
            ))}
            {categories.length === 0 && <p className="text-gray-400 text-sm">No categories yet</p>}
          </div>
        </div>
      )}

      {/* ═══ Create / Edit Tutorial ═══ */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title={editingTutorial ? 'Edit Tutorial' : 'Create Tutorial'} className="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input value={String(form.title)} onChange={(e) => handleTitleChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input value={String(form.slug)} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs" placeholder="auto-generated" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea value={String(form.excerpt)} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Brief summary..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
            <textarea value={String(form.content)} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={String(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={String(form.categoryId || '')} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
            Featured
          </label>
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const selected = ((form.tagIds as number[]) || []).includes(t.id);
                return (
                  <button
                    key={t.id} type="button" onClick={() => toggleTag(t.id)}
                    className={`px-3 py-1 text-xs rounded-full border cursor-pointer ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >{t.name}</button>
                );
              })}
              {tags.length === 0 && <span className="text-xs text-gray-400">No tags available</span>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Dialog>

      {/* ═══ Tutorial Detail ═══ */}
      <Dialog open={detailTutorial !== null} onClose={() => setDetailTutorial(null)} title="Tutorial Details" className="max-w-3xl">
        {detailTutorial && (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 font-medium w-1/4">Title</td><td>{detailTutorial.title}</td></tr>
                <tr><td className="py-2 font-medium">Slug</td><td className="font-mono text-xs">{detailTutorial.slug || 'N/A'}</td></tr>
                <tr><td className="py-2 font-medium">Status</td><td>{detailTutorial.status || (detailTutorial.isPublished ? 'PUBLISHED' : 'DRAFT')}</td></tr>
                <tr><td className="py-2 font-medium">Featured</td><td>{detailTutorial.isFeatured ? 'Yes' : 'No'}</td></tr>
                <tr><td className="py-2 font-medium">Category</td><td>{detailTutorial.category?.name || 'None'}</td></tr>
                <tr><td className="py-2 font-medium">Tags</td><td>{detailTutorial.tags?.map((t) => t.name).join(', ') || 'None'}</td></tr>
                <tr><td className="py-2 font-medium">Created</td><td>{formatDate(detailTutorial.createdAt)}</td></tr>
              </tbody>
            </table>
            {detailTutorial.excerpt && (
              <div>
                <h4 className="font-medium text-sm mb-1">Excerpt</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{detailTutorial.excerpt}</p>
              </div>
            )}
            <div>
              <h4 className="font-medium text-sm mb-1">Content</h4>
              <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded overflow-y-auto max-h-[400px]">
                <pre className="whitespace-pre-wrap text-sm">{detailTutorial.content}</pre>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══ Edit Tag ═══ */}
      <Dialog open={editTag !== null} onClose={() => setEditTag(null)} title="Edit Tag">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input value={editTagName} onChange={(e) => setEditTagName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditTag(null)}>Cancel</Button>
            <Button onClick={saveEditTag}>Save</Button>
          </div>
        </div>
      </Dialog>

      {/* ═══ Edit Category ═══ */}
      <Dialog open={editCat !== null} onClose={() => setEditCat(null)} title="Edit Category">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={editCatDesc} onChange={(e) => setEditCatDesc(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditCat(null)}>Cancel</Button>
            <Button onClick={saveEditCat}>Save</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog open={deleteTarget !== null} title="Delete Tutorial" message="Are you sure you want to delete this tutorial?" confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
