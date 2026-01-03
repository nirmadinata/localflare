import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { LogPanel } from './LogPanel.js'
import { parseLogs, type ParsedLog } from './log-parser.js'

interface AppProps {
  workerPort: number
  dashboardUrl: string
  workerName: string
  onExit: () => void
}

export function App({ workerPort, dashboardUrl, workerName, onExit }: AppProps) {
  const { exit } = useApp()
  const [started, setStarted] = useState(false)
  const [userLogs, setUserLogs] = useState<string[]>([])
  const [localflareLogs, setLocalflareLogs] = useState<string[]>([])
  const [showLocalflare, setShowLocalflare] = useState(false)

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

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box
        borderStyle="double"
        borderColor="cyan"
        paddingX={2}
        justifyContent="space-between"
      >
        <Box>
          <Text bold color="cyan">
            ⚡ Localflare
          </Text>
          {started ? (
            <Text color="green"> ● Running</Text>
          ) : (
            <Text color="yellow">
              {' '}
              <Spinner type="dots" /> Starting...
            </Text>
          )}
        </Box>
        <Box>
          <Text dimColor>
            Press <Text bold>L</Text> toggle localflare logs | <Text bold>C</Text> clear |{' '}
            <Text bold>Q</Text> quit
          </Text>
        </Box>
      </Box>

      {/* Status bar */}
      {started && (
        <Box paddingX={1} marginY={1}>
          <Text>
            <Text dimColor>App:</Text> <Text color="cyan">http://localhost:{workerPort}</Text>
            {'  '}
            <Text dimColor>Dashboard:</Text> <Text color="cyan">{dashboardUrl}</Text>
          </Text>
        </Box>
      )}

      {/* Log panels */}
      <Box flexGrow={1} flexDirection="row">
        {/* User logs - always visible */}
        <LogPanel
          title={`🚀 ${workerName}`}
          logs={userLogs}
          color="green"
          width={showLocalflare ? '50%' : '100%'}
        />

        {/* Localflare logs - togglable */}
        {showLocalflare && (
          <LogPanel
            title="📊 Localflare API"
            logs={localflareLogs}
            color="blue"
            width="50%"
          />
        )}
      </Box>

      {/* Footer */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>
          {userLogs.length} user logs | {localflareLogs.length} localflare logs
        </Text>
      </Box>
    </Box>
  )
}

// Export state updater type for external use
export interface TuiState {
  setStarted: (started: boolean) => void
  addLogs: (output: string) => void
}

export function createTuiState(
  setStarted: React.Dispatch<React.SetStateAction<boolean>>,
  setUserLogs: React.Dispatch<React.SetStateAction<string[]>>,
  setLocalflareLogs: React.Dispatch<React.SetStateAction<string[]>>
): TuiState {
  return {
    setStarted: (started: boolean) => setStarted(started),
    addLogs: (output: string) => {
      const parsed = parseLogs(output)
      for (const log of parsed) {
        if (log.category === 'user') {
          setUserLogs((prev) => [...prev, log.content])
        } else if (log.category === 'localflare') {
          setLocalflareLogs((prev) => [...prev, log.content])
        }
        // 'system' logs are ignored
      }
    },
  }
}
