import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Layers01Icon } from "@hugeicons/core-free-icons"
import { bindingsApi } from "@/lib/api"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard, StatsCardGroup } from "@/components/ui/stats-card"
import { DataTable, DataTableLoading, type Column } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"

export function DOExplorer() {
  const { data: bindings, isLoading } = useQuery({
    queryKey: ["bindings"],
    queryFn: bindingsApi.getAll,
  })

  const doColumns: Column<Record<string, unknown>>[] = [
    {
      key: "binding",
      header: "Binding",
      render: (value) => (
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Layers01Icon} className="size-4 text-do" strokeWidth={2} />
          <span className="font-medium text-sm">{String(value)}</span>
        </div>
      ),
    },
    {
      key: "class_name",
      header: "Class Name",
      render: (value) => <span className="font-mono text-xs">{String(value)}</span>,
    },
    {
      key: "script_name",
      header: "Script",
      render: (value) => (
        value ? (
          <span className="text-xs text-muted-foreground">{String(value)}</span>
        ) : (
          <span className="text-xs text-muted-foreground italic">Local</span>
        )
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="p-6">
        <DataTableLoading />
      </div>
    )
  }

  const durableObjects = bindings?.bindings.durableObjects ?? []

  if (!durableObjects.length) {
    return (
      <div className="p-6">
        <PageHeader
          icon={Layers01Icon}
          iconColor="text-do"
          title="Durable Objects"
          description="Manage your Durable Objects classes"
        />
        <EmptyState
          icon={Layers01Icon}
          title="No Durable Objects configured"
          description="Add a Durable Object binding to your wrangler.toml to get started"
          className="mt-8"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <PageHeader
          icon={Layers01Icon}
          iconColor="text-do"
          title="Durable Objects"
          description="Manage your Durable Objects classes"
        />

        {/* Stats */}
        <StatsCardGroup className="mt-6">
          <StatsCard
            icon={Layers01Icon}
            iconColor="text-do"
            label="DO Classes"
            value={durableObjects.length}
          />
        </StatsCardGroup>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <DataTable
          columns={doColumns}
          data={durableObjects as unknown as Record<string, unknown>[]}
          emptyIcon={Layers01Icon}
          emptyTitle="No Durable Objects"
          emptyDescription="Configure Durable Objects in your wrangler.toml"
        />

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            Durable Object inspection coming soon. You can interact with DO instances through your worker's fetch handler.
          </p>
        </div>
      </div>
    </div>
  )
}
