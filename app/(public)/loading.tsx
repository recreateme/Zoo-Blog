export default function PublicLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex gap-10">
        <div className="flex-1 space-y-6">
          {/* 页头骨架 */}
          <div className="space-y-2 mb-10">
            <div className="skeleton h-8 w-48 rounded-lg" />
            <div className="skeleton h-5 w-72 rounded-lg" />
          </div>
          {/* 月份标题骨架 */}
          <div className="skeleton h-5 w-24 rounded" />
          {/* 文章卡片骨架 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        </div>
        {/* 侧边栏骨架 */}
        <div className="hidden lg:block w-60 shrink-0 space-y-4">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
