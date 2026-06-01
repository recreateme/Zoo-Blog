export default function AdminLoading() {
  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* 页头骨架 */}
      <div className="mb-8 space-y-2">
        <div className="skeleton h-7 w-32 rounded-lg" />
        <div className="skeleton h-4 w-48 rounded" />
      </div>

      {/* 统计卡片骨架 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="skeleton h-3 w-16 rounded mb-3" />
            <div className="skeleton h-8 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* 内容区域骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 rounded-xl p-5 space-y-3"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="skeleton h-4 w-20 rounded" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="flex-1 space-y-1">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="skeleton h-4 w-20 rounded" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton h-3 w-8 rounded" />
              </div>
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
