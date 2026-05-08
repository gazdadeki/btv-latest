"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, Check, Lock, Crown, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  AVATAR_PLACEHOLDER_URL,
  type Avatar,
  type AvatarTier,
  isFree,
} from "@/types";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  open: boolean;
  onClose: () => void;
}

export function AvatarPicker({ open, onClose }: AvatarPickerProps) {
  const { user, refreshUser } = useAuth();
  const [pending, setPending] = useState<Avatar | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: avatars = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["avatars"],
    queryFn: api.listAvatars,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const userIsFree = user ? isFree(user) : true;
  const freeAvatars = avatars.filter((a) => a.tier === "FREE");
  const goldAvatars = avatars.filter((a) => a.tier === "GOLD");
  const currentAvatarId = user?.avatarId ?? null;
  const currentAvatar = avatars.find((a) => a.id === currentAvatarId) ?? null;

  async function handleConfirm() {
    if (!pending) return;
    setIsSaving(true);
    try {
      await api.selectAvatar(pending.id);
      await refreshUser();
      toast.success("Avatar updated");
      setPending(null);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update avatar",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    if (isSaving) return;
    setPending(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="panel-dark relative w-full max-w-lg mx-auto rounded-b-none rounded-t-3xl px-5 pb-8 max-h-[88vh] flex flex-col border-t border-x border-[#3a3530]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#3a3530]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-base font-black text-[#f0f0f0]">
              Choose Your Avatar
            </h2>
            <p className="text-[11px] text-[#8a8a8a] mt-0.5">
              Tap to preview, confirm to apply
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="shrink-0 w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-[#8a8a8a] hover:text-[#e0d8c8] hover:bg-[#1a1816] disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c9a84c]" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-sm text-red-400">
            Failed to load avatars
          </div>
        )}

        {!isLoading && !error && (
          <div className="flex-1 overflow-y-auto -mx-2 px-2 py-1 space-y-5">
            <AvatarSection
              title="Classic"
              subtitle="Available to all"
              tier="FREE"
              avatars={freeAvatars}
              currentId={currentAvatarId}
              pendingId={pending?.id ?? null}
              onSelect={setPending}
              disabled={false}
            />
            <AvatarSection
              title="Gold"
              subtitle={
                userIsFree
                  ? "Unlocked with a Gold subscription"
                  : "Premium avatars"
              }
              tier="GOLD"
              avatars={goldAvatars}
              currentId={currentAvatarId}
              pendingId={pending?.id ?? null}
              onSelect={setPending}
              disabled={userIsFree}
            />
          </div>
        )}

        {pending && (
          <ConfirmBar
            current={currentAvatar}
            pending={pending}
            isSaving={isSaving}
            onCancel={() => setPending(null)}
            onConfirm={handleConfirm}
          />
        )}
      </div>
    </div>
  );
}

interface AvatarSectionProps {
  title: string;
  subtitle: string;
  tier: AvatarTier;
  avatars: Avatar[];
  currentId: number | null;
  pendingId: number | null;
  onSelect: (a: Avatar) => void;
  disabled: boolean;
}

