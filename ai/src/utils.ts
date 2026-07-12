export function safeReplace(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => replacements[key] || '')
}
