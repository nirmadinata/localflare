import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Database02Icon,
  PlayIcon,
  Table01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { d1Api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard, StatsCardGroup } from "@/components/ui/stats-card"
import { DataTable, DataTableLoading, type Column } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

export function D1Explorer() {
  const [selectedDb, setSelectedDb] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [sqlQuery, setSqlQuery] = useState("")
  const [queryResult, setQueryResult] = useState<unknown[] | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: databases, isLoading: loadingDatabases } = useQuery({
    queryKey: ["d1-databases"],
    queryFn: d1Api.list,
  })

  const { data: schema } = useQuery({
    queryKey: ["d1-schema", selectedDb],
    queryFn: () => (selectedDb ? d1Api.getSchema(selectedDb) : null),
    enabled: !!selectedDb,
  })

  const { data: tableData, isLoading: loadingTableData } = useQuery({
    queryKey: ["d1-table-data", selectedDb, selectedTable],
    queryFn: () =>
      selectedDb && selectedTable ? d1Api.getRows(selectedDb, selectedTable) : null,
    enabled: !!selectedDb && !!selectedTable,
  })

  const queryMutation = useMutation({
    mutationFn: ({ sql }: { sql: string }) => {
      if (!selectedDb) throw new Error("No database selected")
      return d1Api.query(selectedDb, sql)
    },
    onSuccess: (data) => {
      setQueryResult(data.results ?? [])
      setQueryError(null)
      queryClient.invalidateQueries({ queryKey: ["d1-table-data"] })
    },
    onError: (error) => {
      setQueryError(String(error))
      setQueryResult(null)
    },
  })

  const handleRunQuery = () => {
    if (sqlQuery.trim()) {
      queryMutation.mutate({ sql: sqlQuery })
    }
  }

  // Generate columns from data
  const generateColumns = (rows: Record<string, unknown>[]): Column<Record<string, unknown>>[] => {
    if (!rows.length) return []
    return Object.keys(rows[0]).map((key) => ({
      key,
      header: key,
      render: (value) =>
        value === null ? (
          <span className="text-muted-foreground italic text-xs">NULL</span>
        ) : (
          <span className="font-mono text-xs">{String(value)}</span>
        ),
    }))
  }

  if (loadingDatabases) {
    return (
      <div className="p-6">
        <DataTableLoading />
      </div>
    )
  }

  if (!databases?.databases.length) {
    return (
      <div className="p-6">
        <PageHeader
          icon={Database02Icon}
          iconColor="text-d1"
          title="D1 Databases"
          description="Manage your D1 SQLite databases"
        />
        <EmptyState
          icon={Database02Icon}
          title="No D1 databases configured"
          description="Add a D1 database binding to your wrangler.toml to get started"
          className="mt-8"
        />
      </div>
    )
  }

  const tableCount = schema?.tables?.length ?? 0
  const rowCount = tableData?.rows?.length ?? 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <PageHeader
          icon={Database02Icon}
          iconColor="text-d1"
          title="D1 Databases"
          description="Manage your D1 SQLite databases"
        />

        {/* Stats */}
        <StatsCardGroup className="mt-6">
          <StatsCard
            icon={Database02Icon}
            iconColor="text-d1"
            label="Databases"
            value={databases.databases.length}
          />
          <StatsCard
            icon={Table01Icon}
            iconColor="text-muted-foreground"
            label="Tables"
            value={tableCount}
            description={selectedDb ? `in ${selectedDb}` : "Select a database"}
          />
          <StatsCard
            icon={Table01Icon}
            iconColor="text-muted-foreground"
            label="Rows"
            value={rowCount}
            description={selectedTable ? `in ${selectedTable}` : "Select a table"}
          />
        </StatsCardGroup>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Database & Table List */}
        <div className="w-56 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 border-b border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Databases
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {databases.databases.map((db) => (
                <div key={db.binding}>
                  <button
                    onClick={() => {
                      setSelectedDb(db.binding)
                      setSelectedTable(null)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                      selectedDb === db.binding
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <HugeiconsIcon
                      icon={Database02Icon}
                      className={cn("size-4", selectedDb === db.binding && "text-d1")}
                      strokeWidth={2}
                    />
                    {db.binding}
                  </button>

                  {selectedDb === db.binding && schema?.tables && (
                    <div className="ml-3 mt-1 pl-3 border-l border-border space-y-0.5">
                      {schema.tables.map((table) => (
                        <button
                          key={table.name}
                          onClick={() => setSelectedTable(table.name)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors",
                            selectedTable === table.name
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <HugeiconsIcon
                            icon={Table01Icon}
                            className="size-3"
                            strokeWidth={2}
                          />
                          {table.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs defaultValue="data" className="flex-1 flex flex-col">
            <div className="border-b border-border px-4 bg-muted/30">
              <TabsList className="h-11 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="data"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0"
                >
                  Data
                </TabsTrigger>
                <TabsTrigger
                  value="query"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0"
                >
                  SQL Query
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="data" className="flex-1 m-0 overflow-auto p-4">
              {loadingTableData ? (
                <DataTableLoading />
              ) : selectedTable && tableData?.rows ? (
                <DataTable
                  columns={generateColumns(tableData.rows)}
                  data={tableData.rows}
                  emptyIcon={Table01Icon}
                  emptyTitle="No rows"
                  emptyDescription="This table is empty"
                  actions={() => (
                    <Button variant="ghost" size="icon" className="size-7">
                      <HugeiconsIcon icon={Delete02Icon} className="size-4 text-muted-foreground" strokeWidth={2} />
                    </Button>
                  )}
                />
              ) : (
                <EmptyState
                  icon={Table01Icon}
                  title="Select a table"
                  description="Choose a table from the sidebar to view its data"
                />
              )}
            </TabsContent>

            <TabsContent value="query" className="flex-1 m-0 flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex gap-2">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM users LIMIT 10"
                    className="flex-1 min-h-30 p-3 rounded-md border border-input bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {selectedDb ? `Database: ${selectedDb}` : "Select a database first"}
                  </span>
                  <Button
                    onClick={handleRunQuery}
                    disabled={!selectedDb || !sqlQuery.trim() || queryMutation.isPending}
                    size="sm"
                  >
                    <HugeiconsIcon icon={PlayIcon} className="size-4 mr-1.5" strokeWidth={2} />
                    Run Query
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {queryError && (
                  <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {queryError}
                  </div>
                )}
                {queryResult && (
                  <>
                    <DataTable
                      columns={generateColumns(queryResult as Record<string, unknown>[])}
                      data={queryResult as Record<string, unknown>[]}
                      emptyTitle="No results"
                      emptyDescription="Query returned no rows"
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      {queryResult.length} row(s) returned
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
