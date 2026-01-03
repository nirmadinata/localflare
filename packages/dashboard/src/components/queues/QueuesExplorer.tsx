import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  TaskDone01Icon,
  Sent02Icon,
  InformationCircleIcon,
  Settings02Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons"
import { queuesApi } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/ui/page-header"
import { StatsCard, StatsCardGroup } from "@/components/ui/stats-card"
import { DataTableLoading } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

export function QueuesExplorer() {
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('{\n  "type": "task",\n  "data": "hello"\n}')
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  const { data: queues, isLoading } = useQuery({
    queryKey: ["queues"],
    queryFn: queuesApi.list,
  })

  const sendMutation = useMutation({
    mutationFn: async ({ binding, message }: { binding: string; message: unknown }) => {
      return queuesApi.send(binding, message)
    },
    onSuccess: () => {
      setSendStatus({ type: 'success', message: 'Message sent! Check your terminal for consumer output.' })
      setTimeout(() => setSendStatus({ type: null, message: '' }), 5000)
    },
    onError: (error: Error) => {
      setSendStatus({ type: 'error', message: error.message })
    },
  })

  const handleSendMessage = () => {
    if (!selectedQueue) return

    try {
      const message = JSON.parse(messageInput)
      sendMutation.mutate({ binding: selectedQueue, message })
    } catch {
      setSendStatus({ type: 'error', message: 'Invalid JSON. Please check your message format.' })
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

  // Find matching consumer for selected producer
  const selectedProducer = producers.find(p => p.binding === selectedQueue)
  const matchingConsumer = consumers.find(c => c.queue === selectedProducer?.queue)

  if (!producers.length) {
    return (
      <div className="p-6">
        <PageHeader
          icon={TaskDone01Icon}
          iconColor="text-queues"
          title="Queues"
          description="Cloudflare Queues for async message processing"
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
          description="Cloudflare Queues for async message processing"
        />

        {/* Stats */}
        <StatsCardGroup className="mt-6">
          <StatsCard
            icon={Sent02Icon}
            iconColor="text-queues"
            label="Producers"
            value={producers.length}
            description="Send messages"
          />
          <StatsCard
            icon={Settings02Icon}
            iconColor="text-muted-foreground"
            label="Consumers"
            value={consumers.length}
            description="Process messages"
          />
        </StatsCardGroup>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Queue List */}
        <div className="w-64 border-r border-border flex flex-col bg-muted/30">
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
                    icon={Sent02Icon}
                    className={cn("size-4", selectedQueue === producer.binding && "text-queues")}
                    strokeWidth={2}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{producer.binding}</div>
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
                      className="px-3 py-2 rounded-md text-sm text-muted-foreground"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <HugeiconsIcon icon={Settings02Icon} className="size-4" strokeWidth={2} />
                        <span className="truncate font-medium">{consumer.queue}</span>
                      </div>
                      <div className="ml-6 text-[10px] space-y-0.5 opacity-70">
                        <div>Batch: {consumer.max_batch_size} msgs</div>
                        <div>Timeout: {consumer.max_batch_timeout}s</div>
                        <div>Retries: {consumer.max_retries}</div>
                      </div>
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
              <div className="max-w-2xl space-y-6">
                {/* Send Message Form */}
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <HugeiconsIcon icon={Sent02Icon} className="size-5 text-queues" strokeWidth={2} />
                    <h3 className="text-sm font-semibold">Send Message to {selectedQueue}</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Message (JSON)</label>
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="w-full h-32 px-3 py-2 rounded-md bg-muted border border-border font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-queues/50"
                        placeholder='{"type": "task", "data": "hello"}'
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSendMessage}
                        disabled={sendMutation.isPending}
                        className="px-4 py-2 bg-queues text-white text-sm font-medium rounded-md hover:bg-queues/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {sendMutation.isPending ? (
                          <>
                            <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <HugeiconsIcon icon={Sent02Icon} className="size-4" strokeWidth={2} />
                            Send Message
                          </>
                        )}
                      </button>

                      {sendStatus.type && (
                        <div className={cn(
                          "flex items-center gap-2 text-sm",
                          sendStatus.type === 'success' ? "text-green-600" : "text-red-600"
                        )}>
                          <HugeiconsIcon
                            icon={sendStatus.type === 'success' ? CheckmarkCircle02Icon : AlertCircleIcon}
                            className="size-4"
                            strokeWidth={2}
                          />
                          <span>{sendStatus.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* How it works info */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon icon={InformationCircleIcon} className="size-5 text-blue-500 mt-0.5" strokeWidth={2} />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-blue-600">How Cloudflare Queues Work</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-600/80">
                        <li><strong>Producer</strong> sends messages to the queue</li>
                        <li><strong>Queue</strong> holds messages until consumed</li>
                        <li><strong>Consumer</strong> receives batches and processes them</li>
                        <li><strong>Output</strong> appears in your <code className="bg-blue-500/20 px-1 rounded">terminal logs</code></li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Consumer Config */}
                {matchingConsumer && (
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <HugeiconsIcon icon={Settings02Icon} className="size-5 text-muted-foreground" strokeWidth={2} />
                      <h3 className="text-sm font-semibold">Consumer Configuration</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-md">
                        <div className="text-xs text-muted-foreground">Max Batch Size</div>
                        <div className="font-mono text-sm">{matchingConsumer.max_batch_size} messages</div>
                      </div>
                      <div className="p-3 bg-muted rounded-md">
                        <div className="text-xs text-muted-foreground">Max Batch Timeout</div>
                        <div className="font-mono text-sm">{matchingConsumer.max_batch_timeout} seconds</div>
                      </div>
                      <div className="p-3 bg-muted rounded-md">
                        <div className="text-xs text-muted-foreground">Max Retries</div>
                        <div className="font-mono text-sm">{matchingConsumer.max_retries}</div>
                      </div>
                      <div className="p-3 bg-muted rounded-md">
                        <div className="text-xs text-muted-foreground">Dead Letter Queue</div>
                        <div className="font-mono text-sm">{matchingConsumer.dead_letter_queue ?? "None"}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Consumer waits up to {matchingConsumer.max_batch_timeout}s or {matchingConsumer.max_batch_size} messages before processing a batch.
                    </p>
                  </div>
                )}

                {/* Producer info */}
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <HugeiconsIcon icon={Sent02Icon} className="size-5 text-queues" strokeWidth={2} />
                    <h3 className="text-sm font-semibold">Producer: {selectedQueue}</h3>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-xs text-muted-foreground">Queue Name</div>
                    <div className="font-mono text-sm">{selectedProducer?.queue}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <HugeiconsIcon icon={TaskDone01Icon} className="size-12 text-muted-foreground/50 mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold mb-2">Select a Queue</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a queue from the sidebar to send messages and view configuration.
                </p>
                <div className="p-4 rounded-lg bg-muted/50 text-left text-sm">
                  <p className="font-medium mb-2">With Localflare you can:</p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• Send messages to queues directly from the dashboard</li>
                    <li>• View queue configuration from wrangler.toml</li>
                    <li>• Display producer and consumer settings</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
