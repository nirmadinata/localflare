# Localflare

Local development dashboard for Cloudflare Workers. Visualize and interact with your D1 databases, KV namespaces, R2 buckets, Durable Objects, and Queues during development.

[![npm version](https://img.shields.io/npm/v/localflare.svg)](https://www.npmjs.com/package/localflare)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **D1 Database Explorer** - Browse tables, run SQL queries, edit data
- **KV Browser** - View, edit, and delete key-value pairs
- **R2 File Manager** - Upload, download, and manage objects
- **Queue Inspector** - Send test messages to queues
- **Durable Objects** - View and interact with DO instances
- **Zero Config** - Reads your `wrangler.toml` automatically
- **Framework Agnostic** - Works with any framework

## Installation

```bash
npm install -g localflare
# or
pnpm add -g localflare
# or
npx localflare
```

## Usage

Navigate to your Cloudflare Worker project directory and run:

```bash
localflare
```

This will:
1. Detect your `wrangler.toml` configuration
2. Start your worker at `http://localhost:8787`
3. Open the dashboard at `https://studio.localflare.dev`

### Options

```bash
localflare [configPath] [options]

Options:
  -p, --port <port>  Worker port (default: 8787)
  -v, --verbose      Verbose output
  --no-open          Don't open browser automatically
  --no-tui           Disable TUI, use simple console output
  --dev              Open local dashboard instead of studio.localflare.dev
  -h, --help         Display help
  --version          Display version
```

### Pass Wrangler Options

Use `--` to pass options directly to wrangler:

```bash
# Use a specific environment
localflare -- --env staging

# Set environment variables
localflare -- --var API_KEY:secret

# Combine options
localflare --port 9000 -- --env production
```

### Examples

```bash
# Use default settings
localflare

# Custom port
localflare --port 9000

# With custom config path
localflare ./custom/wrangler.toml

# Verbose output, don't open browser
localflare --verbose --no-open
```

## How It Works

Localflare uses a sidecar architecture - it runs an API worker alongside your worker in the same wrangler process. Both workers share the exact same binding instances.

```
Single wrangler dev Process
├── Your Worker (http://localhost:8787)
│   └── Your application code unchanged
├── Localflare API Worker
│   └── Dashboard API (/__localflare/*)
└── Shared Bindings
    ├── D1, KV, R2, Queues, DO
    └── Same instances, same data
```

This means:
- **Your code stays untouched** - No modifications needed
- **Real bindings** - Not mocks, actual working instances
- **Queue messages work** - Send messages your consumer receives

## Supported Bindings

| Binding | Support | Dashboard Features |
|---------|---------|-------------------|
| D1 | ✅ Full | SQL editor, table browser, data CRUD |
| KV | ✅ Full | Key browser, value editor, bulk operations |
| R2 | ✅ Full | File browser, upload/download, metadata |
| Durable Objects | ✅ Full | Instance listing, state inspection |
| Queues | ✅ Full | Message viewer, send test messages |
| Service Bindings | ✅ Full | Automatic proxying |

## Related Packages

| Package | Description |
|---------|-------------|
| [`localflare-api`](https://www.npmjs.com/package/localflare-api) | API worker for the dashboard |
| [`localflare-core`](https://www.npmjs.com/package/localflare-core) | Config parsing utilities |
| [`localflare-dashboard`](https://www.npmjs.com/package/localflare-dashboard) | React dashboard UI |

## License

MIT
