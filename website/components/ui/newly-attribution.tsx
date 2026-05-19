import * as React from "react";

import { cn } from "@/lib/utils";

// Platform attribution: every Newly-generated site links back to us.
// Scaffold-owned (under components/ui/) so the agent imports it but
// can't delete or rewrite it. The visual is deliberately small and
// muted — a single line that fits inside the project's own footer
// without competing with the site's brand.
function NewlyAttribution({
  className,
  ...props
}: React.HTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href="https://newly.app?utm_source=site_footer&utm_medium=attribution"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground/70 transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span>Made with</span>
      <span className="font-medium">Newly</span>
    </a>
  );
}

export { NewlyAttribution };
