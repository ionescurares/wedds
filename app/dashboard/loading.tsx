export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f9f5ed] p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 animate-pulse">
          <div className="h-6 w-40 rounded bg-zinc-300/70" />
          <div className="mt-3 h-10 w-72 rounded bg-zinc-300/70" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-zinc-300/70 bg-white/70 p-4">
              <div className="mb-4 h-24 rounded-xl bg-zinc-300/70" />
              <div className="mb-2 h-5 w-2/3 rounded bg-zinc-300/70" />
              <div className="mb-4 h-4 w-1/2 rounded bg-zinc-300/70" />
              <div className="flex gap-2">
                <div className="h-9 w-20 rounded bg-zinc-300/70" />
                <div className="h-9 w-24 rounded bg-zinc-300/70" />
                <div className="h-9 w-16 rounded bg-zinc-300/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
