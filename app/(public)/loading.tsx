export default function PublicLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex gap-8 lg:gap-10">
        <div className="flex-1 min-w-0 space-y-6">
          {/* Hero 压缩 */}
          <div className="space-y-2 pb-4 border-b border-[var(--border-subtle)]">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-8 w-40 sm:w-52 rounded-lg" />
            <div className="skeleton h-4 w-full max-w-md rounded" />
          </div>

          {/* 移动端发现区 */}
          <div className="lg:hidden space-y-3">
            <div className="skeleton h-10 w-full rounded-lg" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-6 rounded" style={{ width: `${3.5 + i * 0.4}rem` }} />
              ))}
            </div>
          </div>

          {/* 最近更新条带 */}
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ border: '1px solid var(--border-subtle)', borderLeftWidth: 3 }}
          >
            <div className="flex gap-3">
              <div className="skeleton h-5 w-16 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
            <div className="skeleton h-6 w-3/4 max-w-lg rounded" />
            <div className="skeleton h-4 w-full max-w-md rounded" />
          </div>

          {/* 时间线 + compact 列表 */}
          <div className="timeline-month pl-5 border-l-2 border-[var(--border-subtle)]">
            <div className="flex gap-3 mb-4 -ml-5 pl-5">
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-3 w-8 rounded" />
            </div>
            <div className="home-post-list space-y-0">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 py-3.5 border-b border-[var(--border-subtle)] pl-3"
                  style={{ borderLeft: '2px solid var(--border-subtle)' }}
                >
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 rounded" style={{ width: `${65 + (i % 3) * 10}%` }} />
                    <div className="skeleton h-3 w-2/3 max-w-xs rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                  <div className="skeleton h-5 w-5 rounded shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 侧栏 */}
        <div className="hidden lg:block w-64 xl:w-72 shrink-0 space-y-5">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="space-y-3 rounded-xl p-5 border border-[var(--border-subtle)]">
            <div className="skeleton h-10 w-full rounded-lg" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-6 rounded" style={{ width: `${3 + (i % 4) * 0.5}rem` }} />
              ))}
            </div>
          </div>
          <div className="skeleton h-52 w-full rounded-xl" />
          <div className="skeleton h-36 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
