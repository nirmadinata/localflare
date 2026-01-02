/**
 * Query History Panel Component
 * 
 * Displays a list of recent SQL queries with:
 * - Query text and execution time
 * - Success/error status
 * - Click to re-run functionality
 * - Clear history option
 */

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock01Icon,
  Delete02Icon,
  Tick01Icon,
  Cancel01Icon,
  Database02Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { QueryHistoryEntry } from './types'

// ============================================================================
// Types
// ============================================================================

interface QueryHistoryProps {
  /** History entries */
  entries: QueryHistoryEntry[]
  /** Called when an entry is clicked to re-run */
  onSelect: (entry: QueryHistoryEntry) => void
  /** Called when history is cleared */
  onClear?: () => void
  /** Maximum entries to display */
  maxEntries?: number
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  if (seconds > 10) return `${seconds}s ago`
  return 'just now'
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms?: number): string {
  if (ms === undefined) return '-'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Truncate SQL for display
 */
function truncateSQL(sql: string, maxLength = 100): string {
  // Normalize whitespace
  const normalized = sql.replace(/\s+/g, ' ').trim()
  
  if (normalized.length <= maxLength) return normalized
  return normalized.slice(0, maxLength) + '...'
}

/**
 * Get query type badge color
 */
function getQueryTypeColor(sql: string): string {
  const upper = sql.trim().toUpperCase()
  
  if (upper.startsWith('SELECT')) return 'bg-blue-500/10 text-blue-500'
  if (upper.startsWith('INSERT')) return 'bg-green-500/10 text-green-500'
  if (upper.startsWith('UPDATE')) return 'bg-amber-500/10 text-amber-500'
  if (upper.startsWith('DELETE')) return 'bg-red-500/10 text-red-500'
  if (upper.startsWith('CREATE')) return 'bg-purple-500/10 text-purple-500'
  if (upper.startsWith('DROP')) return 'bg-red-500/10 text-red-500'
  if (upper.startsWith('ALTER')) return 'bg-orange-500/10 text-orange-500'
  
  return 'bg-muted text-muted-foreground'
}

/**
 * Get query type label
 */
function getQueryType(sql: string): string {
  const upper = sql.trim().toUpperCase()
  const firstWord = upper.split(/\s+/)[0]
  return firstWord || 'SQL'
}

// ============================================================================
// History Entry Component
// ============================================================================

interface HistoryEntryProps {
  entry: QueryHistoryEntry
  onSelect: () => void
}

function HistoryEntryItem({ entry, onSelect }: HistoryEntryProps) {
  const queryType = getQueryType(entry.sql)
  const typeColor = getQueryTypeColor(entry.sql)
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2.5",
        "hover:bg-muted/50 transition-colors",
        "border-b border-border last:border-b-0",
        "group"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Status indicator */}
        <div className={cn(
          "size-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          entry.success ? "bg-emerald-500/10" : "bg-destructive/10"
        )}>
          <HugeiconsIcon 
            icon={entry.success ? Tick01Icon : Cancel01Icon} 
            className={cn(
              "size-2.5",
              entry.success ? "text-emerald-500" : "text-destructive"
            )} 
            strokeWidth={2} 
          />
        </div>
        
        {/* Query content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={cn(
              "text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0",
              typeColor
            )}>
              {queryType}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
              <HugeiconsIcon icon={Database02Icon} className="size-2.5" />
              {entry.database}
            </span>
          </div>
          
          <p className="text-[11px] font-mono text-foreground/90 leading-relaxed break-all line-clamp-2">
            {truncateSQL(entry.sql, 80)}
          </p>
          
          {entry.error && (
            <p className="text-[10px] text-destructive mt-1 line-clamp-1 break-all">
              {entry.error}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-0.5 shrink-0">
              <HugeiconsIcon icon={Clock01Icon} className="size-2.5" />
              {formatRelativeTime(entry.timestamp)}
            </span>
            {entry.duration !== undefined && (
              <span className="shrink-0">{formatDuration(entry.duration)}</span>
            )}
            {entry.rowCount !== undefined && entry.success && (
              <span className="shrink-0">{entry.rowCount} rows</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function QueryHistory({
  entries,
  onSelect,
  onClear,
  maxEntries = 50,
  className,
}: QueryHistoryProps) {
  // Limit entries to max
  const displayEntries = useMemo(
    () => entries.slice(0, maxEntries),
    [entries, maxEntries]
  )
  
  if (displayEntries.length === 0) {
    return (
      <div className={cn(
        "border border-border rounded-lg p-6 text-center",
        className
      )}>
        <HugeiconsIcon 
          icon={Clock01Icon} 
          className="size-8 text-muted-foreground/30 mx-auto mb-2" 
          strokeWidth={1.5} 
        />
        <p className="text-sm text-muted-foreground">No query history</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Executed queries will appear here
        </p>
      </div>
    )
  }
  
  return (
    <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon 
            icon={Clock01Icon} 
            className="size-3.5 text-muted-foreground" 
            strokeWidth={2} 
          />
          <span className="text-xs font-medium">Query History</span>
          <span className="text-[10px] text-muted-foreground">
            ({displayEntries.length})
          </span>
        </div>
        
        {onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3 mr-1" strokeWidth={2} />
            Clear
          </Button>
        )}
      </div>
      
      {/* Entries list */}
      <ScrollArea className="max-h-80">
        {displayEntries.map(entry => (
          <HistoryEntryItem
            key={entry.id}
            entry={entry}
            onSelect={() => onSelect(entry)}
          />
        ))}
      </ScrollArea>
    </div>
  )
}

export default QueryHistory
