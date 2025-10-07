# MediVault Backend

Secure Medical Document Management System with Blockchain and AI Integration

## 🏗️ Architecture Overview

This backend serves as the core integration layer for MediVault, connecting:
- **Frontend** ↔ **Backend** ↔ **Smart Contracts** ↔ **AI/LLM Services**

## 📋 Features

- 🔐 **Authentication**: Wallet-based and email/password authentication
- 📁 **Document Management**: Upload, process, and store medical documents
- 🔗 **Blockchain Integration**: Document verification and access control
- 🤖 **AI Integration**: Document processing and intelligent chat
- 🗄️ **Database**: MongoDB for flexible document storage and AI data
- 🌐 **IPFS Storage**: Decentralized file storage
- 🔒 **Security**: Role-based access control and audit logging

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 6+
- Redis (optional, for caching)
- IPFS node or service

### Installation

1. **Clone and install dependencies**
```bash
cd backend
npm install
```

2. **Environment setup**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 🗄️ Database Schema

### MongoDB Collections

#### DocumentContent
- Stores extracted text and metadata from medical documents
- Contains medical entities (medications, conditions, procedures)
- AI processing results and embeddings references

#### AIVector
- Vector embeddings for semantic search
- Chunk-based document processing
- Medical context and search metadata

#### Chat
- Chat sessions with AI assistant
- Message history and citations
- User interactions and feedback

#### ProcessingJob
- Background job processing
- Document upload and AI processing
- Status tracking and error handling

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/wallet` - Wallet authentication
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/register` - User registration

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List user documents
- `GET /api/documents/:id` - Get document details
- `POST /api/documents/:id/request-access` - Request access
- `GET /api/documents/:id/download` - Download document

### Chat
- `POST /api/chat/session` - Create chat session
- `POST /api/chat/:sessionId/message` - Send message
- `GET /api/chat/:sessionId/history` - Get chat history

### Admin
- `GET /api/admin/access-requests` - Get pending requests
- `POST /api/admin/approve-access` - Approve access
- `POST /api/admin/reject-access` - Reject access

## 🛠️ Development

### Project Structure
```
backend/
├── src/
│   ├── config/          # Database and service configurations
│   ├── controllers/     # API route handlers
│   ├── middleware/      # Authentication, validation, etc.
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── app.js           # Express app setup
├── tests/               # Test files
├── scripts/             # Database scripts
└── docs/                # Documentation
```

### Available Scripts

```bash
# Development
npm run dev              # Start with nodemon
npm start               # Start production server

# Testing
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues

# Database
npm run db:seed         # Seed database
npm run db:reset         # Reset database
npm run db:migrate       # Run migrations
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions
- **Rate Limiting**: API rate limiting
- **Input Validation**: Request validation and sanitization
- **Audit Logging**: Complete access trail
- **File Encryption**: Secure file storage

## 🌐 Integration Points

### Frontend Integration
- RESTful API endpoints
- WebSocket for real-time notifications
- File upload with progress tracking
- Authentication middleware

### Blockchain Integration
- Smart contract event listening
- Document hash verification
- Access permission checking
- Transaction logging

### AI/LLM Integration
- Document processing jobs
- Vector embedding storage
- Chat session management
- Medical entity extraction

## 📊 Monitoring

### Health Check
```bash
GET /health
```

### Metrics
- Database connection status
- Processing job statistics
- API response times
- Error rates

## 🚀 Deployment

### Environment Variables
See `env.example` for required environment variables.

### Production Checklist
- [ ] Set secure JWT secret
- [ ] Configure database connections
- [ ] Set up IPFS service
- [ ] Configure blockchain RPC
- [ ] Set up monitoring
- [ ] Enable HTTPS
- [ ] Configure backup

## 🤝 Team Integration

This backend provides APIs for:
- **Frontend Team**: REST endpoints for UI
- **Blockchain Team**: Smart contract integration
- **AI/LLM Team**: Document processing and chat

## 📝 License

MIT License - see LICENSE file for details.

