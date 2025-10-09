# MediVault

Secure medical document and records management system focused on privacy, access control, and AI-assisted retrieval.

This repository currently contains the backend service in `backend/` (Node.js + Express + MongoDB) with integrations for blockchain, IPFS, Redis, and AI processing. See `backend/README.md` for detailed API docs and development guidance.

## Features

- **Secure document storage**: Encrypted files with access control and audit logging
- **Role-based access**: Fine-grained permissions and request/approval flows
- **AI-assisted retrieval**: Text chunking, embeddings, and semantic search
- **Blockchain hooks**: Document hash verification and access events (via `ethers`)
- **IPFS support**: Optional decentralized file storage
- **Notifications**: Email/websocket notifications for access events

## Tech Stack

- **Runtime**: Node.js (18+)
- **Framework**: Express
- **Database**: MongoDB (Mongoose models in `backend/src/models`)
- **Caching/Queues**: Redis (optional)
- **Security**: JWT, rate limiting, input validation
- **Integrations**: Ethers (blockchain), IPFS HTTP client, Socket.IO

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- (Optional) Redis, IPFS endpoint, blockchain RPC

### Clone and run backend

```bash
git clone https://github.com/SidhikThorat/MediVault.git
cd MediVault/backend
npm install
cp env.example .env
# Edit .env with your local configuration
npm run dev
```

The server defaults to `PORT=5000`. Environment options are documented in `backend/env.example`.

## Repository Layout

```
MediVault/
├── backend/
│   ├── src/
│   │   ├── config/        # Service/database configuration
│   │   ├── controllers/   # Route handlers (reserved)
│   │   ├── middleware/    # Auth, validation, etc.
│   │   ├── models/        # Mongoose models (User, Patient, Document, ...)
│   │   ├── routes/        # Express routes (reserved)
│   │   ├── services/      # Business logic (reserved)
│   │   ├── utils/         # Helpers
│   │   └── app.js         # Express app entry (see backend/package.json)
│   ├── docs/
│   ├── tests/
│   ├── scripts/
│   ├── env.example
│   └── README.md
├── env.example            # Legacy/global example (use backend/env.example)
├── package.json           # Legacy monorepo scripts (client/server placeholders)
└── README.md
```

Note: Some directories such as `controllers/`, `routes/`, and `services/` are present for organization and may be populated as features evolve. Active data models live under `backend/src/models/`.

## Backend Scripts

Run scripts from `backend/`:

```bash
# Development
npm run dev        # nodemon server
npm start          # production start

# Tests
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run lint:fix

# Database utilities
npm run db:seed
npm run db:reset
npm run db:migrate
```

## Environment Configuration

Use `backend/env.example` as the source of truth. Key groups:

- App: `NODE_ENV`, `PORT`
- MongoDB: `MONGODB_URI`
- Auth: `JWT_SECRET`, `JWT_EXPIRES_IN`
- Blockchain: `RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS`
- IPFS: `IPFS_API_URL`, `IPFS_PROJECT_ID`, `IPFS_PROJECT_SECRET`
- Redis: `REDIS_URL`
- File uploads: `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`
- Security: `BCRYPT_ROUNDS`, rate-limit settings
- Frontend: `FRONTEND_URL`
- Email: `SMTP_*`
- Monitoring: `SENTRY_DSN`, `LOG_LEVEL`

For a minimal local setup, MongoDB and `JWT_SECRET` are required.

## Data Models

Primary Mongoose models are exported via `backend/src/models/index.js` and include `User`, `Patient`, `Document`, `AccessRequest`, `AuditLog`, `TextChunk`, `EmbeddingMap`, and `Notification`.

## API Overview

High-level endpoints (see `backend/README.md` for details):

- Auth: wallet login, email/password, register
- Documents: upload, list, details, access requests, download
- Chat: create session, send message, history
- Admin: manage access requests

## Security Notes

- Use strong, unique `JWT_SECRET` in production
- Enable HTTPS and set secure CORS origins
- Configure rate limiting and input validation
- Store encryption keys and private keys securely

## License

MIT License. See `LICENSE` if present.
