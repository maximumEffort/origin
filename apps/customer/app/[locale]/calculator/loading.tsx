/**
 * Skeleton loading screen for the /calculator route.
 * Matches the calculator page layout with form placeholder.
 */
export default function CalculatorLoading() {
  return (
    <div className="pt-16 min-h-screen bg-neutral-50">
      {/* Page header skeleton */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-56 bg-neutral-200 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-72 bg-neutral-100 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl border border-neutral-100 p-6 sm:p-8">
          {/* Title */}
          <div className="h-6 w-40 bg-neutral-200 rounded animate-pulse mb-6" />

          {/* Duration selector */}
          <div className="mb-5">
            <div className="h-4 w-28 bg-neutral-100 rounded animate-pulse mb-3" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 w-24 bg-neutral-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Mileage selector */}
          <div className="mb-5">
            <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse mb-3" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-28 bg-neutral-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-4 w-4 bg-neutral-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-neutral-100 rounded animate-pulse" />
          </div>

          {/* Quote summary */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-3 border border-neutral-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse" />
              </div>
            ))}
            <div className="pt-2 border-t border-neutral-200 flex justify-between">
              <div className="h-5 w-24 bg-neutral-200 rounded animate-pulse" />
              <div className="h-6 w-28 bg-neutral-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
