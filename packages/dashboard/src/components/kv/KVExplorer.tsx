import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  HardDriveIcon,
  Key01Icon,
  Add01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { kvApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard, StatsCardGroup } from "@/components/ui/stats-card"
import { SearchInput } from "@/components/ui/search-input"
import { DataTable, DataTableLoading, type Column } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

export function KVExplorer() {
  const [selectedNs, setSelectedNs] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [searchPrefix, setSearchPrefix] = useState("")
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  const queryClient = useQueryClient()

  const { data: namespaces, isLoading: loadingNamespaces } = useQuery({
    queryKey: ["kv-namespaces"],
    queryFn: kvApi.list,
  })

  const { data: keys, isLoading: loadingKeys } = useQuery({
    queryKey: ["kv-keys", selectedNs, searchPrefix],
    queryFn: () =>
      selectedNs ? kvApi.getKeys(selectedNs, searchPrefix || undefined) : null,
    enabled: !!selectedNs,
  })

  const { data: keyValue } = useQuery({
    queryKey: ["kv-value", selectedNs, selectedKey],
    queryFn: () =>
      selectedNs && selectedKey ? kvApi.getValue(selectedNs, selectedKey) : null,
    enabled: !!selectedNs && !!selectedKey,
  })

  const setValueMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => {
      if (!selectedNs) throw new Error("No namespace selected")
      return kvApi.setValue(selectedNs, key, value)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kv-keys", selectedNs] })
      setNewKey("")
      setNewValue("")
      setShowAddForm(false)
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: (key: string) => {
      if (!selectedNs) throw new Error("No namespace selected")
      return kvApi.deleteKey(selectedNs, key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kv-keys", selectedNs] })
      setSelectedKey(null)
    },
  })

  const keyColumns: Column<Record<string, unknown>>[] = [
    {
      key: "name",
      header: "Key",
      render: (value) => (
        <span className="font-mono text-xs">{String(value)}</span>
      ),
    },
    {
      key: "expiration",
      header: "Expiration",
      width: "150px",
      render: (value) =>
        value ? (
          <span className="text-xs text-muted-foreground">
            {new Date(Number(value) * 1000).toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Never</span>
        ),
    },
  ]

  if (loadingNamespaces) {
    return (
      <div className="p-6">
        <DataTableLoading />
      </div>
    )
  }

  if (!namespaces?.namespaces.length) {
    return (
      <div className="p-6">
        <PageHeader
          icon={HardDriveIcon}
          iconColor="text-kv"
          title="KV Namespaces"
          description="Manage your Workers KV key-value storage"
        />
        <EmptyState
          icon={HardDriveIcon}
          title="No KV namespaces configured"
          description="Add a KV namespace binding to your wrangler.toml to get started"
          className="mt-8"
        />
      </div>
    )
  }

  const keyCount = keys?.keys?.length ?? 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <PageHeader
          icon={HardDriveIcon}
          iconColor="text-kv"
          title="KV Namespaces"
          description="Manage your Workers KV key-value storage"
          actions={
            selectedNs && (
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <HugeiconsIcon icon={Add01Icon} className="size-4 mr-1.5" strokeWidth={2} />
                Add Key
              </Button>
            )
          }
        />

        {/* Stats */}
        <StatsCardGroup className="mt-6">
          <StatsCard
            icon={HardDriveIcon}
            iconColor="text-kv"
            label="Namespaces"
            value={namespaces.namespaces.length}
          />
          <StatsCard
            icon={Key01Icon}
            iconColor="text-muted-foreground"
            label="Keys"
            value={keyCount}
            description={selectedNs ? `in ${selectedNs}` : "Select a namespace"}
          />
        </StatsCardGroup>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Namespace List */}
        <div className="w-56 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 border-b border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Namespaces
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {namespaces.namespaces.map((ns) => (
                <button
                  key={ns.binding}
                  onClick={() => {
                    setSelectedNs(ns.binding)
                    setSelectedKey(null)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                    selectedNs === ns.binding
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={HardDriveIcon}
                    className={cn("size-4", selectedNs === ns.binding && "text-kv")}
                    strokeWidth={2}
                  />
                  {ns.binding}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedNs ? (
            <>
              {/* Search and Table */}
              <div className="p-4 border-b border-border">
                <SearchInput
                  value={searchPrefix}
                  onChange={setSearchPrefix}
                  placeholder="Filter by prefix..."
                  className="max-w-sm"
                />
              </div>

              <div className="flex-1 overflow-auto p-4">
                {showAddForm ? (
                  <div className="max-w-lg space-y-4 p-4 border border-border rounded-lg bg-card">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
                      Add New Key
                    </h3>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Key</label>
                      <Input
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="my-key"
                        className="mt-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Value</label>
                      <textarea
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="Enter value..."
                        className="mt-1.5 w-full min-h-32 p-3 rounded-md border border-input bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          setValueMutation.mutate({ key: newKey, value: newValue })
                        }
                        disabled={!newKey || !newValue || setValueMutation.isPending}
                      >
                        Save Key
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : loadingKeys ? (
                  <DataTableLoading />
                ) : keys?.keys?.length ? (
                  <div className="space-y-4">
                    <DataTable
                      columns={keyColumns}
                      data={keys.keys as unknown as Record<string, unknown>[]}
                      onRowClick={(row) => setSelectedKey(row.name as string)}
                      emptyIcon={Key01Icon}
                      emptyTitle="No keys found"
                      emptyDescription="Add a key to get started"
                      actions={(row) => (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => deleteKeyMutation.mutate(row.name as string)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-4 text-muted-foreground" strokeWidth={2} />
                        </Button>
                      )}
                    />

                    {/* Key Value Preview */}
                    {selectedKey && keyValue && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                          <div>
                            <h4 className="font-mono text-sm font-medium">{selectedKey}</h4>
                            {keyValue.metadata ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Metadata: {JSON.stringify(keyValue.metadata) as string}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteKeyMutation.mutate(selectedKey)}
                            disabled={deleteKeyMutation.isPending}
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="size-4 mr-1.5" strokeWidth={2} />
                            Delete
                          </Button>
                        </div>
                        <div className="p-4 bg-card">
                          <pre className="p-4 rounded-md bg-muted font-mono text-xs whitespace-pre-wrap break-all max-h-64 overflow-auto">
                            {typeof keyValue.value === "string"
                              ? keyValue.value
                              : JSON.stringify(keyValue.value, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={Key01Icon}
                    title="No keys found"
                    description={searchPrefix ? "No keys match your search" : "This namespace is empty"}
                    action={{
                      label: "Add Key",
                      onClick: () => setShowAddForm(true),
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <EmptyState
              icon={HardDriveIcon}
              title="Select a namespace"
              description="Choose a namespace from the sidebar to browse keys"
            />
          )}
        </div>
      </div>
    </div>
  )
}
