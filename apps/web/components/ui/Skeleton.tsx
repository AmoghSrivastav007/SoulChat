import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--bg-secondary)]",
        className
      )}
    />
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className={`flex ${i % 3 === 0 ? "justify-end" : "justify-start"}`}>
          <Skeleton className={`h-10 rounded-2xl ${i % 3 === 0 ? "w-1/2" : "w-2/3"}`} />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

export function QuestSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-[var(--border)] p-3 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}
