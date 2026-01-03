/**
 * Log parser to categorize wrangler output
 */

export type LogCategory = 'user' | 'localflare' | 'system'

export interface ParsedLog {
  category: LogCategory
  content: string
  timestamp: Date
}

/**
 * Parse a log line and categorize it
 */
export function parseLogLine(line: string): ParsedLog | null {
  if (!line.trim()) return null

  const timestamp = new Date()

  // Localflare API routes
  if (line.includes('/__localflare/')) {
    return { category: 'localflare', content: line, timestamp }
  }

  // Localflare internal messages
  if (
    line.includes('localflare-api has access') ||
    line.includes('env.LOCALFLARE_MANIFEST') ||
    line.includes('env.USER_WORKER') ||
    line.includes('Reloading local server') ||
    (line.includes('Binding') && line.includes('Resource') && line.includes('Mode'))
  ) {
    return { category: 'system', content: line, timestamp }
  }

  // Binding table rows (env.XXXX ... local)
  if (/env\.\w+\s+\(/.test(line) && line.includes('local')) {
    return { category: 'system', content: line, timestamp }
  }

  // User's worker logs (everything else)
  return { category: 'user', content: line, timestamp }
}

/**
 * Parse multiple log lines
 */
export function parseLogs(output: string): ParsedLog[] {
  return output
    .split('\n')
    .map(parseLogLine)
    .filter((log): log is ParsedLog => log !== null)
}

/**
 * Extract worker name from log line if present
 * e.g., "[demo-app] Processing..." -> "demo-app"
 */
export function extractWorkerName(line: string): string | null {
  const match = line.match(/^\[([^\]]+)\]/)
  return match ? match[1] : null
}
