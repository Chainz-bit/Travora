# AGENTS.md — Travora Agent Rules

## Project Overview

Travora adalah monorepo sistem pemesanan tiket travel antar kota.

```
travora/
├── apps/web/        → React + Vite + TypeScript + Tailwind CSS
├── services/api/    → Go REST API
├── database/        → Migrations & seeds
├── docs/reference/  → Documentation
└── scripts/         → Developer utilities
```

---

## Ground Rules

1. **Jangan overwrite file yang sudah ada** tanpa persetujuan eksplisit user.
2. **Jangan instal dependency** yang tidak diminta secara eksplisit.
3. **Jangan buat business logic** sebelum diminta.
4. **Jangan buat mock API** yang seolah-olah berfungsi.
5. **Jangan buat database schema** sebelum diminta.
6. Selalu **periksa kondisi file/folder** sebelum membuat atau menghapus.

---

## Frontend (`apps/web`)

- Framework: React + Vite + TypeScript
- Styling: Tailwind CSS
- Struktur: feature-based (`src/features/<nama-fitur>/`)
- Naming: PascalCase untuk React components, camelCase untuk utilities
- Entry: `src/main.tsx` → `src/App.tsx`

### Feature Modules

| Folder              | Deskripsi                       |
|---------------------|---------------------------------|
| `features/auth/`    | Autentikasi (login, register)   |
| `features/member/`  | Area penumpang/member           |
| `features/admin/`   | Panel administrasi              |
| `features/operator/`| Panel operator                  |
| `features/schedule/`| Jadwal perjalanan               |
| `features/booking/` | Pemesanan tiket                 |
| `features/complaints/` | Pengaduan/komplain           |

---

## Backend (`services/api`)

- Language: Go
- Struktur: modular, `cmd/` untuk entrypoint, `internal/` untuk logika
- Naming: snake_case untuk packages, PascalCase untuk exported types

### Internal Modules

| Folder                   | Deskripsi                   |
|--------------------------|-----------------------------|
| `internal/config/`       | Konfigurasi aplikasi        |
| `internal/database/`     | Koneksi & helper database   |
| `internal/middleware/`   | HTTP middleware              |
| `internal/auth/`         | Autentikasi                 |
| `internal/admin/`        | Modul admin                 |
| `internal/member/`       | Modul member                |
| `internal/operator/`     | Modul operator              |
| `internal/schedule/`     | Modul jadwal                |
| `internal/booking/`      | Modul pemesanan             |
| `internal/complaints/`   | Modul pengaduan             |

---

## API Conventions

- Base URL: `/api/v1`
- Format: JSON
- Auth: Bearer token (header `Authorization: Bearer <token>`)
- Error format: `{ "error": "message" }`

---

## Development Commands

```bash
# Frontend
cd apps/web && pnpm dev

# Backend
cd services/api && go run ./cmd/api
```
