"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createColumnHelper } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { formatDateOnly, toastError } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/loading";
import { Dialog } from "@/components/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/button";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { USER_ROLES } from "@/constants";
import type { AdminUser } from "@/types";
import { UserDetailDialog } from "./_components/user-detail-dialog";
import { UserFormDialog } from "./_components/user-form-dialog";
import { StripeDialog } from "./_components/stripe-dialog";
import { BanDialog } from "./_components/ban-dialog";

const columnHelper = createColumnHelper<AdminUser>();

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterVerified, setFilterVerified] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [banTarget, setBanTarget] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [stripeUser, setStripeUser] = useState<AdminUser | null>(null);
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const { confirmAction, confirm, reset } = useConfirmAction();

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | undefined> = {};
      if (filterRole) params.role = filterRole;
      if (filterVerified) params.isVerified = filterVerified;
      const res = await api.getUsers(params);
      const list = Array.isArray(res)
        ? res
        : (res as { data?: AdminUser[] }).data || [];
      setUsers(list as AdminUser[]);
    } catch (err) {
      toastError(err, "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterVerified]);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = async (id: number) => {
    try {
      const u = (await api.getUser(id)) as AdminUser;
      setDetailUser(u);
    } catch (err) {
      toastError(err);
    }
  };

  const handleUnban = async (id: number) => {
    try {
      await api.unbanUser(id);
      toast.success("User unbanned");
      load();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget.id, deleteReason || undefined);
      toast.success("User voided");
      setDeleteTarget(null);
      setDeleteReason("");
      load();
    } catch (err) {
      toastError(err);
    }
  };

  const handleRequestVerification = async (u: AdminUser) => {
    try {
      await api.adminRequestVerification(u.id);
      const codeRes = (await api.getLatestVerificationCode(u.id)) as {
        code?: string;
      };
      setVerifyCode(codeRes.code || "Code sent");
      toast.success("Verification code requested");
    } catch (err) {
      toastError(err);
    }
  };

  const handleVerifyInstantly = (u: AdminUser) => {
    confirm({
      title: "Verify User",
      message: `Verify ${u.email} instantly?`,
      onConfirm: async () => {
        try {
          await api.adminVerifyUser(u.id);
          toast.success("User verified");
          reset();
          load();
        } catch (err) {
          toastError(err);
          reset();
        }
      },
    });
  };

  const columns = [
    columnHelper.accessor("id", { header: "ID" }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (i) => (
        <TruncatedText text={i.getValue()} className="max-w-[260px] block" />
      ),
    }),
    columnHelper.accessor("username", {
      header: "Username",
      cell: (i) => (
        <TruncatedText
          text={i.getValue() || "-"}
          className="max-w-[180px] block"
        />
      ),
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: (i) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
        >
          {i.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("subscriptionTier", {
      header: "Tier",
      cell: (i) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() === "GOLD" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}
        >
          {i.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("isVerified", {
      header: "Verified",
      cell: (i) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {i.getValue() ? "Yes" : "No"}
        </span>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (i) => formatDateOnly(i.getValue()),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const u = info.row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            <Button
              variant="primary"
              size="xs"
              onClick={() => loadDetail(u.id)}
              title="View"
            >
              <i className="fas fa-eye" />
            </Button>
            <Button
              variant="warning"
              size="xs"
              onClick={() => setEditUser(u)}
              title="Edit"
            >
              <i className="fas fa-edit" />
            </Button>
            <Button
              variant="purple"
              size="xs"
              onClick={() => setStripeUser(u)}
              title="Stripe"
            >
              <i className="fab fa-stripe-s" />
            </Button>
            {!u.isVerified && (
              <>
                <Button
                  variant="cyan"
                  size="xs"
                  onClick={() => handleRequestVerification(u)}
                  title="Verification Code"
                >
                  <i className="fas fa-envelope" />
                </Button>
                <Button
                  variant="success"
                  size="xs"
                  onClick={() => handleVerifyInstantly(u)}
                  title="Verify"
                >
                  <i className="fas fa-check-circle" />
                </Button>
              </>
            )}
            {u.isBanned ? (
              <Button
                variant="warning"
                size="xs"
                onClick={() => handleUnban(u.id)}
                title="Unban"
              >
                <i className="fas fa-unlock" />
              </Button>
            ) : (
              <Button
                variant="danger"
                size="xs"
                onClick={() => setBanTarget(u.id)}
                title="Ban"
              >
                <i className="fas fa-ban" />
              </Button>
            )}
            <Button
              size="xs"
              className="bg-gray-600 text-white hover:bg-gray-700"
              onClick={() => {
                setDeleteTarget(u);
                setDeleteReason("");
              }}
              title="Delete"
            >
              <i className="fas fa-trash" />
            </Button>
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Users"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Roles</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Verified</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowCreate(true)}
            >
              New User
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search users..."
        />
      </div>

      <UserFormDialog
        open={showCreate}
        user={null}
        onClose={() => setShowCreate(false)}
        onSaved={load}
      />

      <UserFormDialog
        open={editUser !== null}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={load}
      />

      {detailUser && (
        <UserDetailDialog
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onMutated={() => loadDetail(detailUser.id)}
        />
      )}

      <StripeDialog
        user={stripeUser}
        onClose={() => setStripeUser(null)}
        onChanged={load}
      />

      <BanDialog
        userId={banTarget}
        onClose={() => setBanTarget(null)}
        onBanned={load}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to void{" "}
              <strong>{deleteTarget.email}</strong>? This is a soft delete.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Reason for deletion..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={verifyCode !== null}
        onClose={() => setVerifyCode(null)}
        title="Verification Code"
      >
        <div className="space-y-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-mono font-bold tracking-widest">
              {verifyCode}
            </p>
          </div>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(verifyCode || "");
              toast.success("Copied!");
            }}
          >
            Copy to Clipboard
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        variant={confirmAction?.variant}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={reset}
      />
    </div>
  );
}
