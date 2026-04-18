import type { IconType } from "react-icons";
import type { ReactNode } from "react";

export function PageHeader({
  label,
  rightAction,
}: {
  label: string;
  /** Kept for API compatibility with existing callers. */
  icon?: IconType;
  rightAction?: ReactNode;
}) {
  return (
    <div
      className="@container relative grid grid-cols-[3rem_1fr_3rem] items-center shrink-0 pt-[5%] pb-[1%]"
      style={{
        backgroundImage: "url('/frames/header-dragons.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        aspectRatio: "1284 / 330",
      }}
    >
      <div aria-hidden />
      <h1
        className="font-title text-center uppercase text-[#d4b24e] leading-none truncate min-w-0 text-[clamp(1rem,5cqi,1.75rem)]"
        title={label}
      >
        {label}
      </h1>
      <div className="flex justify-end pr-2">{rightAction}</div>
    </div>
  );
}
