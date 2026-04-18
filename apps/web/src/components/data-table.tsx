"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ServerTableControls {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Required only when the search input is visible (hideSearch=false). */
  search?: string;
  onSearchChange?: (value: string) => void;
  isLoading?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
  hidePagination?: boolean;
  hideResultCount?: boolean;
  hideSearch?: boolean;
  /**
   * When supplied, switches the table to server-driven mode:
   * pagination and global filter are controlled by the parent via callbacks.
   */
  server?: ServerTableControls;
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Search...",
  pageSize = 25,
  hidePagination = false,
  hideResultCount = false,
  hideSearch = false,
  server,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const isServer = !!server;
  const effectivePageSize = isServer ? server.pageSize : pageSize;

  const serverSearch = server?.search ?? "";
  const tableState: Record<string, unknown> = {
    sorting,
    globalFilter: isServer ? serverSearch : globalFilter,
  };
  if (isServer) {
    tableState.pagination = {
      pageIndex: server.page - 1,
      pageSize: server.pageSize,
    };
  }

  const table = useReactTable({
    data,
    columns,
    state: tableState,
    manualPagination: isServer,
    manualFiltering: isServer,
    ...(isServer && {
      pageCount: Math.max(1, Math.ceil(server.total / server.pageSize)),
      rowCount: server.total,
    }),
    onSortingChange: setSorting,
    onGlobalFilterChange: isServer
      ? (updater) => {
          if (!server.onSearchChange) return;
          const next =
            typeof updater === "function" ? updater(serverSearch) : updater;
          server.onSearchChange(String(next ?? ""));
        }
      : setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(isServer
      ? {}
      : {
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageSize } },
        }),
  });

  const totalPages = isServer
    ? Math.max(1, Math.ceil(server.total / server.pageSize))
    : table.getPageCount();
  const currentPage = isServer
    ? server.page
    : table.getState().pagination.pageIndex + 1;
  const resultCount = isServer
    ? server.total
    : table.getFilteredRowModel().rows.length;

  const canPrev = isServer ? server.page > 1 : table.getCanPreviousPage();
  const canNext = isServer ? server.page < totalPages : table.getCanNextPage();

  const goPrev = () => {
    if (isServer) {
      if (server.page > 1) server.onPageChange(server.page - 1);
    } else {
      table.previousPage();
    }
  };

  const goNext = () => {
    if (isServer) {
      if (server.page < totalPages) server.onPageChange(server.page + 1);
    } else {
      table.nextPage();
    }
  };

  return (
    <div>
      {(!hideSearch || !hideResultCount) && (
        <div className="flex items-center justify-end mb-4">
          {!hideSearch && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={isServer ? serverSearch : globalFilter}
              onChange={(e) =>
                isServer
                  ? server.onSearchChange?.(e.target.value)
                  : setGlobalFilter(e.target.value)
              }
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          {!hideResultCount && (
            <span className="text-sm text-gray-500 ml-4">
              {resultCount} results
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-[0.9rem] leading-relaxed">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-5 py-3.5 text-left font-semibold text-gray-600",
                      header.column.getCanSort() &&
                        "cursor-pointer select-none hover:text-gray-900",
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {{
                        asc: <i className="fas fa-sort-up text-xs" />,
                        desc: <i className="fas fa-sort-down text-xs" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-gray-400"
                >
                  {isServer && server.isLoading
                    ? "Loading..."
                    : "No data available"}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
            {isServer ? ` · ${server.total} total` : null}
          </div>
          <div className="flex items-center gap-2">
            {isServer && server.onPageSizeChange && (
              <select
                value={effectivePageSize}
                onChange={(e) =>
                  server.onPageSizeChange?.(Number(e.target.value))
                }
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={goPrev}
              disabled={!canPrev || (isServer && !!server.isLoading)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={goNext}
              disabled={!canNext || (isServer && !!server.isLoading)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
