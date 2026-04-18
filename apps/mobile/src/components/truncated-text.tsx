import { cn } from "@/lib/utils";

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
  const value = text == null ? "" : String(text);
  const truncateClass = lines > 1 ? `line-clamp-${lines}` : "truncate";

  return (
    <Tag
      className={cn("min-w-0", truncateClass, className)}
      title={value || undefined}
    >
      {value}
    </Tag>
  );
}
