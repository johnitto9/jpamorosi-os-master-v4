// app/projects/loading.tsx — route-level skeleton (BP RouteLoading parity):
// the index paints an instant branded placeholder while the server renders,
// instead of a blank flash.

export default function Loading() {
  return (
    <main className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-6 pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="lab-skeleton h-4 w-28 rounded-full" />
        <div className="lab-skeleton mt-6 h-10 w-72 rounded-xl" />
        <div className="lab-skeleton mt-3 h-4 w-full max-w-xl rounded-full" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/10">
              <div className="lab-skeleton aspect-[16/10] w-full" />
              <div className="space-y-2 p-4">
                <div className="lab-skeleton h-4 w-2/3 rounded-full" />
                <div className="lab-skeleton h-3 w-full rounded-full" />
                <div className="lab-skeleton h-3 w-4/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
