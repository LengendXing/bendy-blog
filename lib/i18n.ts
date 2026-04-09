export const locales = ["zh", "mn", "ug", "en", "ar", "ru", "ja", "ko"] as const
export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  zh: "中文", mn: "ᠮᠣᠩᠭᠣᠯ", ug: "ئۇيغۇرچە", en: "English",
  ar: "العربية", ru: "Русский", ja: "日本語", ko: "한국어",
}

export const rtlLocales: Locale[] = ["ar", "ug"]

type T = {
  blogs: string; projects: string; about: string; noPostsYet: string
  noProjectsYet: string; aboutNotConfigured: string; signInToComment: string
  writeComment: string; post: string; noComments: string; share: string
  views: string; comments: string; replyTo: string; pasteImage: string
  overview: string; content: string; commentsMgmt: string; aboutPage: string
  projectsMgmt: string; settings: string; loading: string; save: string
  cancel: string; edit: string; delete: string; add: string; enable: string
  disable: string; backToBlog: string; signOut: string; adminRequired: string
  signInGithub: string; totalViews: string; totalPosts: string
  totalComments: string; totalShares: string; topViewed: string
  mostCommented: string; topViewsSingle: string; lastUpdated: string
  noActivityToday: string; newPost: string; title: string; slug: string
  description: string; published: string; saving: string; blogTitle: string
  footerText: string; webhookConfig: string; emailConfig: string
  notifySettings: string; templateVars: string; activeConfigs: string
  siteSettings: string; language: string; allColumns: string; column: string
  columnPlaceholder: string; siteSettingsTab: string; webhookTab: string
  emailTab: string; imageStorage: string; dufsService: string
  githubImageRepo: string; expand: string; collapse: string
}

const zh: T = {
  blogs: "Blogs", projects: "Projects", about: "About", noPostsYet: "None yet.",
  noProjectsYet: "暂无项目", aboutNotConfigured: "关于页面未配置",
  signInToComment: "登录 GitHub 后评论", writeComment: "写评论...",
  post: "发送", noComments: "暂无评论", share: "分享", views: "阅读",
  comments: "评论", replyTo: "回复", pasteImage: "可粘贴图片",
  overview: "总览", content: "内容管理", commentsMgmt: "评论管理",
  aboutPage: "关于页面", projectsMgmt: "项目管理", settings: "系统设置",
  loading: "Loading...", save: "保存", cancel: "取消", edit: "编辑",
  delete: "删除", add: "添加", enable: "启用", disable: "禁用",
  backToBlog: "← 返回博客", signOut: "退出", adminRequired: "需要管理员权限",
  signInGithub: "Sign in with GitHub is required to access admin panel",
  totalViews: "总浏览量", totalPosts: "文章总数", totalComments: "评论总数",
  totalShares: "分享总数", topViewed: "最高浏览", mostCommented: "最多评论",
  topViewsSingle: "单篇最高浏览", lastUpdated: "最后更新",
  noActivityToday: "没人来骚扰你",
  newPost: "新建文章", title: "标题", slug: "Slug", description: "描述",
  published: "已发布", saving: "保存中...",
  blogTitle: "博客标题", footerText: "底部文字",
  webhookConfig: "Webhook 配置", emailConfig: "邮件配置",
  notifySettings: "通知设置", templateVars: "模板变量",
  activeConfigs: "已启用配置", siteSettings: "站点设置", language: "语言",
  allColumns: "ALL", column: "专栏", columnPlaceholder: "输入专栏名回车创建 (≤6字)",
  siteSettingsTab: "站点设置", webhookTab: "Webhook通知", emailTab: "Email通知",
  imageStorage: "图片存储", dufsService: "Dufs服务",
  githubImageRepo: "GitHub图片仓库", expand: "展开", collapse: "收起",
}

const en: T = {
  blogs: "Blogs", projects: "Projects", about: "About", noPostsYet: "No posts yet.",
  noProjectsYet: "No projects yet.", aboutNotConfigured: "About page not configured.",
  signInToComment: "Sign in with GitHub to comment", writeComment: "Write a comment...",
  post: "Post", noComments: "No comments yet.", share: "share", views: "views",
  comments: "comments", replyTo: "Reply to", pasteImage: "Paste image supported",
  overview: "Overview", content: "Content", commentsMgmt: "Comments",
  aboutPage: "About Page", projectsMgmt: "Projects", settings: "Settings",
  loading: "Loading...", save: "Save", cancel: "Cancel", edit: "Edit",
  delete: "Delete", add: "Add", enable: "Enable", disable: "Disable",
  backToBlog: "← Back to blog", signOut: "Sign out", adminRequired: "Admin Access Required",
  signInGithub: "Sign in with GitHub",
  totalViews: "Total Views", totalPosts: "Total Posts", totalComments: "Total Comments",
  totalShares: "Total Shares", topViewed: "Top Viewed", mostCommented: "Most Commented",
  topViewsSingle: "Top Views (Single)", lastUpdated: "Last Updated",
  noActivityToday: "No one bothered you today",
  newPost: "New Post", title: "Title", slug: "Slug", description: "Description",
  published: "Published", saving: "Saving...",
  blogTitle: "Blog Title", footerText: "Footer Text",
  webhookConfig: "Webhook Config", emailConfig: "Email Config",
  notifySettings: "Notification Settings", templateVars: "Template Variables",
  activeConfigs: "Active Configs", siteSettings: "Site Settings", language: "Language",
  allColumns: "All", column: "Column", columnPlaceholder: "Type column name + Enter (≤6 chars)",
  siteSettingsTab: "Site Settings", webhookTab: "Webhook Notify", emailTab: "Email Notify",
  imageStorage: "Image Storage", dufsService: "Dufs Service",
  githubImageRepo: "GitHub Image Repo", expand: "Expand", collapse: "Collapse",
}

