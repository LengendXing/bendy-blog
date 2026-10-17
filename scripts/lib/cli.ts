export function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

export function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index < 0) return undefined
  return process.argv[index + 1]
}
