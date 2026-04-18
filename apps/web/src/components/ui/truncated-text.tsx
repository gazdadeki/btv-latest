"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TruncatedTextProps = {
  text: string | number | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
  lines?: number;
};

export function TruncatedText({
  text,
  className,
  as: Tag = "span",
  lines = 1,
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const value = text == null ? "" : String(text);
  const multiLine = lines > 1;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (multiLine) {
        setIsOverflowing(el.scrollHeight - el.clientHeight > 1);
      } else {
        setIsOverflowing(el.scrollWidth - el.clientWidth > 1);
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, multiLine]);

  const truncateClass = multiLine ? `line-clamp-${lines}` : "truncate";

  const content = (
    <Tag ref={ref as never} className={cn("min-w-0", truncateClass, className)}>
      {value}
    </Tag>
  );

  if (!isOverflowing || !value) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}