function AvatarSection({
  title,
  subtitle,
  tier,
  avatars,
  currentId,
  pendingId,
  onSelect,
  disabled,
}: AvatarSectionProps) {
  if (avatars.length === 0) return null;

  const isGold = tier === "GOLD";
  const accent = isGold ? "#c9a84c" : "#2a9d8f";
  const Icon = isGold ? Crown : null;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                backgroundColor: `${accent}26`,
                color: accent,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider leading-tight"
              style={{ color: accent }}
            >
              {title}
            </p>
            <p className="text-[10px] text-[#6a6a6a] leading-tight">
              {subtitle}
            </p>
          </div>
        </div>
        {disabled ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#1a1816] border border-[#2a2620]">
            <Lock className="w-3 h-3 text-[#8a8a8a]" />
            <span className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wider">
              Locked
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-[#6a6a6a]">{avatars.length}</span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-3">
        {avatars.map((a) => {
          const isCurrent = a.id === currentId;
          const isPending = a.id === pendingId;
          return (
            <AvatarTile
              key={a.id}
              avatar={a}
              accent={accent}
              isCurrent={isCurrent}
              isPending={isPending}
              disabled={disabled}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

interface AvatarTileProps {
  avatar: Avatar;
  accent: string;
  isCurrent: boolean;
  isPending: boolean;
  disabled: boolean;
  onSelect: (a: Avatar) => void;
}

function AvatarTile({
  avatar,
  accent,
  isCurrent,
  isPending,
  disabled,
  onSelect,
}: AvatarTileProps) {
  const interactive = !disabled && !isCurrent;

  const ring = isPending
    ? `0 0 0 3px ${accent}, 0 0 10px ${accent}66`
    : isCurrent
      ? `0 0 0 3px ${accent}`
      : `0 0 0 2px #2a2620`;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onSelect(avatar)}
      className={cn(
        "relative aspect-square rounded-full overflow-hidden transition-all duration-150 bg-[#1a1816]",
        "disabled:cursor-not-allowed",
        disabled && !isCurrent && "opacity-40",
        interactive && "hover:scale-105 active:scale-95",
      )}
      style={{ boxShadow: ring }}
    >
      <img
        src={avatar.url}
        alt={avatar.displayName ?? avatar.key}
        className="w-full h-full object-cover object-top scale-110"
      />

      {/* Current state badge */}
      {isCurrent && (
        <>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-[#0f0e0c] flex items-center justify-center"
            style={{ backgroundColor: accent }}
          >
            <Check className="w-3 h-3 text-[#0f0e0c]" strokeWidth={3} />
          </div>
        </>
      )}
    </button>
  );
}

interface ConfirmBarProps {
  current: Avatar | null;
  pending: Avatar;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmBar({
  current,
  pending,
  isSaving,
  onCancel,
  onConfirm,
}: ConfirmBarProps) {
  const pendingAccent = pending.tier === "GOLD" ? "#c9a84c" : "#2a9d8f";

  return (
    <div className="shrink-0 mt-4 pt-4 border-t border-[#2a2620]">
      <div className="flex items-center gap-3 mb-3 px-2 py-1">
        {/* Current */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#3a3530] bg-[#1a1816]">
            <img
              src={current?.url ?? AVATAR_PLACEHOLDER_URL}
              alt=""
              className="w-full h-full object-cover object-top scale-110 opacity-60"
            />
          </div>
          <span className="text-[9px] text-[#6a6a6a] uppercase tracking-wider">
            Current
          </span>
        </div>

        <ArrowRight className="w-4 h-4 text-[#6a6a6a] shrink-0" />

        {/* Pending */}
        <div className="flex flex-col items-center gap-1 px-1">
          <div
            className="w-14 h-14 rounded-full overflow-hidden bg-[#1a1816]"
            style={{
              boxShadow: `0 0 0 3px ${pendingAccent}, 0 0 16px ${pendingAccent}80`,
            }}
          >
            <img
              src={pending.url}
              alt=""
              className="w-full h-full object-cover object-top scale-110"
            />
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color: pendingAccent }}
          >
            New
          </span>
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0 ml-1">
          <p className="text-[10px] text-[#8a8a8a] uppercase tracking-wider">
            Apply change?
          </p>
          <p className="text-sm font-bold text-[#f0f0f0] truncate">
            {pending.displayName ?? pending.key}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="btn-dark-secondary flex-1 px-4 py-2.5 text-sm font-medium rounded-md disabled:opacity-50"
        >
          Cancel
        </button>
        <Button
          size="md"
          variant={pending.tier === "GOLD" ? "gold" : "primary"}
          onClick={onConfirm}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirm
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
