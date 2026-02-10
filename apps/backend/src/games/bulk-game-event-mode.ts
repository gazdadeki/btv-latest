export type BulkGameEventMode = 'dual' | 'batch-only';

export const getBulkGameEventMode = (): BulkGameEventMode => {
  const rawMode = (process.env.BULK_GAME_WS_MODE || '').toLowerCase();
  return rawMode === 'batch-only' ? 'batch-only' : 'dual';
};

export const shouldEmitPerGameEvents = (): boolean =>
  getBulkGameEventMode() === 'dual';
