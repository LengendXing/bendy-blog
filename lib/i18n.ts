export const locales = ["zh", "mn", "ug", "en", "ar", "ru", "ja", "ko"] as const
export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  mn: "ᠮᠣᠩᠭᠣᠯ",
  ug: "ئۇيغۇرچە",
  en: "English",
  ar: "العربية",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
}

// RTL languages
export const rtlLocales: Locale[] = ["ar", "ug"]

type TranslationKeys = {
  blogs: string
  projects: string
  about: string
  noPostsYet: string
  noProjectsYet: string
  aboutNotConfigured: string
  signInToComment: string
  writeComment: string
  post: string
  noComments: string
  share: string
  views: string
  comments: string
  replyTo: string
  pasteImage: string
  // Admin
  overview: string
  content: string
  commentsMgmt: string
  aboutPage: string
  projectsMgmt: string
  settings: string
  loading: string
  save: string
  cancel: string
  edit: string
  delete: string
  add: string
  enable: string
  disable: string
  backToBlog: string
  signOut: string
  adminRequired: string
  signInGithub: string
  // Overview
  totalViews: string
  totalPosts: string
  totalComments: string
  totalShares: string
  topViewed: string
  mostCommented: string
  topViewsSingle: string
  lastUpdated: string
  noActivityToday: string
  // Content
  newPost: string
  title: string
  slug: string
  description: string
  published: string
  saving: string
  // Settings
  blogTitle: string
  footerText: string
  webhookConfig: string
  emailConfig: string
  notifySettings: string
  templateVars: string
  activeConfigs: string
  siteSettings: string
  language: string
}

