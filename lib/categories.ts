import { Category } from '@/types'

export const CATEGORIES: Category[] = [
  {
    id: 'ai',
    name: 'AI · 人工智能',
    description: '大模型、机器学习、深度学习相关笔记',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/40',
    icon: '🤖',
    order: 1,
  },
  {
    id: 'computer-vision',
    name: '计算机视觉',
    description: 'CV、图像处理、目标检测相关笔记',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    icon: '👁️',
    order: 2,
  },
  {
    id: 'huawei-datacom',
    name: '华为数通',
    description: 'HCIA/HCIP 网络认证学习笔记',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    icon: '🌐',
    order: 3,
  },
  {
    id: 'web-dev',
    name: 'Web 开发',
    description: '前端、后端、全栈开发技术笔记',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: '💻',
    order: 4,
  },
  {
    id: 'project-management',
    name: '项目管理',
    description: 'PMP、敏捷开发、团队协作方法论',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    icon: '📊',
    order: 5,
  },
  {
    id: 'life',
    name: '生活笔记',
    description: '读书感悟、日常随想、生活记录',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/40',
    icon: '✨',
    order: 6,
  },
  {
    id: 'others',
    name: '其他',
    description: '不便归类的各类笔记',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-900/40',
    icon: '📁',
    order: 7,
  },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<string, Category>

export function getCategoryById(id: string): Category | undefined {
  return CATEGORY_MAP[id]
}

export function getCategoryName(id: string): string {
  return CATEGORY_MAP[id]?.name ?? id
}
