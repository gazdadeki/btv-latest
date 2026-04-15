"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDate, toastError } from "@/lib/utils";
import { Dialog } from "@/components/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/button";
import { Tabs } from "@/components/tabs";
import { StatusBadge } from "@/components/status-badge";
import { UserSearchDialog } from "@/components/user-search-dialog";
import { UserSearchInput } from "@/components/user-search-input";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import {
  GAME_STATUS_COLORS,
  RESERVATION_STATUS_COLORS,
  teamDisplay,
} from "@/constants";
import type { Game } from "@/types";

interface GameDetailDialogProps {
  game: Game | null;
  onClose: () => void;
  onMutated: (gameId: number) => void;
}

export function GameDetailDialog({
  game,
  onClose,
  onMutated,
}: GameDetailDialogProps) {
  const [detailTab, setDetailTab] = useState("info");
  const [editUrl, setEditUrl] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editGold, setEditGold] = useState(false);
  const [editMultiRes, setEditMultiRes] = useState(false);
  const [editReady, setEditReady] = useState(false);
  const { confirmAction, confirm, reset } = useConfirmAction();

  const safeConfirm = (opts: {
    title: string;
    message: string;
    variant?: "danger";
    onConfirm: () => Promise<void>;
  }) => {
    confirm({
      ...opts,
      onConfirm: async () => {
        try {
          await opts.onConfirm();
        } catch (err) {
          toastError(err);
        } finally {
          reset();
        }
      },
    });
  };
  const [slotAssign, setSlotAssign] = useState<{
    gameId: number;
    slotId: number;
  } | null>(null);
  const [reReserve, setReReserve] = useState<{
    gameId: number;
    slotId: number;
    userId: number;
    email: string;
    status: string;
  } | null>(null);

  const initEdit = (g: Game) => {
    setEditUrl(g.url || "");
    if (g.scheduledStartTime) {
      // Convert UTC ISO string to local datetime-local value so the user edits in their timezone.
      // datetime-local has no timezone concept; subtracting the offset gives local wall-clock time.
      const d = new Date(g.scheduledStartTime);
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditStartTime(localIso);
    } else {
      setEditStartTime("");
    }
    setEditGold(g.isExclusiveToGold);
    setEditMultiRes(!!g.allowMultipleReservations);
    setEditReady(true);
  };

  useEffect(() => {
    if (game && !editReady) initEdit(game);
  }, [game?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setEditReady(false);
    setDetailTab("info");
    onClose();
  };

  const mutated = () => {
    if (game) onMutated(game.id);
  };

  const saveGameDetails = async () => {
    if (!game) return;
    try {
      const data: Record<string, unknown> = {
        url: editUrl,
        allowMultipleReservations: editMultiRes,
      };
      if (game.status === "CREATED") {
        data.scheduledStartTime = new Date(editStartTime).toISOString();
        data.isExclusiveToGold = editGold;
      }
      await api.updateGame(game.id, data);
      toast.success("Game updated");
      handleClose();
      mutated();
    } catch (err) {
      toastError(err);
    }
  };

  const handleShuffle = () => {
    if (!game) return;
    safeConfirm({
      title: "Shuffle Players",
      message:
        "Shuffle players? This will randomly reassign non-admin players, excluding admin slots and gold-only slots.",
      onConfirm: async () => {
        await api.shufflePlayers(game.id);
        toast.success("Players shuffled");
        mutated();
      },
    });
  };

  const handleKick = (slotId: number) => {
    if (!game) return;
    safeConfirm({
      title: "Remove User",
      message: "Remove user from this slot?",
      variant: "danger",
      onConfirm: async () => {
        await api.kickUserFromSlot(game.id, slotId);
        toast.success("User removed");
        mutated();
      },
    });
  };

  const handleAssignUser = (user: { id: number; email: string }) => {
    if (!slotAssign) return;
    safeConfirm({
      title: "Assign User",
      message: `Assign ${user.email} (ID: ${user.id}) to this slot?`,
      onConfirm: async () => {
        await api.assignUserToSlot(
          slotAssign.gameId,
          slotAssign.slotId,
          user.id,
        );
        toast.success("User assigned");
        setSlotAssign(null);
        mutated();
      },
    });
  };

  const handlePreAssign = (
    slotId: number,
    userId: number | null,
    username: string | null,
  ) => {
    if (!game) return;
    if (userId === null) return;
    safeConfirm({
      title: "Pre-assign User",
      message: `Pre-assign ${username || `User #${userId}`} to this slot? This will reserve the slot for them.`,
      onConfirm: async () => {
        await api.preAssignSlot(game.id, slotId, userId);
        toast.success("User pre-assigned");
        mutated();
      },
    });
  };

  const handleConfirmReservation = (slotId: number) => {
    if (!game) return;
    safeConfirm({
      title: "Confirm Reservation",
      message:
        "Confirm this reservation? This bypasses the confirmation window and costs.",
      onConfirm: async () => {
        await api.confirmSlotReservation(game.id, slotId);
        toast.success("Reservation confirmed");
        mutated();
      },
    });
  };

  const handleConfirmAll = () => {
    if (!game) return;
    safeConfirm({
      title: "Confirm All",
      message: "Confirm all reserved slots?",
      onConfirm: async () => {
        const res = await api.confirmAllSlots(game.id);
        toast.success(`${res.confirmedCount} reservation(s) confirmed`);
        mutated();
      },
    });
  };

  const handleCancelAllConfirmations = () => {
    if (!game) return;
    safeConfirm({
      title: "Cancel All Confirmations",
      message: "Cancel all confirmations?",
      variant: "danger",
      onConfirm: async () => {
        const res = await api.cancelAllConfirmations(game.id);
        toast.success(`${res.cancelledCount} confirmation(s) cancelled`);
        mutated();
      },
    });
  };

  const handleReReserveSame = async () => {
    if (!reReserve) return;
    try {
      await api.assignUserToSlot(
        reReserve.gameId,
        reReserve.slotId,
        reReserve.userId,
      );
      toast.success("Slot re-reserved");
      setReReserve(null);
      mutated();
    } catch (err) {
      toastError(err);
    }
  };

  const handleReReserveDifferent = () => {
    if (!reReserve) return;
    setSlotAssign({ gameId: reReserve.gameId, slotId: reReserve.slotId });
    setReReserve(null);
  };

  if (!game) return null;

  const isModifiable =
    game.status !== "FINISHED" && game.status !== "CANCELLED";
  const reservedCount =
    game.reservations?.filter((r) => r.status === "RESERVED").length || 0;
  const confirmedCount =
    game.reservations?.filter((r) => r.status === "CONFIRMED").length || 0;

  return (
    <>
      <Dialog
        open
        onClose={handleClose}
        title="Game Details"
        className="max-w-4xl"
      >
        <Tabs
          tabs={[
            { id: "info", label: "Game Info" },
            { id: "slots", label: "Slots Management" },
            { id: "reservations", label: "Reservations" },
          ]}
          activeTab={detailTab}
          onTabChange={setDetailTab}
        />

        {detailTab === "info" && (
          <div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 font-medium w-1/3">ID</td>
                  <td>{game.id}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Schedule</td>
                  <td>{game.schedule?.name || `#${game.scheduleId}`}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Status</td>
                  <td>
                    <StatusBadge
                      status={game.status}
                      colorMap={GAME_STATUS_COLORS}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Scheduled Start</td>
                  <td>
                    {game.status === "CREATED" ? (
                      <input
                        type="datetime-local"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      formatDate(game.scheduledStartTime)
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Exclusive to Gold</td>
                  <td>
                    {game.status === "CREATED" ? (
                      <input
                        type="checkbox"
                        checked={editGold}
                        onChange={(e) => setEditGold(e.target.checked)}
                        className="rounded"
                      />
                    ) : game.isExclusiveToGold ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Unrestricted Slots</td>
                  <td>
                    {isModifiable ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editMultiRes}
                          onChange={(e) => setEditMultiRes(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-500">
                          Allow players with existing reservations
                        </span>
                      </label>
                    ) : game.allowMultipleReservations ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">URL</td>
                  <td>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://youtube.com"
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Actual Start</td>
                  <td>
                    {game.actualStartTime
                      ? formatDate(game.actualStartTime)
                      : "N/A"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Actual End</td>
                  <td>
                    {game.actualEndTime
                      ? formatDate(game.actualEndTime)
                      : "N/A"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Duration</td>
                  <td>
                    {game.durationMinutes
                      ? `${game.durationMinutes} min`
                      : "N/A"}
                  </td>
                </tr>
                {game.winningTeam && (
                  <tr>
                    <td className="py-2 font-medium">Winner</td>
                    <td>
                      {game.winningTeam === "A"
                        ? game.teamAName
                        : game.teamBName}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 font-medium">Created</td>
                  <td>{game.createdAt ? formatDate(game.createdAt) : "N/A"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Updated</td>
                  <td>{game.updatedAt ? formatDate(game.updatedAt) : "N/A"}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end gap-2 mt-4">
              {game.status === "IN_PROGRESS" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    safeConfirm({
                      title: "Remake Game",
                      message:
                        "Reset this game back to OPEN? All reservations will be kept.",
                      onConfirm: async () => {
                        await api.remakeGame(game.id);
                        toast.success("Game remade — back to OPEN");
                        handleClose();
                        mutated();
                      },
                    });
                  }}
                >
                  Remake
                </Button>
              )}
              <Button onClick={saveGameDetails}>Save Changes</Button>
            </div>
          </div>
        )}

        {detailTab === "slots" && (
          <div>
            {isModifiable && (
              <div className="mb-3">
                <Button variant="purple" size="sm" onClick={handleShuffle}>
                  Shuffle Players
                </Button>
                <span className="text-xs text-gray-400 ml-2">
                  Randomly reassign non-admin players
                </span>
              </div>
            )}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Slot #</th>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-left">Reserved</th>
                    <th className="px-3 py-2 text-left">Reserved By</th>
                    <th className="px-3 py-2 text-left">Pre-assigned</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(game.slots || [])
                    .sort((a, b) => a.slotNumber - b.slotNumber)
                    .map((slot) => (
                      <tr key={slot.id}>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1">
                            {slot.slotNumber}
                            {slot.isGoldOnly && !editMultiRes && (
                              <i
                                className="fas fa-star text-amber-500 text-xs"
                                title="Gold Only"
                              />
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              slot.team === "A"
                                ? "text-red-600 font-medium"
                                : "text-green-600 font-medium"
                            }
                          >
                            {teamDisplay(slot.team)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${slot.isReserved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                          >
                            {slot.isReserved ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1">
                            {slot.reservedByUser?.username ||
                              slot.reservedByUser?.email ||
                              (slot.reservedByUserId
                                ? `User #${slot.reservedByUserId}`
                                : "None")}
                            {slot.reservedByUser?.subscriptionTier ===
                              "GOLD" && (
                              <i
                                className="fas fa-coins text-amber-500 text-xs"
                                title="Gold Member"
                              />
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {!slot.isReserved && isModifiable ? (
                            <UserSearchInput
                              value={slot.preAssignedUserId}
                              displayName={
                                slot.preAssignedUser?.username ||
                                (slot.preAssignedUserId
                                  ? `User #${slot.preAssignedUserId}`
                                  : undefined)
                              }
                              onChange={(userId, username) =>
                                handlePreAssign(slot.id, userId, username)
                              }
                            />
                          ) : (
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${slot.isPreAssigned ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                            >
                              {slot.isPreAssigned ? "YES" : "NO"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {!slot.isReserved && game.status === "CREATED" && (
                              <Button
                                variant="success"
                                size="xs"
                                onClick={() =>
                                  setSlotAssign({
                                    gameId: game.id,
                                    slotId: slot.id,
                                  })
                                }
                                title="Assign User"
                              >
                                <i className="fas fa-user-plus" />
                              </Button>
                            )}
                            {slot.isReserved && isModifiable && (
                              <Button
                                variant="danger"
                                size="xs"
                                onClick={() => handleKick(slot.id)}
                                title="Kick User"
                              >
                                <i className="fas fa-user-times" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {(!game.slots || game.slots.length === 0) && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-gray-400"
                      >
                        No slots
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {detailTab === "reservations" && (
          <div>
            {isModifiable && (
              <div className="mb-3 flex gap-2">
                {reservedCount > 0 && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleConfirmAll}
                  >
                    Confirm All ({reservedCount})
                  </Button>
                )}
                {confirmedCount > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleCancelAllConfirmations}
                  >
                    Cancel All Confirmations ({confirmedCount})
                  </Button>
                )}
              </div>
            )}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Slot</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Reserved At</th>
                    <th className="px-3 py-2 text-left">Confirmed At</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(game.reservations || []).map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2">
                        {r.user?.username ||
                          r.user?.email ||
                          `User #${r.userId}`}
                      </td>
                      <td className="px-3 py-2">
                        {r.slot?.slotNumber || r.slotId}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          status={r.status}
                          colorMap={RESERVATION_STATUS_COLORS}
                        />
                      </td>
                      <td className="px-3 py-2">{formatDate(r.reservedAt)}</td>
                      <td className="px-3 py-2">
                        {r.confirmedAt ? formatDate(r.confirmedAt) : "N/A"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {r.status === "RESERVED" && isModifiable && (
                            <Button
                              variant="success"
                              size="xs"
                              onClick={() => handleConfirmReservation(r.slotId)}
                              title="Confirm"
                            >
                              <i className="fas fa-check" />
                            </Button>
                          )}
                          {(r.status === "EXPIRED" ||
                            r.status === "CANCELLED") &&
                            isModifiable && (
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={() =>
                                  setReReserve({
                                    gameId: game.id,
                                    slotId: r.slotId,
                                    userId: r.userId,
                                    email:
                                      r.user?.username ||
                                      r.user?.email ||
                                      `User #${r.userId}`,
                                    status: r.status,
                                  })
                                }
                                title="Re-reserve"
                              >
                                <i className="fas fa-redo" />
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!game.reservations || game.reservations.length === 0) && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-4 text-center text-gray-400"
                      >
                        No reservations
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={reReserve !== null}
        onClose={() => setReReserve(null)}
        title="Re-reserve Slot"
      >
        {reReserve && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <StatusBadge
                status={reReserve.status}
                colorMap={RESERVATION_STATUS_COLORS}
              />
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Current user:</span>{" "}
              {reReserve.email}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleReReserveSame}>
                Re-reserve for Same User
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleReReserveDifferent}
              >
                Re-reserve for Different User
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <UserSearchDialog
        open={slotAssign !== null}
        onClose={() => setSlotAssign(null)}
        onSelect={handleAssignUser}
        title="Assign User to Slot"
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        variant={confirmAction?.variant}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={reset}
      />
    </>
  );
}
