export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent)' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>加载中…</p>
      </div>
    </div>
  )
}
