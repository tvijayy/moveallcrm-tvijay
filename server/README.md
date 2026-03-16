# MoveAll CRM - Backend API

Production-ready Node.js REST API for managing moving jobs, users, and automated communications.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Webhook**: n8n integration

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy the example env file and update with your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)
- `N8N_WEBHOOK_URL` - Your n8n webhook endpoint

### 3. Setup Database

Run the migration to create tables:

```bash
# Using psql directly
psql -d moveall_crm -f migrations/001_initial_schema.sql

# Or using the migration runner
npm run migrate
```

### 4. Seed Sample Data

```bash
npm run seed
```

This creates:
- Admin user: `admin@moveall.com` / `admin123`
- Staff users: `john@moveall.com` / `staff123`
- 6 sample moving jobs

### 5. Start Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT token |
| GET | `/api/auth/me` | Get current user info |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs (filtered by role) |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/:id` | Get job |
| PUT | `/api/jobs/:id` | Update job |
| PATCH | `/api/jobs/:id/status` | Update status |
| DELETE | `/api/jobs/:id` | Delete job (admin) |
| POST | `/api/jobs/:id/send-email` | Trigger email |
| POST | `/api/jobs/:id/send-sms` | Trigger SMS |
| GET | `/api/jobs/:id/logs` | Get job activity |

### Activity Logs (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | List all activity logs |

## Sample Requests

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@moveall.com","password":"admin123"}'
```

### Create Job

```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "+1 555-000-0000",
    "moveDate": "2026-03-01",
    "fromLocation": "123 Start St",
    "toLocation": "456 End Ave"
  }'
```

### Send Email

```bash
curl -X POST http://localhost:5000/api/jobs/JOB_ID/send-email \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Project Structure

```
server/
├── src/
│   ├── config/          # Database & env config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, RBAC, validation
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   └── app.js          # Express setup
├── migrations/          # SQL schema
├── seeds/              # Sample data
├── server.js           # Entry point
└── package.json
```

## Authorization

- **Admin**: Full access to all resources
- **Staff**: Access only to assigned jobs

## n8n Webhook

Actions (email/SMS) trigger a POST to your n8n webhook with:

```json
{
  "action": "send_email",
  "job": { ... },
  "triggeredBy": { "userId": "...", "name": "..." },
  "timestamp": "2026-02-09T03:00:00Z"
}
```
  