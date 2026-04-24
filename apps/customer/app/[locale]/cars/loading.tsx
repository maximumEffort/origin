/**
 * Skeleton loading screen for the /cars catalogue route.
 * Matches the CarsGrid card layout with 8 placeholder cards.
 */
export default function CarsLoading() {
  return (
    <div className="pt-16 min-h-screen bg-neutral-50">
      {/* Page header skeleton */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-48 bg-neutral-200 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-80 bg-neutral-100 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-5 w-5 bg-neutral-200 rounded animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 bg-neutral-200 rounded-full animate-pulse" />
          ))}
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-neutral-100">
              {/* Image placeholder */}
              <div className="aspect-[4/3] bg-neutral-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-16 bg-neutral-200 rounded animate-pulse" />
                <div className="h-5 w-32 bg-neutral-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-neutral-100 rounded-full animate-pulse" />
                  <div className="h-5 w-14 bg-neutral-100 rounded-full animate-pulse" />
                </div>
                <div className="h-6 w-40 bg-neutral-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
