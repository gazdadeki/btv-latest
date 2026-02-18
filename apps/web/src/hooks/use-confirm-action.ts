import { useState } from 'react';
import type { ConfirmActionState } from '@/types';

export function useConfirmAction() {
  const [confirmAction, setConfirmAction] =
    useState<ConfirmActionState | null>(null);

  const confirm = (opts: ConfirmActionState) => {
    setConfirmAction(opts);
  };

  const reset = () => setConfirmAction(null);

  return { confirmAction, confirm, reset };
}
