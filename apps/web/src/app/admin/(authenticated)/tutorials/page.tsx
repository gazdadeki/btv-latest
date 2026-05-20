"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createColumnHelper } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { formatDate, toastError } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/loading";
import { Dialog } from "@/components/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/button";
import { TUTORIAL_STATUSES } from "@/constants";
import type { Tutorial, TutorialCategory } from "@/types";

const columnHelper = createColumnHelper<Tutorial>();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [categories, setCategories] = useState<TutorialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tutorials" | "categories">(
    "tutorials",
  );
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    youtubeUrl: "",
    status: "DRAFT",
    categoryId: "",
  });
  const [detailTutorial, setDetailTutorial] = useState<Tutorial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editCat, setEditCat] = useState<TutorialCategory | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatDesc, setEditCatDesc] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const params: Record<string, string | undefined> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.categoryId = filterCategory;

      const [t, cat] = await Promise.all([
        api.getTutorials(params) as Promise<Tutorial[]>,
        api.getTutorialCategories() as Promise<TutorialCategory[]>,
      ]);
      setTutorials(Array.isArray(t) ? t : []);
      setCategories(Array.isArray(cat) ? cat : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadDetail = async (id: number) => {
    try {
      const t = (await api.getTutorial(id)) as Tutorial;
      setDetailTutorial(t);
    } catch (err) {
      toastError(err);
    }
  };

  const openCreate = () => {
    setEditingTutorial(null);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      body: "",
      youtubeUrl: "",
      status: "DRAFT",
      categoryId: "",
    });
    setEditOpen(true);
  };

  const openEdit = (t: Tutorial) => {
    setEditingTutorial(t);
    setForm({
      title: t.title,
      slug: t.slug || slugify(t.title),
      excerpt: t.excerpt || "",
      body: t.body,
      youtubeUrl: t.youtubeUrl || "",
      status: t.status || "DRAFT",
      categoryId: t.categoryId || t.category?.id || "",
    });
    setEditOpen(true);
  };

  const handleTitleChange = (title: string) => {
    const autoSlug =
      !editingTutorial || form.slug === slugify(String(form.title));
    setForm({
      ...form,
      title,
      ...(autoSlug ? { slug: slugify(title) } : {}),
    });
  };

  const handleSave = async () => {
    if (!form.title) {
      toast.error("Title is required");
      return;
    }
    if (!form.body) {
      toast.error("Content is required");
      return;
    }
    if (!form.categoryId) {
      toast.error("Category is required");
      return;
    }
    const payload: Record<string, unknown> = {
      title: form.title,
      slug: form.slug || slugify(String(form.title)),
      excerpt: form.excerpt || null,
      body: form.body,
      youtubeUrl: String(form.youtubeUrl ?? "").trim() || null,
      status: form.status,
      categoryId: Number(form.categoryId),
    };
    try {
      if (editingTutorial) {
        await api.updateTutorial(editingTutorial.id, payload);
        toast.success("Tutorial updated");
      } else {
        await api.createTutorial(payload);
        toast.success("Tutorial created");
      }
      setEditOpen(false);
      loadAll();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTutorial(deleteTarget);
      toast.success("Tutorial deleted");
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      toastError(err);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.createTutorialCategory({ name: newCategoryName.trim() });
      toast.success("Category created");
      setNewCategoryName("");
      loadAll();
    } catch (err) {
      toastError(err);
    }
  };

  const saveEditCat = async () => {
    if (!editCat || !editCatName.trim()) return;
    try {
      await api.updateTutorialCategory(editCat.id, {
        name: editCatName.trim(),
        description: editCatDesc || null,
      });
      toast.success("Category updated");
      setEditCat(null);
      loadAll();
    } catch (err) {
      toastError(err);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await api.deleteTutorialCategory(id);
      toast.success("Category deleted");
      loadAll();
    } catch (err) {
      toastError(err);
    }
  };

  const tutorialColumns = [
    columnHelper.accessor("id", { header: "ID" }),
    columnHelper.accessor("title", { header: "Title" }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: (i) => {
        const t = i.row.original;
        const st = t.status || "DRAFT";
        return (
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${st === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
          >
            {st}
          </span>
        );
      },
    }),
    columnHelper.accessor((row) => row.category?.name || "-", {
      id: "category",
      header: "Category",
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (i) => formatDate(i.getValue()),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex gap-1">
          <Button
            variant="primary"
            size="xs"
            onClick={() => loadDetail(info.row.original.id)}
            title="View"
          >
            <i className="fas fa-eye" />
          </Button>
          <Button
            size="xs"
            onClick={() => openEdit(info.row.original)}
            title="Edit"
          >
            <i className="fas fa-edit" />
          </Button>
          <Button
            variant="danger"
            size="xs"
            onClick={() => setDeleteTarget(info.row.original.id)}
            title="Delete"
          >
            <i className="fas fa-trash" />
          </Button>
        </div>
      ),
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Tutorials"
        actions={
          <Button variant="primary" size="lg" onClick={openCreate}>
            <i className="fas fa-plus mr-1" /> New Tutorial
          </Button>
        }
      />

      <div className="flex gap-2 mb-4">
        {(["tutorials", "categories"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-lg cursor-pointer ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "tutorials" && (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  {TUTORIAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setFilterStatus("");
                  setFilterCategory("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <DataTable
              columns={tutorialColumns}
              data={tutorials}
              searchPlaceholder="Search tutorials..."
            />
          </div>
        </>
      )}

      {activeTab === "categories" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-2 mb-4">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category name"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            />
            <Button variant="primary" size="lg" onClick={addCategory}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
              >
                {c.name}
                <button
                  onClick={() => {
                    setEditCat(c);
                    setEditCatName(c.name);
                    setEditCatDesc(c.description || "");
                  }}
                  className="text-purple-500 hover:text-purple-800 cursor-pointer ml-1"
                  title="Edit"
                >
                  <i className="fas fa-pen text-xs" />
                </button>
                <button
                  onClick={() => deleteCategory(c.id)}
                  className="text-purple-500 hover:text-red-500 cursor-pointer"
                  title="Delete"
                >
                  &times;
                </button>
              </span>
            ))}
            {categories.length === 0 && (
              <p className="text-gray-400 text-sm">No categories yet</p>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editingTutorial ? "Edit Tutorial" : "Create Tutorial"}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                value={String(form.title)}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input
                value={String(form.slug)}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                placeholder="auto-generated"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea
              value={String(form.excerpt)}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Brief summary..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              YouTube URL (optional)
            </label>
            <input
              type="url"
              value={String(form.youtubeUrl || "")}
              onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Content (Markdown)
            </label>
            <textarea
              value={String(form.body)}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={12}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={String(form.status)}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {TUTORIAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Category *
              </label>
              <select
                value={String(form.categoryId || "")}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={detailTutorial !== null}
        onClose={() => setDetailTutorial(null)}
        title="Tutorial Details"
        className="max-w-3xl"
      >
        {detailTutorial && (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 font-medium w-1/4">Title</td>
                  <td>{detailTutorial.title}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Slug</td>
                  <td className="font-mono text-xs">
                    {detailTutorial.slug || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Status</td>
                  <td>{detailTutorial.status || "DRAFT"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Category</td>
                  <td>{detailTutorial.category?.name || "None"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Created</td>
                  <td>{formatDate(detailTutorial.createdAt)}</td>
                </tr>
              </tbody>
            </table>
            {detailTutorial.excerpt && (
              <div>
                <h4 className="font-medium text-sm mb-1">Excerpt</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {detailTutorial.excerpt}
                </p>
              </div>
            )}
            {detailTutorial.youtubeUrl && (
              <div>
                <h4 className="font-medium text-sm mb-1">YouTube</h4>
                <a
                  href={detailTutorial.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline break-all"
                >
                  {detailTutorial.youtubeUrl}
                </a>
              </div>
            )}
            <div>
              <h4 className="font-medium text-sm mb-1">Content</h4>
              <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded overflow-y-auto max-h-[400px]">
                <pre className="whitespace-pre-wrap text-sm">
                  {detailTutorial.body}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={editCat !== null}
        onClose={() => setEditCat(null)}
        title="Edit Category"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={editCatName}
              onChange={(e) => setEditCatName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={editCatDesc}
              onChange={(e) => setEditCatDesc(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditCat(null)}>
              Cancel
            </Button>
            <Button onClick={saveEditCat}>Save</Button>
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
