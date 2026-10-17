export type TemplateVars = Record<string, string | number | boolean | null | undefined>

/**
 * Replaces `{{key}}` placeholders in webhook and email templates.
 * Unknown placeholders are preserved so a misconfigured template stays visible
 * instead of silently losing its content.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key]
    return value === undefined || value === null ? match : String(value)
  })
}
