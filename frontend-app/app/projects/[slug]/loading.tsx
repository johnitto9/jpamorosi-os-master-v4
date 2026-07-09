// app/projects/[slug]/loading.tsx — route-level skeleton for a project room:
// hero block + proof rows shimmer in place while the server renders.

export default function Loading() {
  return (
    <main className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-6 pt-20">
      <div className="mx-auto max-w-5xl">
        <div className="lab-skeleton h-4 w-24 rounded-full" />
        <div className="lab-skeleton mt-5 h-12 w-80 max-w-full rounded-xl" />
        <div className="lab-skeleton mt-3 h-4 w-full max-w-2xl rounded-full" />
        <div className="lab-skeleton mt-2 h-4 w-3/4 max-w-xl rounded-full" />
        <div className="lab-skeleton mt-8 aspect-[16/9] w-full rounded-2xl" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="lab-skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
