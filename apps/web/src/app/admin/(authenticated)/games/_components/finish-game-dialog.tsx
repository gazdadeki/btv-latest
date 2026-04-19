"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toastError } from "@/lib/utils";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import type { Game } from "@/types";

interface FinishGameDialogProps {
  game: Game | null;
  onClose: () => void;
  onFinished: () => void;
}

export function FinishGameDialog({
  game,
  onClose,
  onFinished,
}: FinishGameDialogProps) {
  const [winner, setWinner] = useState("");

  useEffect(() => {
    if (game) {
      setWinner("");
    }
  }, [game]);

  const handleFinish = async () => {
    if (!game || !winner) {
      toast.error("Select a winning team");
      return;
    }
    try {
      await api.finishGame(game.id, { winningTeam: winner });
      toast.success("Game finished");
      onClose();
      onFinished();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={game !== null} onClose={onClose} title="Finish Game">
      {game && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3">
              Select the winning team
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWinner("A")}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  winner === "A"
                    ? "border-red-600 bg-red-50 shadow-md"
                    : "border-gray-200 hover:border-red-300 hover:bg-red-50/50"
                }`}
              >
                <i
                  className={`fas fa-shield-alt text-2xl ${winner === "A" ? "text-red-600" : "text-gray-400"}`}
                />
                <span
                  className={`text-sm font-semibold ${winner === "A" ? "text-red-600" : "text-gray-700"}`}
                >
                  {game.teamAName || "Sentinel"}
                </span>
                {winner === "A" && (
                  <span className="text-xs font-medium text-red-600">
                    <i className="fas fa-trophy mr-1" />
                    Winner
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setWinner("B")}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  winner === "B"
                    ? "border-green-600 bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                }`}
              >
                <i
                  className={`fas fa-shield-alt text-2xl ${winner === "B" ? "text-green-600" : "text-gray-400"}`}
                />
                <span
                  className={`text-sm font-semibold ${winner === "B" ? "text-green-600" : "text-gray-700"}`}
                >
                  {game.teamBName || "Scourge"}
                </span>
                {winner === "B" && (
                  <span className="text-xs font-medium text-green-600">
                    <i className="fas fa-trophy mr-1" />
                    Winner
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleFinish}>
              Finish Game
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
