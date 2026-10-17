export interface AdminColumn {
  id: string
  name: string
}

export interface AdminPost {
  id: string
  title: string
  slug: string
  published: boolean
  views?: number
  column?: AdminColumn | null
  _count?: { comments?: number }
}

export interface ImportResult {
  filename: string
  status: string
  title?: string
  error?: string
}

export type CreateStage = "saving" | "refreshing" | "opening" | null

export interface CreatePostInput {
  title: string
  slug: string
  description: string
  columnId: string | null
}
