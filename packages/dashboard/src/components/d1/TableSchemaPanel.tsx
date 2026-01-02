/**
 * Table Schema Panel Component
 * 
 * Displays detailed table schema information including:
 * - Column names, types, and constraints
 * - Primary keys and foreign keys
 * - Indexes and statistics
 */

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Key01Icon,
  Database02Icon,
  Link01Icon,
  TextNumberSignIcon,
  TextIcon,
  ToggleOnIcon,
  Calendar01Icon,
  FileIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import type { D1TableSchema, D1Column } from './types'

// ============================================================================
// Types
// ============================================================================

interface TableSchemaProps {
  /** Table schema information */
  schema: D1TableSchema
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get icon for column type
 */
function getTypeIcon(type: string) {
  const upperType = type.toUpperCase()
  
  if (upperType.includes('INT')) return TextNumberSignIcon
  if (upperType.includes('TEXT') || upperType.includes('VARCHAR') || upperType.includes('CHAR')) return TextIcon
  if (upperType.includes('REAL') || upperType.includes('FLOAT') || upperType.includes('DOUBLE')) return TextNumberSignIcon
  if (upperType.includes('BOOL')) return ToggleOnIcon
  if (upperType.includes('DATE') || upperType.includes('TIME')) return Calendar01Icon
  if (upperType.includes('BLOB')) return FileIcon
  
  return Database02Icon
}

/**
 * Get human-readable type label
 */
function getTypeLabel(type: string): string {
  const upperType = type.toUpperCase()
  
  if (upperType === 'INTEGER') return 'Integer'
  if (upperType === 'TEXT') return 'Text'
  if (upperType === 'REAL') return 'Real'
  if (upperType === 'BLOB') return 'Blob'
  if (upperType === 'BOOLEAN') return 'Boolean'
  if (upperType.includes('VARCHAR')) return 'Varchar'
  
  return type
}

/**
 * Get constraint badges for a column
 */
function getConstraints(column: D1Column, isPrimaryKey: boolean): string[] {
  const constraints: string[] = []
  
  if (isPrimaryKey) constraints.push('PRIMARY KEY')
  if (column.notnull) constraints.push('NOT NULL')
  if (column.dflt_value !== null) constraints.push(`DEFAULT`)
  
  return constraints
}

// ============================================================================
// Column Row Component
// ============================================================================

interface ColumnRowProps {
  column: D1Column
  isPrimaryKey: boolean
  isLast: boolean
}

function ColumnRow({ column, isPrimaryKey, isLast }: ColumnRowProps) {
  const TypeIcon = getTypeIcon(column.type)
  const constraints = getConstraints(column, isPrimaryKey)
  
  return (
    <div 
      className={cn(
        "grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-3",
        "hover:bg-muted/50 transition-colors",
        !isLast && "border-b border-border"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "size-8 rounded-md flex items-center justify-center shrink-0",
        isPrimaryKey ? "bg-primary/10" : "bg-muted"
      )}>
        <HugeiconsIcon 
          icon={isPrimaryKey ? Key01Icon : TypeIcon} 
          className={cn(
            "size-4",
            isPrimaryKey ? "text-primary" : "text-muted-foreground"
          )} 
          strokeWidth={2} 
        />
      </div>
      
      {/* Column info */}
      <div className="min-w-0 overflow-hidden">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-medium text-sm truncate",
            isPrimaryKey && "text-primary"
          )}>
            {column.name}
          </span>
          <span className="text-xs text-muted-foreground font-mono uppercase shrink-0">
            {getTypeLabel(column.type)}
          </span>
        </div>
        
        {/* Constraints */}
        {constraints.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {constraints.map(constraint => (
              <span 
                key={constraint}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
                  constraint === 'PRIMARY KEY' 
                    ? "bg-primary/10 text-primary"
                    : constraint === 'NOT NULL'
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {constraint}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Default value */}
      {column.dflt_value !== null ? (
        <div className="text-right shrink-0">
          <div className="text-[10px] text-muted-foreground mb-0.5">Default</div>
          <code className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded inline-block max-w-32 truncate">
            {String(column.dflt_value)}
          </code>
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TableSchemaPanel({ schema, className }: TableSchemaProps) {
  // Sort columns: primary keys first, then by position
  const sortedColumns = useMemo(() => {
    return [...schema.columns].sort((a, b) => {
      const aIsPK = schema.primaryKeys.includes(a.name)
      const bIsPK = schema.primaryKeys.includes(b.name)
      
      if (aIsPK && !bIsPK) return -1
      if (!aIsPK && bIsPK) return 1
      return a.cid - b.cid
    })
  }, [schema.columns, schema.primaryKeys])
  
  return (
    <div className={cn("border border-border rounded-lg overflow-hidden flex flex-col", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-muted/50 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon 
              icon={Database02Icon} 
              className="size-4 text-d1" 
              strokeWidth={2} 
            />
            <span className="font-medium text-sm">{schema.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{schema.columns.length} columns</span>
            <span>•</span>
            <span>{schema.rowCount.toLocaleString()} rows</span>
          </div>
        </div>
      </div>
      
      {/* Columns list */}
      <div className="flex-1 overflow-auto">
        <div>
          {sortedColumns.map((column, index) => (
            <ColumnRow
              key={column.name}
              column={column}
              isPrimaryKey={schema.primaryKeys.includes(column.name)}
              isLast={index === sortedColumns.length - 1}
            />
          ))}
        </div>
      </div>
      
      {/* Footer stats */}
      <div className="px-4 py-2.5 bg-muted/30 border-t border-border shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          {schema.primaryKeys.length > 0 && (
            <div className="flex items-center gap-1">
              <HugeiconsIcon icon={Key01Icon} className="size-3" strokeWidth={2} />
              <span>Primary: {schema.primaryKeys.join(', ')}</span>
            </div>
          )}
          {schema.indexes.length > 0 && (
            <div className="flex items-center gap-1">
              <HugeiconsIcon icon={Link01Icon} className="size-3" strokeWidth={2} />
              <span>{schema.indexes.length} indexes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TableSchemaPanel
