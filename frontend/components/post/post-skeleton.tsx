export function PostSkeleton() {
  return (
    <div className="flex gap-3 py-4 px-4 border-b border-[#1e1e1e]">
      <div className="skeleton h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="flex gap-4 mt-3">
          <div className="skeleton h-6 w-12 rounded" />
          <div className="skeleton h-6 w-12 rounded" />
          <div className="skeleton h-6 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </>
  );
}
