import { Metadata } from 'next'
import GraphClient from './GraphClient'

export const metadata: Metadata = {
  title: '知识图谱',
  description: '笔记双向链接与标签关联的可视化网络',
}

export default function GraphPage() {
  return <GraphClient />
}
