import React from 'react'
import { Box, Text } from 'ink'

interface LogPanelProps {
  title: string
  logs: string[]
  color: string
  width: string
  maxLines?: number
}

export function LogPanel({ title, logs, color, width, maxLines = 20 }: LogPanelProps) {
  // Get last N lines
  const displayLogs = logs.slice(-maxLines)

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={color}
      paddingX={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={color}>
          {title}
        </Text>
        <Text dimColor> ({logs.length} logs)</Text>
      </Box>

      {/* Logs */}
      <Box flexDirection="column" flexGrow={1}>
        {displayLogs.length === 0 ? (
          <Text dimColor>Waiting for logs...</Text>
        ) : (
          displayLogs.map((log, i) => (
            <Text key={i} wrap="truncate">
              {formatLogLine(log)}
            </Text>
          ))
        )}
      </Box>
    </Box>
  )
}

/**
 * Format a log line for display
 */
function formatLogLine(line: string): string {
  // Remove ANSI codes for cleaner display
  const clean = line.replace(/\x1b\[[0-9;]*m/g, '')

  // Truncate long lines
  if (clean.length > 80) {
    return clean.substring(0, 77) + '...'
  }

  return clean
}
