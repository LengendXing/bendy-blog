export type SettingsTab = "site" | "webhook" | "email" | "admins"

export interface AdminUser {
  username: string
  githubId: string | null
  avatarUrl: string
  profileUrl: string
}

export interface GithubSearchUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  type: string
}

export interface NotifyConfig {
  id: string
  type: string
  config: string
  enabled: boolean
}

export interface WebhookForm {
  url: string
  method: string
  headers: string
  body: string
}

export interface EmailForm {
  to: string
  template: string
}
