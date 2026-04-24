/**
 * Skeleton loading screen for the /cars/[id] car detail route.
 * Mirrors the two-column layout: image + specs on left, pricing on right.
 */
export default function CarDetailLoading() {
  return (
    <div className="pt-16 min-h-screen bg-neutral-50">
      {/* Breadcrumb skeleton */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-neutral-200 rounded animate-pulse" />
            <span className="text-neutral-200">/</span>
            <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse" />
            <span className="text-neutral-200">/</span>
            <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column */}
          <div>
            {/* Main image */}
            <div className="aspect-[4/3] rounded-2xl bg-neutral-200 animate-pulse mb-4" />

            {/* Spec tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-neutral-100 rounded-lg p-3 flex flex-col items-center gap-2">
                  <div className="h-4 w-4 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-neutral-200 rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Features skeleton */}
            <div className="bg-white rounded-xl border border-neutral-100 p-6">
              <div className="h-5 w-32 bg-neutral-200 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 bg-neutral-200 rounded-full animate-pulse" />
                    <div className="h-3 w-40 bg-neutral-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Pricing card */}
          <div>
            <div className="bg-white rounded-2xl border border-neutral-100 p-6">
              <div className="h-3 w-12 bg-neutral-200 rounded animate-pulse mb-2" />
              <div className="h-7 w-40 bg-neutral-200 rounded animate-pulse mb-1" />
              <div className="h-4 w-56 bg-neutral-100 rounded animate-pulse mb-6" />

              <div className="h-9 w-48 bg-neutral-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-36 bg-neutral-100 rounded animate-pulse mb-8" />

              {/* Calculator skeleton */}
              <div className="space-y-4">
                <div className="h-5 w-32 bg-neutral-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-9 w-20 bg-neutral-100 rounded-lg animate-pulse" />
                  ))}
                </div>
                <div className="h-5 w-28 bg-neutral-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 w-24 bg-neutral-100 rounded-lg animate-pulse" />
                  ))}
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 space-y-3 border border-neutral-100">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons skeleton */}
              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
                <div className="h-12 w-full bg-neutral-200 rounded-lg animate-pulse" />
                <div className="h-12 w-full bg-neutral-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
