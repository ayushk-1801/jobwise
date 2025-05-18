import Link from "next/link"

import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/dashboard/jobs"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Jobs
      </Link>
      <Link
        href="/dashboard/applications"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Applications
      </Link>
      <Link
        href="/dashboard/optimize-resume"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Optimize Resume
      </Link>
    </nav>
  )
}