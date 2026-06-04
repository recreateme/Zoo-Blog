interface EditorSeriesFieldsProps {
  series: string
  seriesOrder: string
  onSeriesChange: (v: string) => void
  onSeriesOrderChange: (v: string) => void
}

export default function EditorSeriesFields({
  series,
  seriesOrder,
  onSeriesChange,
  onSeriesOrderChange,
}: EditorSeriesFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          专题 / 系列
        </label>
        <input
          type="text"
          value={series}
          onChange={(e) => onSeriesChange(e.target.value)}
          className="input text-sm"
          placeholder="如：TCP 传输层"
        />
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          同专题内可设置顺序，用于上一篇/下一篇与分类大纲
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          专题内顺序
        </label>
        <input
          type="number"
          min={1}
          value={seriesOrder}
          onChange={(e) => onSeriesOrderChange(e.target.value)}
          className="input text-sm"
          placeholder="1"
          disabled={!series.trim()}
        />
      </div>
    </>
  )
}
