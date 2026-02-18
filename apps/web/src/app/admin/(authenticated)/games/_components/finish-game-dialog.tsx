'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toastError } from '@/lib/utils';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';
import type { Game } from '@/types';

interface FinishGameDialogProps {
  game: Game | null;
  onClose: () => void;
  onFinished: (nextGame?: { id: number }) => void;
}

export function FinishGameDialog({ game, onClose, onFinished }: FinishGameDialogProps) {
  const [winner, setWinner] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (game) {
      setWinner('');
      setUrl(game.url || '');
    }
  }, [game]);

  const handleFinish = async () => {
    if (!game || !winner) { toast.error('Select a winning team'); return; }
    try {
      if (url) await api.updateGame(game.id, { url });
      const res = await api.finishGame(game.id, { winningTeam: winner }) as {
        nextGame?: { id: number }; isLastGame?: boolean;
      };
      toast.success('Game finished');
      onClose();
      onFinished(res.nextGame && !res.isLastGame ? res.nextGame : undefined);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={game !== null} onClose={onClose} title="Finish Game">
      {game && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Winning Team *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="winner" value="A" checked={winner === 'A'} onChange={() => setWinner('A')} />
                <span className="text-sm">{game.teamAName || 'Scourge'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="winner" value="B" checked={winner === 'B'} onChange={() => setWinner('B')} />
                <span className="text-sm">{game.teamBName || 'Sentinel'}</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Game URL</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">URL to include in finish notifications</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="success" onClick={handleFinish}>Finish Game</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
