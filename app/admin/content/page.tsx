"use client"

import { useLocale } from "@/components/locale-provider"
import { AdminLoading } from "@/components/admin-loading"
import { PixelStatus } from "@/components/pixel-status"
import { ContentToolbar } from "@/components/admin/content/content-toolbar"
import { ImportPanel } from "@/components/admin/content/import-panel"
import { NewPostDialog } from "@/components/admin/content/new-post-dialog"
import { PostList } from "@/components/admin/content/post-list"
import { useContentPage } from "@/components/admin/content/use-content-page"

export default function ContentPage() {
  const { t } = useLocale()
  const content = useContentPage()

  if (content.loading) return <AdminLoading className="min-h-64" />

  return (
    <div className="relative min-h-[360px] overflow-hidden" aria-busy={content.deletingPost}>
      {content.deletingPost && (
        <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 dark:bg-pixel-black/95" />
      )}

      <ContentToolbar
        search={content.search}
        onSearchChange={content.setSearch}
        onSearch={content.doSearch}
        onToggleImport={() => {
          content.setShowImport(!content.showImport)
          content.setImportResults(null)
        }}
        onNewPost={() => {
          content.setShowNew(true)
          content.setCreateError("")
        }}
      />

      {content.showImport && (
        <ImportPanel
          fileInputRef={content.fileInputRef}
          importing={content.importing}
          results={content.importResults}
          onImport={content.handleImport}
          onClose={() => {
            content.setShowImport(false)
            content.setImportResults(null)
          }}
        />
      )}

      <NewPostDialog
        open={content.showNew && !content.createStage}
        columns={content.columns}
        title={content.newTitle}
        slug={content.newSlug}
        description={content.newDescription}
        columnId={content.newColumnId}
        creating={content.creating}
        columnAction={content.columnAction}
        error={content.createError}
        onTitleChange={content.setNewTitle}
        onSlugChange={content.setNewSlug}
        onDescriptionChange={content.setNewDescription}
        onColumnChange={content.setNewColumnId}
        onSubmit={content.createPost}
        onClose={() => {
          content.setShowNew(false)
          content.resetNewPost()
        }}
        onCreateColumn={content.createColumn}
        onUpdateColumn={content.updateColumn}
      />

      {content.createStage && (
        <PixelStatus
          title={content.createStage === "saving" ? t.saving : content.createStage === "refreshing" ? t.refreshingList : t.openingEditor}
          detail={content.createStage === "refreshing" ? t.refreshingList : content.createStage === "opening" ? t.openingEditor : t.saving}
        />
      )}

      <PostList
        posts={content.posts}
        filteredCount={content.filteredCount}
        page={content.page}
        totalPages={content.totalPages}
        onDelete={content.deletePost}
        onEdit={content.editPost}
        onPageChange={content.setPage}
      />
    </div>
  )
}
