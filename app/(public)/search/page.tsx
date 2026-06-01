import { Suspense } from 'react'
import SearchClient from './SearchClient'

export const metadata = {
  title: '搜索笔记',
  description: '全文搜索所有学习笔记',
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="skeleton h-10 rounded-xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      </div>
    }>
      <SearchClient />
    </Suspense>
  )
}
