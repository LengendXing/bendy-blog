"use client"

import { Button } from "@/components/ui/button"
import { AdminLoading } from "@/components/admin-loading"
import { useLocale } from "@/components/locale-provider"
import { SiteSettingsPanel } from "@/components/admin/settings/site-settings-panel"
import { WebhookSettingsPanel } from "@/components/admin/settings/webhook-settings-panel"
import { EmailSettingsPanel } from "@/components/admin/settings/email-settings-panel"
import { AdminsSettingsPanel } from "@/components/admin/settings/admins-settings-panel"
import { useSettingsPage } from "@/components/admin/settings/use-settings-page"

export default function SettingsPage() {
  const { t } = useLocale()
  const settings = useSettingsPage()

  if (settings.loading) return <AdminLoading className="min-h-64" />
  if (settings.loadError) {
    return <div className="flex min-h-64 items-center justify-center font-body text-xs text-red-500" role="alert">Unable to load settings</div>
  }

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// {t.settings}</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button size="sm" variant={settings.tab === "site" ? "default" : "outline"} onClick={() => settings.setTab("site")}>{t.siteSettingsTab}</Button>
        <Button size="sm" variant={settings.tab === "webhook" ? "default" : "outline"} onClick={() => settings.setTab("webhook")}>{t.webhookTab}</Button>
        <Button size="sm" variant={settings.tab === "email" ? "default" : "outline"} onClick={() => settings.setTab("email")}>{t.emailTab}</Button>
        <Button size="sm" variant={settings.tab === "admins" ? "default" : "outline"} onClick={() => settings.setTab("admins")}>{t.adminSettingsTab}</Button>
      </div>

      {settings.tab === "site" && (
        <SiteSettingsPanel
          blogTitle={settings.site.blogTitle}
          onBlogTitleChange={settings.site.setBlogTitle}
          footerText={settings.site.footerText}
          onFooterTextChange={settings.site.setFooterText}
          dufsEnabled={settings.site.dufsEnabled}
          onDufsEnabledChange={settings.site.setDufsEnabled}
          dufsUrl={settings.site.dufsUrl}
          onDufsUrlChange={settings.site.setDufsUrl}
          dufsUser={settings.site.dufsUser}
          onDufsUserChange={settings.site.setDufsUser}
          dufsPass={settings.site.dufsPass}
          onDufsPassChange={settings.site.setDufsPass}
          githubImageRepo={settings.site.githubImageRepo}
          onGithubImageRepoChange={settings.site.setGithubImageRepo}
          githubImageToken={settings.site.githubImageToken}
          onGithubImageTokenChange={settings.site.setGithubImageToken}
          saving={settings.site.savingSite}
          onSave={settings.site.saveSite}
        />
      )}

      {settings.tab === "webhook" && (
        <WebhookSettingsPanel
          form={settings.webhook.wf}
          onFormChange={settings.webhook.setWf}
          configs={settings.configs.filter(config => config.type === "webhook")}
          busyAction={settings.notificationAction}
          onAdd={settings.webhook.addWebhook}
          onToggle={settings.toggle}
          onDelete={settings.removeNotification}
        />
      )}

      {settings.tab === "email" && (
        <EmailSettingsPanel
          form={settings.email.ef}
          onFormChange={settings.email.setEf}
          configs={settings.configs.filter(config => config.type === "email")}
          busyAction={settings.notificationAction}
          onAdd={settings.email.addEmail}
          onToggle={settings.toggle}
          onDelete={settings.removeNotification}
        />
      )}

      {settings.tab === "admins" && (
        <AdminsSettingsPanel
          admins={settings.admins.admins}
          adminsLoading={settings.admins.adminsLoading}
          adminAction={settings.admins.adminAction}
          adminNotice={settings.admins.adminNotice}
          adminError={settings.admins.adminError}
          replaceAdmin={settings.admins.replaceAdmin}
          onCancelReplace={() => settings.admins.setReplaceAdmin(null)}
          githubQuery={settings.admins.githubQuery}
          onGithubQueryChange={settings.admins.updateGithubQuery}
          githubResults={settings.admins.githubResults}
          githubSearching={settings.admins.githubSearching}
          githubSearchError={settings.admins.githubSearchError}
          onSearch={() => settings.admins.searchGithubNow(settings.admins.githubQuery)}
          onSaveAdmin={settings.admins.saveAdmin}
          onRemoveAdmin={settings.admins.removeAdmin}
          onStartReplace={settings.admins.startReplaceAdmin}
          currentGithubId={settings.admins.currentGithubId}
          currentGithubUsername={settings.admins.currentGithubUsername}
        />
      )}
    </div>
  )
}
