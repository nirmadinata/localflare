/**
 * Editable Data Table Component
 * 
 * A full-featured data table built on TanStack Table with:
 * - Inline cell editing
 * - Row selection for bulk operations
 * - Sorting and filtering
 * - Pagination
 * - Responsive design
 */

import { useMemo, useCallback, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  Delete02Icon,
  Edit02Icon,
  Copy01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EditableCell } from './EditableCell'
import type { D1Row, D1CellValue, D1TableSchema, PaginationState } from './types'

// ============================================================================
// Types
// ============================================================================

interface EditableDataTableProps {
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
  onCellEdit?: (rowId: string, columnId: string, value: D1CellValue) => void
  /** Called when row is deleted */
  onRowDelete?: (row: D1Row) => void
  /** Called when row edit button clicked */
  onRowEdit?: (row: D1Row) => void
  /** Whether inline editing is enabled */
  editable?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Pagination Component
// ============================================================================

interface PaginationControlsProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function PaginationControls({ 
  pagination, 
  onPageChange, 
  onPageSizeChange 
}: PaginationControlsProps) {
  const { pageIndex, pageSize, totalRows, totalPages } = pagination
  const startRow = pageIndex * pageSize + 1
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)
  
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {totalRows > 0 ? (
            <>Showing {startRow}-{endRow} of {totalRows} rows</>
          ) : (
            'No rows'
          )}
        </span>
        <span className="text-border">|</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="bg-transparent border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {[25, 50, 100, 250].map(size => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={pageIndex === 0}
          className="h-7 px-2 text-xs"
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex === 0}
          className="h-7 px-2 text-xs"
        >
          Prev
        </Button>
        <span className="px-3 text-xs text-muted-foreground">
          Page {pageIndex + 1} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= totalPages - 1}
          className="h-7 px-2 text-xs"
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={pageIndex >= totalPages - 1}
          className="h-7 px-2 text-xs"
        >
          Last
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Row Actions Component
// ============================================================================

interface RowActionsProps {
  row: D1Row
  onEdit?: () => void
  onDelete?: () => void
}

function RowActions({ row, onEdit, onDelete }: RowActionsProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [row])
  
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onEdit}
          title="Edit row"
        >
          <HugeiconsIcon icon={Edit02Icon} className="size-3.5" strokeWidth={2} />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
        title="Copy as JSON"
      >
        <HugeiconsIcon 
          icon={copied ? Tick01Icon : Copy01Icon} 
          className={cn("size-3.5", copied && "text-green-500")} 
          strokeWidth={2} 
        />
      </Button>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:text-destructive"
          onClick={onDelete}
          title="Delete row"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" strokeWidth={2} />
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function EditableDataTable({
  schema,
  data,
  isLoading = false,
  pagination,
  onPaginationChange,
  onCellEdit,
  onRowDelete,
  onRowEdit,
  editable = true,
  className,
}: EditableDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  
  // Get primary key column(s) for row identification
  const getRowId = useCallback((row: D1Row): string => {
    if (schema.primaryKeys.length === 0) {
      return JSON.stringify(row)
    }
    if (schema.primaryKeys.length === 1) {
      return String(row[schema.primaryKeys[0]])
    }
    return schema.primaryKeys.map(pk => row[pk]).join('::')
  }, [schema.primaryKeys])
  
  // Build columns from schema
  const columns = useMemo<ColumnDef<D1Row>[]>(() => {
    const cols: ColumnDef<D1Row>[] = [
      // Selection column
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="rounded border-border"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-border"
          />
        ),
        size: 40,
        enableSorting: false,
      },
    ]
    
    // Data columns
    for (const col of schema.columns) {
      const isPK = schema.primaryKeys.includes(col.name)
      
      cols.push({
        id: col.name,
        accessorKey: col.name,
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting()}
          >
            <span className={cn(isPK && 'text-primary')}>{col.name}</span>
            {isPK && <span className="text-[9px] text-primary/60 ml-0.5">PK</span>}
            <span className="text-[9px] text-muted-foreground/60 ml-1">
              {col.type.toUpperCase()}
            </span>
            {column.getIsSorted() === 'asc' && (
              <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
            )}
            {column.getIsSorted() === 'desc' && (
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const value = row.getValue(col.name) as D1CellValue
          const rowId = getRowId(row.original)
          
          return (
            <EditableCell
              value={value}
              column={col}
              editable={editable}
              isPrimaryKey={isPK}
              onSave={(newValue) => {
                onCellEdit?.(rowId, col.name, newValue)
              }}
            />
          )
        },
        enableSorting: true,
      })
    }
    
    // Actions column
    cols.push({
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={onRowEdit ? () => onRowEdit(row.original) : undefined}
          onDelete={onRowDelete ? () => onRowDelete(row.original) : undefined}
        />
      ),
      size: 100,
      enableSorting: false,
    })
    
    return cols
  }, [schema, editable, getRowId, onCellEdit, onRowDelete, onRowEdit])
  
  // Initialize table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => getRowId(row),
    enableRowSelection: true,
  })
  
  // Handle pagination
  const handlePageChange = useCallback((pageIndex: number) => {
    onPaginationChange({ pageIndex })
  }, [onPaginationChange])
  
  const handlePageSizeChange = useCallback((pageSize: number) => {
    onPaginationChange({ pageSize, pageIndex: 0 })
  }, [onPaginationChange])
  
  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
        <div className="animate-pulse">
          <div className="h-10 bg-muted/50 border-b border-border" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 border-b border-border flex">
              {[...Array(schema.columns.length + 2)].map((_, j) => (
                <div key={j} className="flex-1 p-3">
                  <div className="h-4 bg-muted rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Selected rows toolbar
  const selectedCount = Object.keys(rowSelection).length
  
  return (
    <div className={cn("border border-border rounded-lg overflow-hidden flex flex-col", className)}>
      {/* Bulk actions toolbar */}
      {selectedCount > 0 && (
        <div className="px-4 py-2 bg-primary/10 border-b border-border flex items-center gap-3">
          <span className="text-xs font-medium">
            {selectedCount} row{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => {
              // Handle bulk delete
              const selectedRows = table.getSelectedRowModel().rows
              selectedRows.forEach(row => onRowDelete?.(row.original))
              setRowSelection({})
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5 mr-1" strokeWidth={2} />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setRowSelection({})}
          >
            Clear Selection
          </Button>
        </div>
      )}
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap",
                      header.column.id === 'select' && 'w-10',
                      header.column.id === 'actions' && 'w-24',
                    )}
                    style={{ 
                      width: header.getSize() !== 150 ? header.getSize() : undefined 
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No data in this table
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className={cn(
                    "group transition-colors hover:bg-muted/30",
                    row.getIsSelected() && "bg-primary/5"
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-2 whitespace-nowrap",
                        cell.column.id === 'select' && 'w-10',
                        cell.column.id === 'actions' && 'w-24',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <PaginationControls
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  )
}

export default EditableDataTable
