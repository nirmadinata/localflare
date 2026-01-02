/**
 * D1 Database Studio Types
 * 
 * Central type definitions for the D1 database explorer components.
 * Provides type safety across all D1-related features.
 */

// ============================================================================
// Database & Schema Types
// ============================================================================

/**
 * Represents a D1 database binding configuration
 */
export interface D1Database {
  binding: string
  database_name: string
  database_id?: string
}

/**
 * SQLite column information from PRAGMA table_info
 */
export interface D1Column {
  /** Column ID (position in table) */
  cid: number
  /** Column name */
  name: string
  /** SQLite type (TEXT, INTEGER, REAL, BLOB, NULL) */
  type: string
  /** Whether column has NOT NULL constraint */
  notnull: number
  /** Default value expression */
  dflt_value: unknown
  /** Primary key position (0 if not PK) */
  pk: number
}

/**
 * Table metadata from sqlite_master
 */
export interface D1Table {
  /** Table name */
  name: string
  /** CREATE TABLE SQL statement */
  sql: string
}

/**
 * Foreign key information from PRAGMA foreign_key_list
 */
export interface D1ForeignKey {
  id: number
  seq: number
  table: string
  from: string
  to: string
  on_update: string
  on_delete: string
  match: string
}

/**
 * Index information from PRAGMA index_list
 */
export interface D1Index {
  seq: number
  name: string
  unique: 0 | 1
  origin: 'c' | 'u' | 'pk'
  partial: 0 | 1
}

/**
 * Complete table schema with columns, keys, and indexes
 */
export interface D1TableSchema {
  name: string
  columns: D1Column[]
  primaryKeys: string[]
  foreignKeys: D1ForeignKey[]
  indexes: D1Index[]
  rowCount: number
}

// ============================================================================
// Row & Data Types
// ============================================================================

/**
 * Generic row data type
 */
export type D1Row = Record<string, unknown>

/**
 * Cell value types supported by SQLite
 */
export type D1CellValue = string | number | boolean | null | Uint8Array

/**
 * Editable cell state for inline editing
 */
export interface EditableCellState {
  rowIndex: number
  columnId: string
  originalValue: D1CellValue
  currentValue: D1CellValue
  isEditing: boolean
  isDirty: boolean
}

/**
 * Row selection state for bulk operations
 */
export interface RowSelectionState {
  [rowId: string]: boolean
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * SQL query execution result
 */
export interface D1QueryResult {
  success: boolean
  results?: D1Row[]
  meta?: {
    changes?: number
    last_row_id?: number
    duration?: number
  }
  error?: string
}

/**
 * Query history entry
 */
export interface QueryHistoryEntry {
  id: string
  sql: string
  database: string
  timestamp: number
  duration?: number
  rowCount?: number
  success: boolean
  error?: string
}

/**
 * Query execution options
 */
export interface QueryOptions {
  /** Parameters for prepared statements */
  params?: unknown[]
  /** Timeout in milliseconds */
  timeout?: number
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Sort direction for table columns
 */
export type SortDirection = 'asc' | 'desc' | null

/**
 * Column sort state
 */
export interface ColumnSort {
  columnId: string
  direction: SortDirection
}

/**
 * Column filter state
 */
export interface ColumnFilter {
  columnId: string
  value: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isNull' | 'isNotNull'
}

/**
 * Pagination state
 */
export interface PaginationState {
  pageIndex: number
  pageSize: number
  totalRows: number
  totalPages: number
}

/**
 * Table view state combining all UI state
 */
export interface TableViewState {
  sorting: ColumnSort[]
  filters: ColumnFilter[]
  pagination: PaginationState
  selectedRows: RowSelectionState
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Row mutation type for CRUD operations
 */
export type RowMutationType = 'insert' | 'update' | 'delete'

/**
 * Pending row mutation
 */
export interface PendingRowMutation {
  type: RowMutationType
  table: string
  /** Row identifier (primary key values) */
  rowId: Record<string, D1CellValue>
  /** Changed fields for update, all fields for insert */
  data?: Record<string, D1CellValue>
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest {
  type: 'delete' | 'update'
  table: string
  rowIds: Record<string, D1CellValue>[]
  /** For bulk update - fields to update */
  data?: Record<string, D1CellValue>
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for SQL Editor component
 */
export interface SQLEditorProps {
  /** Current SQL query */
  value: string
  /** Called when SQL changes */
  onChange: (sql: string) => void
  /** Called when user executes query (Cmd/Ctrl+Enter) */
  onExecute?: () => void
  /** Schema for autocomplete */
  schema?: D1TableSchema[]
  /** Placeholder text */
  placeholder?: string
  /** Whether editor is disabled */
  disabled?: boolean
  /** Editor height */
  height?: string | number
  /** Additional CSS classes */
  className?: string
}

/**
 * Props for Editable Data Table component
 */
export interface EditableDataTableProps {
  /** Table schema information */
  schema: D1TableSchema
  /** Current page of data */
  data: D1Row[]
  /** Loading state */
  isLoading?: boolean
  /** Pagination state */
  pagination: PaginationState
  /** Called when pagination changes */
  onPaginationChange: (pagination: Partial<PaginationState>) => void
  /** Called when a cell is edited */
  onCellEdit?: (rowIndex: number, columnId: string, value: D1CellValue) => void
  /** Called when row is deleted */
  onRowDelete?: (row: D1Row) => void
  /** Called when rows are selected */
  onSelectionChange?: (selectedRows: RowSelectionState) => void
  /** Whether inline editing is enabled */
  editable?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Props for Row Editor Dialog
 */
export interface RowEditorDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Table schema for form generation */
  schema: D1TableSchema
  /** Existing row data for edit mode (null for create) */
  row?: D1Row | null
  /** Called when row is saved */
  onSave: (data: Record<string, D1CellValue>) => void
  /** Whether save is in progress */
  isSaving?: boolean
}

/**
 * Props for Query History Panel
 */
export interface QueryHistoryProps {
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

/**
 * Props for Table Schema Panel
 */
export interface TableSchemaProps {
  /** Table schema information */
  schema: D1TableSchema
  /** Additional CSS classes */
  className?: string
}
