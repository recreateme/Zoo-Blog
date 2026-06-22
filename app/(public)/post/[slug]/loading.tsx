export default function PostLoading() {
  return (
    <div className="post-page">
      <div className="post-layout">
        <div className="post-article">
          {/* 返回按钮 */}
          <div className="skeleton h-4 w-24 rounded mb-6" />

          {/* 头部 */}
          <div className="mb-8 space-y-4">
            <div className="skeleton h-5 w-20 rounded-full" />
            <div className="skeleton h-10 w-3/4 rounded-lg" />
            <div className="skeleton h-5 w-full rounded" />
            <div className="skeleton h-5 w-5/6 rounded" />
            <div className="flex gap-4 pt-2">
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          </div>

          {/* 正文骨架 */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="skeleton rounded"
                style={{ height: '1rem', width: `${70 + Math.random() * 30}%` }}
              />
            ))}
            <div className="skeleton h-32 rounded-lg my-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i + 10}
                className="skeleton rounded"
                style={{ height: '1rem', width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        </div>

        {/* TOC 骨架 */}
        <div className="post-sidebar space-y-2">
          <div className="skeleton h-3 w-12 rounded mb-3" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-3 rounded" style={{ width: `${50 + i * 8}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
