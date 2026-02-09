export {};

type JQueryEventHandler = (...args: unknown[]) => void;

interface JQueryDataTableInstance {
  destroy: () => void;
  on: (event: string, handler: JQueryEventHandler) => void;
}

interface JQueryCollection {
  DataTable: (options?: Record<string, unknown>) => JQueryDataTableInstance;
  on: (event: string, handler: JQueryEventHandler) => JQueryCollection;
  off: (event: string, handler?: JQueryEventHandler) => JQueryCollection;
  modal: (action: string) => JQueryCollection;
  tab: (action: string) => JQueryCollection;
}

interface JQueryLike {
  (selector: string | Element): JQueryCollection;
}

declare global {
  interface Window {
    api?: unknown;
    AuthUtils?: unknown;
    AdminCommon?: unknown;
    WebSocketManager?: unknown;
    TimezoneUtils?: unknown;
    $?: JQueryLike;
    jQuery?: JQueryLike;
    Chart?: unknown;
    FullCalendar?: unknown;
    SimpleMDE?: unknown;
    marked?: { parse: (input: string) => string };
  }
}

declare module 'bootstrap/dist/js/bootstrap.bundle';
declare module 'admin-lte/dist/js/adminlte';
declare module 'datatables.net-bs4' {
  const factory: (win: Window, $: unknown) => void;
  export default factory;
}
