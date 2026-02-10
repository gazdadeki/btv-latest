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

interface Tutorial {
  id: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  tags?: Array<{ id: number; name: string }>;
  category?: { id: number; name: string };
}

interface Tag { id: number; name: string; }
interface Category { id: number; name: string; }

const columnHelper = createColumnHelper<Tutorial>();

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tutorials' | 'tags' | 'categories'>('tutorials');
  const [editOpen, setEditOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPublished, setFormPublished] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [t, tg, cat] = await Promise.all([
        api.getTutorials() as Promise<Tutorial[]>,
        api.getTutorialTags() as Promise<Tag[]>,
        api.getTutorialCategories() as Promise<Category[]>,
      ]);
      setTutorials(Array.isArray(t) ? t : []);
      setTags(Array.isArray(tg) ? tg : []);
      setCategories(Array.isArray(cat) ? cat : []);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreate = () => {
    setEditingTutorial(null);
    setFormTitle('');
    setFormContent('');
    setFormPublished(false);
    setEditOpen(true);
  };

  const openEdit = (t: Tutorial) => {
    setEditingTutorial(t);
    setFormTitle(t.title);
    setFormContent(t.content);
    setFormPublished(t.isPublished);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle) { toast.error('Title is required'); return; }
    const payload = { title: formTitle, content: formContent, isPublished: formPublished };
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

  const deleteTag = async (id: number) => {
    try {
      await api.deleteTutorialTag(id);
      toast.success('Tag deleted');
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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

  const deleteCategory = async (id: number) => {
    try {
      await api.deleteTutorialCategory(id);
      toast.success('Category deleted');
      loadAll();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const tutorialColumns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('title', { header: 'Title' }),
    columnHelper.accessor('isPublished', {
      header: 'Published',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {i.getValue() ? 'Yes' : 'No'}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.category?.name || '-', { id: 'category', header: 'Category' }),
    columnHelper.accessor('createdAt', { header: 'Created', cell: (i) => formatDate(i.getValue()) }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(info.row.original)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"><i className="fas fa-edit" /></button>
          <button onClick={() => setDeleteTarget(info.row.original.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"><i className="fas fa-trash" /></button>
        </div>
      ),
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Tutorials" actions={
        <button onClick={openCreate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <i className="fas fa-plus mr-1" /> New Tutorial
        </button>
      } />

      <div className="flex gap-2 mb-4">
        {(['tutorials', 'tags', 'categories'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-lg ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'tutorials' && (
        <div className="bg-white rounded-lg shadow p-6">
          <DataTable columns={tutorialColumns} data={tutorials} searchPlaceholder="Search tutorials..." />
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-2 mb-4">
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag name" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={addTag} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {t.name}
                <button onClick={() => deleteTag(t.id)} className="text-blue-500 hover:text-red-500 cursor-pointer">&times;</button>
              </span>
            ))}
            {tags.length === 0 && <p className="text-gray-400 text-sm">No tags yet</p>}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-2 mb-4">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={addCategory} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                {c.name}
                <button onClick={() => deleteCategory(c.id)} className="text-purple-500 hover:text-red-500 cursor-pointer">&times;</button>
              </span>
            ))}
            {categories.length === 0 && <p className="text-gray-400 text-sm">No categories yet</p>}
          </div>
        </div>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title={editingTutorial ? 'Edit Tutorial' : 'Create Tutorial'} className="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
            <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={12} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={formPublished} onChange={(e) => setFormPublished(e.target.checked)} /> Published
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Tutorial"
        message="Are you sure you want to delete this tutorial?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
