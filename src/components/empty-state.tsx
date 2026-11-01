import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  image?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  image = "/empty.svg",
  action,
  className,
}: Props) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-y-6 text-center",
        className,
      )}
    >
      <Image
        src={image}
        alt=""
        aria-hidden
        width={200}
        height={200}
        className="h-auto w-auto max-w-[200px]"
      />
      <div className="flex flex-col gap-y-2 max-w-md mx-auto">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground text-balance">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
};
