import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-3 text-sm text-[#f3f3f3] placeholder:text-[#777] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#555] focus-visible:border-[#555] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
