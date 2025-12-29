import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Folder01Icon,
  File01Icon,
  Delete02Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons"
import { r2Api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard, StatsCardGroup } from "@/components/ui/stats-card"
import { SearchInput } from "@/components/ui/search-input"
import { DataTable, DataTableLoading, type Column } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { cn, formatBytes, formatDate } from "@/lib/utils"

export function R2Explorer() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<string | null>(null)
  const [searchPrefix, setSearchPrefix] = useState("")

  const queryClient = useQueryClient()

  const { data: buckets, isLoading: loadingBuckets } = useQuery({
    queryKey: ["r2-buckets"],
    queryFn: r2Api.list,
  })

  const { data: objects, isLoading: loadingObjects } = useQuery({
    queryKey: ["r2-objects", selectedBucket, searchPrefix],
    queryFn: () =>
      selectedBucket
        ? r2Api.getObjects(selectedBucket, searchPrefix || undefined)
        : null,
    enabled: !!selectedBucket,
  })

  const { data: objectMeta } = useQuery({
    queryKey: ["r2-object-meta", selectedBucket, selectedObject],
    queryFn: () =>
      selectedBucket && selectedObject
        ? r2Api.getObjectMeta(selectedBucket, selectedObject)
        : null,
    enabled: !!selectedBucket && !!selectedObject,
  })

  const deleteObjectMutation = useMutation({
    mutationFn: (key: string) => {
      if (!selectedBucket) throw new Error("No bucket selected")
      return r2Api.deleteObject(selectedBucket, key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["r2-objects", selectedBucket] })
      setSelectedObject(null)
    },
  })

  const handleDownload = () => {
    if (selectedBucket && selectedObject) {
      window.open(
        `/api/r2/${selectedBucket}/objects/${encodeURIComponent(selectedObject)}`,
        "_blank"
      )
    }
  }

  const objectColumns: Column<Record<string, unknown>>[] = [
    {
      key: "key",
      header: "Name",
      render: (value) => (
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={File01Icon} className="size-4 text-muted-foreground" strokeWidth={2} />
          <span className="font-mono text-xs truncate max-w-xs">{String(value)}</span>
        </div>
      ),
    },
    {
      key: "size",
      header: "Size",
      width: "100px",
      align: "right",
      render: (value) => (
        <span className="text-xs text-muted-foreground">{formatBytes(Number(value))}</span>
      ),
    },
  ]

  if (loadingBuckets) {
    return (
      <div className="p-6">
        <DataTableLoading />
      </div>
    )
  }

  if (!buckets?.buckets.length) {
    return (
      <div className="p-6">
        <PageHeader
          icon={Folder01Icon}
          iconColor="text-r2"
          title="R2 Buckets"
          description="Manage your R2 object storage"
        />
        <EmptyState
          icon={Folder01Icon}
          title="No R2 buckets configured"
          description="Add an R2 bucket binding to your wrangler.toml to get started"
          className="mt-8"
        />
      </div>
    )
  }

  const objectCount = objects?.objects?.length ?? 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <PageHeader
          icon={Folder01Icon}
          iconColor="text-r2"
          title="R2 Buckets"
          description="Manage your R2 object storage"
        />

        {/* Stats */}
        <StatsCardGroup className="mt-6">
          <StatsCard
            icon={Folder01Icon}
            iconColor="text-r2"
            label="Buckets"
            value={buckets.buckets.length}
          />
          <StatsCard
            icon={File01Icon}
            iconColor="text-muted-foreground"
            label="Objects"
            value={objectCount}
            description={selectedBucket ? `in ${selectedBucket}` : "Select a bucket"}
          />
        </StatsCardGroup>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Bucket List */}
        <div className="w-56 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 border-b border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Buckets
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {buckets.buckets.map((bucket) => (
                <button
                  key={bucket.binding}
                  onClick={() => {
                    setSelectedBucket(bucket.binding)
                    setSelectedObject(null)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                    selectedBucket === bucket.binding
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    className={cn("size-4", selectedBucket === bucket.binding && "text-r2")}
                    strokeWidth={2}
                  />
                  {bucket.binding}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedBucket ? (
            <>
              {/* Search */}
              <div className="p-4 border-b border-border">
                <SearchInput
                  value={searchPrefix}
                  onChange={setSearchPrefix}
                  placeholder="Filter by prefix..."
                  className="max-w-sm"
                />
              </div>

              <div className="flex-1 overflow-auto p-4">
                {loadingObjects ? (
                  <DataTableLoading />
                ) : objects?.objects?.length ? (
                  <div className="space-y-4">
                    <DataTable
                      columns={objectColumns}
                      data={objects.objects as unknown as Record<string, unknown>[]}
                      onRowClick={(row) => setSelectedObject(row.key as string)}
                      emptyIcon={File01Icon}
                      emptyTitle="No objects found"
                      emptyDescription="Upload files to this bucket to get started"
                      actions={(row) => (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => deleteObjectMutation.mutate(row.key as string)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-4 text-muted-foreground" strokeWidth={2} />
                        </Button>
                      )}
                    />

                    {/* Object Details */}
                    {selectedObject && objectMeta && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                          <div>
                            <h4 className="font-mono text-sm font-medium truncate max-w-md">{selectedObject}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatBytes(objectMeta.size)} • Uploaded {formatDate(objectMeta.uploaded)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownload}>
                              <HugeiconsIcon icon={Download01Icon} className="size-4 mr-1.5" strokeWidth={2} />
                              Download
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteObjectMutation.mutate(selectedObject)}
                              disabled={deleteObjectMutation.isPending}
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="size-4 mr-1.5" strokeWidth={2} />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 bg-card">
                          <h5 className="text-xs font-medium text-muted-foreground mb-2">Metadata</h5>
                          <div className="p-3 rounded-md bg-muted font-mono text-xs space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ETag</span>
                              <span>{objectMeta.etag}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Content-Type</span>
                              <span>{objectMeta.httpMetadata?.contentType || "application/octet-stream"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Size</span>
                              <span>{formatBytes(objectMeta.size)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Uploaded</span>
                              <span>{formatDate(objectMeta.uploaded)}</span>
                            </div>
                          </div>

                          {objectMeta.customMetadata && Object.keys(objectMeta.customMetadata).length > 0 && (
                            <>
                              <h5 className="text-xs font-medium text-muted-foreground mb-2 mt-4">Custom Metadata</h5>
                              <div className="p-3 rounded-md bg-muted font-mono text-xs space-y-1.5">
                                {Object.entries(objectMeta.customMetadata).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}</span>
                                    <span>{value}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={File01Icon}
                    title="No objects found"
                    description={searchPrefix ? "No objects match your search" : "This bucket is empty"}
                  />
                )}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Folder01Icon}
              title="Select a bucket"
              description="Choose a bucket from the sidebar to browse objects"
            />
          )}
        </div>
      </div>
    </div>
  )
}