const translations: Record<Locale, TranslationKeys> = {
  zh: {
    blogs: "博客", projects: "项目", about: "关于", noPostsYet: "暂无文章",
    noProjectsYet: "暂无项目", aboutNotConfigured: "关于页面未配置",
    signInToComment: "登录 GitHub 后评论", writeComment: "写评论...",
    post: "发送", noComments: "暂无评论", share: "分享", views: "阅读",
    comments: "评论", replyTo: "回复", pasteImage: "可粘贴图片",
    overview: "总览", content: "内容管理", commentsMgmt: "评论管理",
    aboutPage: "关于页面", projectsMgmt: "项目管理", settings: "系统设置",
    loading: "Loading...", save: "保存", cancel: "取消", edit: "编辑",
    delete: "删除", add: "添加", enable: "启用", disable: "禁用",
    backToBlog: "← 返回博客", signOut: "退出", adminRequired: "需要管理员权限",
    signInGithub: "使用 GitHub 登录",
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
  },
  en: {
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
  },
  mn: {
    blogs: "Блог", projects: "Төсөл", about: "Тухай", noPostsYet: "Нийтлэл байхгүй.",
    noProjectsYet: "Төсөл байхгүй.", aboutNotConfigured: "Тохируулаагүй байна.",
    signInToComment: "GitHub-ээр нэвтэрч сэтгэгдэл бичнэ", writeComment: "Сэтгэгдэл бичих...",
    post: "Илгээх", noComments: "Сэтгэгдэл байхгүй.", share: "хуваалцах", views: "үзсэн",
    comments: "сэтгэгдэл", replyTo: "Хариулах", pasteImage: "Зураг буулгах боломжтой",
    overview: "Тойм", content: "Агуулга", commentsMgmt: "Сэтгэгдэл",
    aboutPage: "Тухай хуудас", projectsMgmt: "Төслүүд", settings: "Тохиргоо",
    loading: "Ачааллаж байна...", save: "Хадгалах", cancel: "Болих", edit: "Засах",
    delete: "Устгах", add: "Нэмэх", enable: "Идэвхжүүлэх", disable: "Идэвхгүй болгох",
    backToBlog: "← Блог руу буцах", signOut: "Гарах", adminRequired: "Админ эрх шаардлагатай",
    signInGithub: "GitHub-ээр нэвтрэх",
    totalViews: "Нийт үзсэн", totalPosts: "Нийт нийтлэл", totalComments: "Нийт сэтгэгдэл",
    totalShares: "Нийт хуваалцсан", topViewed: "Хамгийн их үзсэн", mostCommented: "Хамгийн их сэтгэгдэлтэй",
    topViewsSingle: "Нэг нийтлэл хамгийн их", lastUpdated: "Сүүлд шинэчилсэн",
    noActivityToday: "Өнөөдөр хэн ч чамайг зовоогоогүй",
    newPost: "Шинэ нийтлэл", title: "Гарчиг", slug: "Slug", description: "Тодорхойлолт",
    published: "Нийтлэгдсэн", saving: "Хадгалж байна...",
    blogTitle: "Блогийн нэр", footerText: "Доод бичвэр",
    webhookConfig: "Webhook тохиргоо", emailConfig: "И-мэйл тохиргоо",
    notifySettings: "Мэдэгдлийн тохиргоо", templateVars: "Загварын хувьсагч",
    activeConfigs: "Идэвхтэй тохиргоо", siteSettings: "Сайтын тохиргоо", language: "Хэл",
  },
  ug: {
    blogs: "بلوگ", projects: "تۈرلەر", about: "ھەققىدە", noPostsYet: "ماقالە يوق.",
    noProjectsYet: "تۈر يوق.", aboutNotConfigured: "ھەققىدە بېتى تەڭشەلمىگەن.",
    signInToComment: "GitHub ئارقىلىق كىرىپ ئىنكاس يېزىڭ", writeComment: "ئىنكاس يېزىڭ...",
    post: "يوللاش", noComments: "ئىنكاس يوق.", share: "ھەمبەھىر", views: "كۆرۈش",
    comments: "ئىنكاس", replyTo: "جاۋاب", pasteImage: "رەسىم چاپلاشقا بولىدۇ",
    overview: "ئومۇمىي", content: "مەزمۇن", commentsMgmt: "ئىنكاس باشقۇرۇش",
    aboutPage: "ھەققىدە بەت", projectsMgmt: "تۈر باشقۇرۇش", settings: "تەڭشەك",
    loading: "يۈكلىنىۋاتىدۇ...", save: "ساقلاش", cancel: "بىكار", edit: "تەھرىرلەش",
    delete: "ئۆچۈرۈش", add: "قوشۇش", enable: "ئىشلىتىش", disable: "توختىتىش",
    backToBlog: "← بلوگقا قايتىش", signOut: "چىقىش", adminRequired: "باشقۇرغۇچى ھوقۇقى لازىم",
    signInGithub: "GitHub ئارقىلىق كىرىش",
    totalViews: "ئومۇمىي كۆرۈش", totalPosts: "ماقالە سانى", totalComments: "ئىنكاس سانى",
    totalShares: "ھەمبەھىر سانى", topViewed: "ئەڭ كۆپ كۆرۈلگەن", mostCommented: "ئەڭ كۆپ ئىنكاس",
    topViewsSingle: "يەككە ئەڭ يۇقىرى", lastUpdated: "ئاخىرقى يېڭىلاش",
    noActivityToday: "بۈگۈن ھېچكىم سىزنى بىزار قىلمىدى",
    newPost: "يېڭى ماقالە", title: "ماۋزۇ", slug: "Slug", description: "چۈشەندۈرۈش",
    published: "نەشر قىلىنغان", saving: "ساقلاۋاتىدۇ...",
    blogTitle: "بلوگ ماۋزۇسى", footerText: "ئاستىقى تېكست",
    webhookConfig: "Webhook تەڭشەك", emailConfig: "ئېلخەت تەڭشەك",
    notifySettings: "ئۇقتۇرۇش تەڭشەك", templateVars: "قېلىپ ئۆزگەرگۈچى",
    activeConfigs: "ئاكتىپ تەڭشەك", siteSettings: "سايت تەڭشەك", language: "تىل",
  },
  ar: {
    blogs: "المدونة", projects: "المشاريع", about: "حول", noPostsYet: "لا توجد مقالات.",
    noProjectsYet: "لا توجد مشاريع.", aboutNotConfigured: "صفحة حول غير مهيأة.",
    signInToComment: "سجل دخول بـ GitHub للتعليق", writeComment: "اكتب تعليقاً...",
    post: "إرسال", noComments: "لا توجد تعليقات.", share: "مشاركة", views: "مشاهدة",
    comments: "تعليقات", replyTo: "رد على", pasteImage: "يمكن لصق صورة",
    overview: "نظرة عامة", content: "المحتوى", commentsMgmt: "التعليقات",
    aboutPage: "صفحة حول", projectsMgmt: "المشاريع", settings: "الإعدادات",
    loading: "جار التحميل...", save: "حفظ", cancel: "إلغاء", edit: "تعديل",
    delete: "حذف", add: "إضافة", enable: "تفعيل", disable: "تعطيل",
    backToBlog: "← العودة للمدونة", signOut: "خروج", adminRequired: "صلاحية المسؤول مطلوبة",
    signInGithub: "تسجيل بـ GitHub",
    totalViews: "إجمالي المشاهدات", totalPosts: "إجمالي المقالات", totalComments: "إجمالي التعليقات",
    totalShares: "إجمالي المشاركات", topViewed: "الأكثر مشاهدة", mostCommented: "الأكثر تعليقاً",
    topViewsSingle: "أعلى مشاهدة فردية", lastUpdated: "آخر تحديث",
    noActivityToday: "لم يزعجك أحد اليوم",
    newPost: "مقالة جديدة", title: "العنوان", slug: "Slug", description: "الوصف",
    published: "منشور", saving: "جار الحفظ...",
    blogTitle: "عنوان المدونة", footerText: "نص التذييل",
    webhookConfig: "إعداد Webhook", emailConfig: "إعداد البريد",
    notifySettings: "إعدادات الإشعارات", templateVars: "متغيرات القالب",
    activeConfigs: "الإعدادات النشطة", siteSettings: "إعدادات الموقع", language: "اللغة",
  },
  ru: {
    blogs: "Блог", projects: "Проекты", about: "О нас", noPostsYet: "Нет статей.",
    noProjectsYet: "Нет проектов.", aboutNotConfigured: "Страница не настроена.",
    signInToComment: "Войти через GitHub для комментария", writeComment: "Написать комментарий...",
    post: "Отправить", noComments: "Нет комментариев.", share: "поделиться", views: "просм.",
    comments: "коммент.", replyTo: "Ответить", pasteImage: "Можно вставить изображение",
    overview: "Обзор", content: "Контент", commentsMgmt: "Комментарии",
    aboutPage: "О странице", projectsMgmt: "Проекты", settings: "Настройки",
    loading: "Загрузка...", save: "Сохранить", cancel: "Отмена", edit: "Редакт.",
    delete: "Удалить", add: "Добавить", enable: "Вкл.", disable: "Выкл.",
    backToBlog: "← Назад к блогу", signOut: "Выход", adminRequired: "Требуется доступ администратора",
    signInGithub: "Войти через GitHub",
    totalViews: "Всего просмотров", totalPosts: "Всего статей", totalComments: "Всего комментариев",
    totalShares: "Всего поделились", topViewed: "Самое просматриваемое", mostCommented: "Больше всего комментариев",
    topViewsSingle: "Макс. просмотров (одна)", lastUpdated: "Последнее обновление",
    noActivityToday: "Сегодня никто вас не беспокоил",
    newPost: "Новая статья", title: "Заголовок", slug: "Slug", description: "Описание",
    published: "Опубликовано", saving: "Сохранение...",
    blogTitle: "Название блога", footerText: "Текст подвала",
    webhookConfig: "Настройка Webhook", emailConfig: "Настройка почты",
    notifySettings: "Настройки уведомлений", templateVars: "Переменные шаблона",
    activeConfigs: "Активные настройки", siteSettings: "Настройки сайта", language: "Язык",
  },
  ja: {
    blogs: "ブログ", projects: "プロジェクト", about: "About", noPostsYet: "記事がありません。",
    noProjectsYet: "プロジェクトがありません。", aboutNotConfigured: "Aboutページ未設定。",
    signInToComment: "GitHubでログインしてコメント", writeComment: "コメントを書く...",
    post: "投稿", noComments: "コメントなし。", share: "共有", views: "閲覧",
    comments: "コメント", replyTo: "返信", pasteImage: "画像貼り付け可",
    overview: "概要", content: "コンテンツ", commentsMgmt: "コメント",
    aboutPage: "Aboutページ", projectsMgmt: "プロジェクト", settings: "設定",
    loading: "読み込み中...", save: "保存", cancel: "キャンセル", edit: "編集",
    delete: "削除", add: "追加", enable: "有効", disable: "無効",
    backToBlog: "← ブログに戻る", signOut: "ログアウト", adminRequired: "管理者権限が必要",
    signInGithub: "GitHubでログイン",
    totalViews: "総閲覧数", totalPosts: "記事総数", totalComments: "コメント総数",
    totalShares: "共有総数", topViewed: "最多閲覧", mostCommented: "最多コメント",
    topViewsSingle: "単記事最多閲覧", lastUpdated: "最終更新",
    noActivityToday: "今日は誰にも邪魔されませんでした",
    newPost: "新規記事", title: "タイトル", slug: "Slug", description: "説明",
    published: "公開済み", saving: "保存中...",
    blogTitle: "ブログタイトル", footerText: "フッターテキスト",
    webhookConfig: "Webhook設定", emailConfig: "メール設定",
    notifySettings: "通知設定", templateVars: "テンプレート変数",
    activeConfigs: "有効な設定", siteSettings: "サイト設定", language: "言語",
  },
  ko: {
    blogs: "블로그", projects: "프로젝트", about: "소개", noPostsYet: "게시물이 없습니다.",
    noProjectsYet: "프로젝트가 없습니다.", aboutNotConfigured: "소개 페이지 미설정.",
    signInToComment: "GitHub로 로그인하여 댓글 작성", writeComment: "댓글 작성...",
    post: "게시", noComments: "댓글 없음.", share: "공유", views: "조회",
    comments: "댓글", replyTo: "답글", pasteImage: "이미지 붙여넣기 가능",
    overview: "개요", content: "콘텐츠", commentsMgmt: "댓글",
    aboutPage: "소개 페이지", projectsMgmt: "프로젝트", settings: "설정",
    loading: "로딩 중...", save: "저장", cancel: "취소", edit: "편집",
    delete: "삭제", add: "추가", enable: "활성화", disable: "비활성화",
    backToBlog: "← 블로그로 돌아가기", signOut: "로그아웃", adminRequired: "관리자 권한 필요",
    signInGithub: "GitHub로 로그인",
    totalViews: "총 조회수", totalPosts: "총 게시물", totalComments: "총 댓글",
    totalShares: "총 공유", topViewed: "최다 조회", mostCommented: "최다 댓글",
    topViewsSingle: "단일 최다 조회", lastUpdated: "마지막 업데이트",
    noActivityToday: "오늘은 아무도 방해하지 않았습니다",
    newPost: "새 게시물", title: "제목", slug: "Slug", description: "설명",
    published: "게시됨", saving: "저장 중...",
    blogTitle: "블로그 제목", footerText: "하단 텍스트",
    webhookConfig: "Webhook 설정", emailConfig: "이메일 설정",
    notifySettings: "알림 설정", templateVars: "템플릿 변수",
    activeConfigs: "활성 설정", siteSettings: "사이트 설정", language: "언어",
  },
}

export function getTranslations(locale: Locale) {
  return translations[locale] || translations.zh
}
