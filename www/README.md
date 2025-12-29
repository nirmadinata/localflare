# Localflare Website

Marketing website and documentation for [Localflare](https://github.com/rohanprasadofficial/localflare) - the local development dashboard for Cloudflare Workers.

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Icons | Hugeicons |
| Build | Vite 7 |
| Deployment | Cloudflare Workers |

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The site will be available at `http://localhost:5173`

## Deployment

Deploy to Cloudflare Workers:

```bash
# Login to Cloudflare (if not already)
npx wrangler login

# Deploy
pnpm deploy
```

The site will be available at `https://localflare-www.<your-subdomain>.workers.dev`

## Project Structure

```
www/
├── src/
│   ├── components/
│   │   ├── landing/       # Marketing landing page
│   │   ├── wiki/          # Documentation pages
│   │   └── ui/            # Base UI components
│   ├── pages/             # Page components
│   ├── lib/               # Utilities
│   ├── App.tsx            # Root component with routing
│   └── main.tsx           # Entry point
├── worker/                # Cloudflare Worker (static server)
├── public/                # Static assets
├── index.html             # HTML template
└── wrangler.json          # Cloudflare Workers configuration
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page |
| `/docs` | Documentation wiki |
| `/docs/:section` | Individual documentation sections |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm deploy` | Deploy to Cloudflare Workers |
| `pnpm lint` | Run ESLint |

## License

MIT
