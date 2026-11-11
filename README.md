# Travora

Sistem informasi pemesanan tiket travel antar kota berbasis web.

## Tech Stack

| Layer    | Technology                       |
|----------|----------------------------------|
| Frontend | React · Vite · TypeScript · Tailwind CSS |
| Backend  | Go (Golang)                      |
| Database | PostgreSQL                       |
| API      | REST / JSON                      |

## Monorepo Structure

```
travora/
├── apps/
│   └── web/          # React + Vite + TypeScript frontend
├── services/
│   └── api/          # Go REST API backend
├── database/
│   ├── migrations/   # SQL migration files
│   └── seeds/        # Seed data scripts
├── docs/
│   └── reference/    # API & architecture documentation
├── scripts/          # Developer utility scripts
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18
- Go >= 1.22
- PostgreSQL >= 15
- pnpm (recommended) or npm

### Frontend — `apps/web`

```bash
cd apps/web
pnpm install       # install dependencies
pnpm dev           # start dev server → http://localhost:5173
pnpm build         # production build
pnpm preview       # preview production build locally
```

### Backend — `services/api`

```bash
cd services/api
go mod tidy        # sync dependencies
go run ./cmd/api   # start dev server → http://localhost:8080
go build -o bin/api ./cmd/api   # compile binary
```

### Environment

```bash
cp .env.example .env
# Edit .env with your local configuration
```

## Contributing

Please read `docs/reference/` for architecture decisions and API conventions.
