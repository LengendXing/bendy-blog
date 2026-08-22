type PostDateFields = {
  publishDate: Date | string | null
  createdAt: Date | string
}

/** Uses the explicit publish date when present, otherwise creation time. */
export function postEffectiveTimestamp(post: PostDateFields) {
  const publishTime = post.publishDate ? new Date(post.publishDate).getTime() : Number.NaN
  return Number.isFinite(publishTime) ? publishTime : new Date(post.createdAt).getTime()
}

export function sortPostsByEffectiveDate<T extends PostDateFields>(posts: T[]) {
  return [...posts].sort((a, b) => {
    const difference = postEffectiveTimestamp(b) - postEffectiveTimestamp(a)
    if (difference !== 0) return difference
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
