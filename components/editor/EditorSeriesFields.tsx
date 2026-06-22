'use client'

interface EditorSeriesFieldsProps {
  series: string
  seriesOrder: string
  seriesSuggestions?: string[]
  onSeriesChange: (v: string) => void
  onSeriesOrderChange: (v: string) => void
}

export default function EditorSeriesFields({
  series,
  seriesOrder,
  seriesSuggestions = [],
  onSeriesChange,
  onSeriesOrderChange,
}: EditorSeriesFieldsProps) {
  const listId = 'series-suggestions'

  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          教程 / 专题
        </label>
        <input
          type="text"
          list={seriesSuggestions.length > 0 ? listId : undefined}
          value={series}
          onChange={(e) => onSeriesChange(e.target.value)}
          className="input text-sm"
          placeholder="如：OpenCV 入门教程"
        />
        {seriesSuggestions.length > 0 && (
          <datalist id={listId}>
            {seriesSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          有专题时可设顺序；子分类在教程下表示章节名
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
