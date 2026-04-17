import type { IconType } from "react-icons";
import type { ReactNode } from "react";

export function PageHeader({
  label,
  icon: Icon,
  rightAction,
}: {
  label: string;
  icon: IconType;
  rightAction?: ReactNode;
}) {
  return (
    <div className="arena-header relative px-4 pt-5 pb-4 text-center shrink-0">
      <div className="flex items-center justify-center gap-3">
        <Icon className="w-5 h-5 text-[#c9a84c] shrink-0" aria-hidden />
        <h1 className="text-xl font-black tracking-[0.15em] uppercase leading-none text-[#c9a84c]">
          {label}
        </h1>
        <Icon
          className="w-5 h-5 text-[#c9a84c] shrink-0 -scale-x-100"
          aria-hidden
        />
      </div>
      {rightAction && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightAction}
        </div>
      )}
    </div>
  );
}