const mn: T = { ...en,
  blogs: "Блог", projects: "Төсөл", about: "Тухай", noPostsYet: "Нийтлэл байхгүй.",
  noProjectsYet: "Төсөл байхгүй.", overview: "Тойм", content: "Агуулга",
  commentsMgmt: "Сэтгэгдэл", aboutPage: "Тухай хуудас", projectsMgmt: "Төслүүд",
  settings: "Тохиргоо", loading: "Ачааллаж байна...", save: "Хадгалах", cancel: "Болих",
  allColumns: "Бүгд", column: "Багана", siteSettingsTab: "Сайтын тохиргоо",
  webhookTab: "Webhook мэдэгдэл", emailTab: "И-мэйл мэдэгдэл",
  noActivityToday: "Өнөөдөр хэн ч чамайг зовоогоогүй", expand: "Дэлгэх", collapse: "Хураах",
}

const ug: T = { ...en,
  blogs: "بلوگ", projects: "تۈرلەر", about: "ھەققىدە", noPostsYet: "ماقالە يوق.",
  overview: "ئومۇمىي", content: "مەزمۇن", commentsMgmt: "ئىنكاس باشقۇرۇش",
  settings: "تەڭشەك", loading: "يۈكلىنىۋاتىدۇ...", save: "ساقلاش", cancel: "بىكار",
  allColumns: "ھەممىسى", column: "ستون", siteSettingsTab: "سايت تەڭشەك",
  webhookTab: "Webhook ئۇقتۇرۇش", emailTab: "ئېلخەت ئۇقتۇرۇش",
  noActivityToday: "بۈگۈن ھېچكىم سىزنى بىزار قىلمىدى", expand: "يېيىش", collapse: "يىغىش",
}

const ar: T = { ...en,
  blogs: "المدونة", projects: "المشاريع", about: "حول", noPostsYet: "لا توجد مقالات.",
  overview: "نظرة عامة", content: "المحتوى", commentsMgmt: "التعليقات",
  settings: "الإعدادات", loading: "جار التحميل...", save: "حفظ", cancel: "إلغاء",
  allColumns: "الكل", column: "العمود", siteSettingsTab: "إعدادات الموقع",
  webhookTab: "إشعار Webhook", emailTab: "إشعار البريد",
  noActivityToday: "لم يزعجك أحد اليوم", expand: "توسيع", collapse: "طي",
}

const ru: T = { ...en,
  blogs: "Блог", projects: "Проекты", about: "О нас", noPostsYet: "Нет статей.",
  overview: "Обзор", content: "Контент", commentsMgmt: "Комментарии",
  settings: "Настройки", loading: "Загрузка...", save: "Сохранить", cancel: "Отмена",
  allColumns: "Все", column: "Рубрика", siteSettingsTab: "Настройки сайта",
  webhookTab: "Webhook уведомления", emailTab: "Email уведомления",
  noActivityToday: "Сегодня никто вас не беспокоил", expand: "Развернуть", collapse: "Свернуть",
}

const ja: T = { ...en,
  blogs: "ブログ", projects: "プロジェクト", about: "About", noPostsYet: "記事がありません。",
  overview: "概要", content: "コンテンツ", commentsMgmt: "コメント",
  settings: "設定", loading: "読み込み中...", save: "保存", cancel: "キャンセル",
  allColumns: "すべて", column: "カラム", siteSettingsTab: "サイト設定",
  webhookTab: "Webhook通知", emailTab: "メール通知",
  noActivityToday: "今日は誰にも邪魔されませんでした", expand: "展開", collapse: "折りたたむ",
}

const ko: T = { ...en,
  blogs: "블로그", projects: "프로젝트", about: "소개", noPostsYet: "게시물이 없습니다.",
  overview: "개요", content: "콘텐츠", commentsMgmt: "댓글",
  settings: "설정", loading: "로딩 중...", save: "저장", cancel: "취소",
  allColumns: "전체", column: "칼럼", siteSettingsTab: "사이트 설정",
  webhookTab: "Webhook 알림", emailTab: "이메일 알림",
  noActivityToday: "오늘은 아무도 방해하지 않았습니다", expand: "펼치기", collapse: "접기",
}

const translations: Record<Locale, T> = { zh, en, mn, ug, ar, ru, ja, ko }

export function getTranslations(locale: Locale) {
  return translations[locale] || translations.zh
}
