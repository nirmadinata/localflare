import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  TaskDone01Icon,
  Sent02Icon,
} from "@hugeicons/core-free-icons"
import { queuesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard, StatsCardGroup } from "@/components/ui/stats-card"
import { DataTableLoading } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

export function QueuesExplorer() {
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const [messageBody, setMessageBody] = useState("")

  const { data: queues, isLoading } = useQuery({
    queryKey: ["queues"],
    queryFn: queuesApi.list,
  })

  const sendMessageMutation = useMutation({
    mutationFn: ({ binding, message }: { binding: string; message: unknown }) =>
      queuesApi.send(binding, message),
    onSuccess: () => {
      setMessageBody("")
    },
  })

  const handleSendMessage = () => {
    if (!selectedQueue || !messageBody.trim()) return

    try {
      const message = JSON.parse(messageBody)
      sendMessageMutation.mutate({ binding: selectedQueue, message })
    } catch {
      // If not valid JSON, send as string
      sendMessageMutation.mutate({ binding: selectedQueue, message: messageBody })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <DataTableLoading />
      </div>
    )
  }

  const producers = queues?.producers ?? []
  const consumers = queues?.consumers ?? []

  if (!producers.length) {
    return (
      <div className="p-6">
        <PageHeader
          icon={TaskDone01Icon}
          iconColor="text-queues"
          title="Queues"
          description="Manage your Cloudflare Queues"
        />
        <EmptyState
          icon={TaskDone01Icon}
          title="No Queues configured"
          description="Add a Queue binding to your wrangler.toml to get started"
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
          icon={TaskDone01Icon}
          iconColor="text-queues"
          title="Queues"
          description="Manage your Cloudflare Queues"
        />

        {/* Stats */}
        <StatsCardGroup className="mt-6">
          <StatsCard
            icon={TaskDone01Icon}
            iconColor="text-queues"
            label="Producers"
            value={producers.length}
          />
          <StatsCard
            icon={TaskDone01Icon}
            iconColor="text-muted-foreground"
            label="Consumers"
            value={consumers.length}
          />
        </StatsCardGroup>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Queue List */}
        <div className="w-56 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 border-b border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Producers
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {producers.map((producer) => (
                <button
                  key={producer.binding}
                  onClick={() => setSelectedQueue(producer.binding)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                    selectedQueue === producer.binding
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={TaskDone01Icon}
                    className={cn("size-4", selectedQueue === producer.binding && "text-queues")}
                    strokeWidth={2}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{producer.binding}</div>
                    <div className="text-[10px] opacity-60 truncate">{producer.queue}</div>
                  </div>
                </button>
              ))}
            </div>

            {consumers.length > 0 && (
              <>
                <div className="p-3 border-t border-b border-border mt-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Consumers
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {consumers.map((consumer) => (
                    <div
                      key={consumer.queue}
                      className="px-3 py-2 rounded-md text-sm flex items-center gap-2 text-muted-foreground"
                    >
                      <HugeiconsIcon icon={TaskDone01Icon} className="size-4" strokeWidth={2} />
                      <span className="truncate">{consumer.queue}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedQueue ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-xl space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <HugeiconsIcon icon={Sent02Icon} className="size-5 text-queues" strokeWidth={2} />
                  <h3 className="text-base font-semibold">Send Message to {selectedQueue}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send a test message to the queue. JSON will be parsed automatically.
                </p>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Message Body</label>
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder='{"type": "test", "data": "hello"}'
                    className="mt-1.5 w-full min-h-48 p-3 rounded-md border border-input bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {sendMessageMutation.isError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {String(sendMessageMutation.error)}
                  </div>
                )}

                {sendMessageMutation.isSuccess && (
                  <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
                    Message sent successfully!
                  </div>
                )}

                <Button
                  onClick={handleSendMessage}
                  disabled={!messageBody.trim() || sendMessageMutation.isPending}
                >
                  <HugeiconsIcon icon={Sent02Icon} className="size-4 mr-1.5" strokeWidth={2} />
                  Send Message
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={TaskDone01Icon}
              title="Select a queue"
              description="Choose a queue from the sidebar to send messages"
            />
          )}
        </div>
      </div>
    </div>
  )
}
