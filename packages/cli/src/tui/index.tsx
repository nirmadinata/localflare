import React, { useState, useCallback } from 'react'
import { render, Box, Text, useInput, useApp, useStdout } from 'ink'
import Spinner from 'ink-spinner'
import { parseLogs } from './log-parser.js'

interface TuiProps {
  workerPort: number
  dashboardUrl: string
  workerName: string
  onExit: () => void
}

interface LogEntry {
  id: number
  content: string
  timestamp: number
}

let logIdCounter = 0

function LocalflareTui({ workerPort, dashboardUrl, workerName, onExit }: TuiProps) {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [started, setStarted] = useState(false)
  const [userLogs, setUserLogs] = useState<LogEntry[]>([])
  const [localflareLogs, setLocalflareLogs] = useState<LogEntry[]>([])
  const [showLocalflare, setShowLocalflare] = useState(false)

  // Calculate available height
  const terminalHeight = stdout?.rows || 24
  const headerHeight = 6 // Header + status + footer
  const logHeight = Math.max(10, terminalHeight - headerHeight)

  // Handle keyboard input
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      onExit()
      exit()
    }
    if (input === 'l') {
      setShowLocalflare((prev) => !prev)
    }
    if (input === 'c') {
      setUserLogs([])
      setLocalflareLogs([])
    }
  })

  // Get display logs (last N entries)
  const displayUserLogs = userLogs.slice(-logHeight)
  const displayLocalflareLogs = localflareLogs.slice(-logHeight)

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">⚡ Localflare </Text>
          {started ? (
            <Text color="green">● Running</Text>
          ) : (
            <Text color="yellow"><Spinner type="dots" /> Starting...</Text>
          )}
        </Box>
        <Text dimColor>
          <Text bold>L</Text>=logs <Text bold>C</Text>=clear <Text bold>Q</Text>=quit
        </Text>
      </Box>

      {/* Status bar */}
      {started && (
        <Box paddingX={1}>
          <Text dimColor>App: </Text>
          <Text color="cyan">http://localhost:{workerPort}</Text>
          <Text>  </Text>
          <Text dimColor>Dashboard: </Text>
          <Text color="cyan">{dashboardUrl}</Text>
        </Box>
      )}

      {/* Log panels */}
      <Box flexDirection="row" marginTop={1}>
        {/* User logs */}
        <Box
          flexDirection="column"
          width={showLocalflare ? '50%' : '100%'}
          borderStyle="single"
          borderColor="green"
          paddingX={1}
          height={logHeight}
        >
          <Text bold color="green">🚀 {workerName}</Text>
          <Box flexDirection="column" marginTop={1}>
            {displayUserLogs.length === 0 ? (
              <Text dimColor>Waiting for requests...</Text>
            ) : (
              displayUserLogs.map((log) => (
                <Text key={log.id} wrap="truncate-end">{cleanLogLine(log.content)}</Text>
              ))
            )}
          </Box>
        </Box>

        {/* Localflare logs */}
        {showLocalflare && (
          <Box
            flexDirection="column"
            width="50%"
            borderStyle="single"
            borderColor="blue"
            paddingX={1}
            height={logHeight}
          >
            <Text bold color="blue">📊 Localflare API</Text>
            <Box flexDirection="column" marginTop={1}>
              {displayLocalflareLogs.length === 0 ? (
                <Text dimColor>No dashboard requests...</Text>
              ) : (
                displayLocalflareLogs.map((log) => (
                  <Text key={log.id} wrap="truncate-end">{cleanLogLine(log.content)}</Text>
                ))
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>
          {userLogs.length} app logs{showLocalflare ? ` | ${localflareLogs.length} api logs` : ' | Press L to show Localflare logs'}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Clean a log line for display
 */
function cleanLogLine(line: string): string {
  // Remove ANSI escape codes
  return line.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * TUI instance with methods to update state
 */
export interface TuiInstance {
  setStarted: (started: boolean) => void
  addOutput: (output: string) => void
  unmount: () => void
}

/**
 * Start the TUI and return control methods
 */
export function startTui(options: TuiProps): TuiInstance {
  let tuiStarted = false
  let userLogsRef: LogEntry[] = []
  let localflareLogsRef: LogEntry[] = []
  let rerender: (() => void) | null = null

  // State update functions that will be connected to React
  const stateRef = {
    setStarted: (started: boolean) => {
      tuiStarted = started
      rerender?.()
    },
    addOutput: (output: string) => {
      const parsed = parseLogs(output)
      for (const log of parsed) {
        const entry = { id: ++logIdCounter, content: log.content, timestamp: Date.now() }
        if (log.category === 'user') {
          userLogsRef.push(entry)
        } else if (log.category === 'localflare') {
          localflareLogsRef.push(entry)
        }
      }
      rerender?.()
    },
  }

  // Component that uses the refs
  function TuiWrapper() {
    const [, forceUpdate] = useState(0)
    rerender = useCallback(() => forceUpdate((n) => n + 1), [])

    return (
      <LocalflareTuiWithState
        {...options}
        started={tuiStarted}
        userLogs={userLogsRef}
        localflareLogs={localflareLogsRef}
      />
    )
  }

  const { unmount } = render(<TuiWrapper />)

  return {
    ...stateRef,
    unmount,
  }
}

// Stateless version that receives props
function LocalflareTuiWithState({
  workerPort,
  dashboardUrl,
  workerName,
  onExit,
  started,
  userLogs,
  localflareLogs,
}: TuiProps & { started: boolean; userLogs: LogEntry[]; localflareLogs: LogEntry[] }) {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [showLocalflare, setShowLocalflare] = useState(false)

  const terminalHeight = stdout?.rows || 24
  const headerHeight = 6
  const logHeight = Math.max(10, terminalHeight - headerHeight)

  const displayUserLogs = userLogs.slice(-logHeight)
  const displayLocalflareLogs = localflareLogs.slice(-logHeight)

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      onExit()
      exit()
    }
    if (input === 'l') {
      setShowLocalflare((prev) => !prev)
    }
  })

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">⚡ Localflare </Text>
          {started ? (
            <Text color="green">● Running</Text>
          ) : (
            <Text color="yellow"><Spinner type="dots" /> Starting...</Text>
          )}
        </Box>
        <Text dimColor>
          <Text bold>L</Text>=logs <Text bold>C</Text>=clear <Text bold>Q</Text>=quit
        </Text>
      </Box>

      {started && (
        <Box paddingX={1}>
          <Text dimColor>App: </Text>
          <Text color="cyan">http://localhost:{workerPort}</Text>
          <Text>  </Text>
          <Text dimColor>Dashboard: </Text>
          <Text color="cyan">{dashboardUrl}</Text>
        </Box>
      )}

      <Box flexDirection="row" marginTop={1}>
        <Box
          flexDirection="column"
          width={showLocalflare ? '50%' : '100%'}
          borderStyle="single"
          borderColor="green"
          paddingX={1}
          minHeight={logHeight}
        >
          <Text bold color="green">🚀 {workerName}</Text>
          <Box flexDirection="column" marginTop={1}>
            {displayUserLogs.length === 0 ? (
              <Text dimColor>Waiting for requests...</Text>
            ) : (
              displayUserLogs.map((log) => (
                <Text key={log.id} wrap="truncate-end">{cleanLogLine(log.content)}</Text>
              ))
            )}
          </Box>
        </Box>

        {showLocalflare && (
          <Box
            flexDirection="column"
            width="50%"
            borderStyle="single"
            borderColor="blue"
            paddingX={1}
            minHeight={logHeight}
          >
            <Text bold color="blue">📊 Localflare API</Text>
            <Box flexDirection="column" marginTop={1}>
              {displayLocalflareLogs.length === 0 ? (
                <Text dimColor>No dashboard requests...</Text>
              ) : (
                displayLocalflareLogs.map((log) => (
                  <Text key={log.id} wrap="truncate-end">{cleanLogLine(log.content)}</Text>
                ))
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>
          {userLogs.length} app logs{showLocalflare ? ` | ${localflareLogs.length} api logs` : ' | Press L for Localflare logs'}
        </Text>
      </Box>
    </Box>
  )
}
