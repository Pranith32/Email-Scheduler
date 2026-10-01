# ReachInbox — Full-Stack Email Job Scheduler

A production-oriented **full-stack email scheduling system** built as part of the ReachInbox hiring assignment.

The application allows users to authenticate, upload recipient lists, schedule emails, monitor scheduled and sent emails, and process email jobs reliably using **BullMQ + Redis**. The system is designed to support persistent scheduling, rate limiting, concurrency, email delivery through Ethereal SMTP, and searchable email records.

---

## Project Overview

Email outreach systems need reliable scheduling, queue management, rate limiting, and persistence.

This project implements a small-scale version of such a system using:

- **React + TypeScript** for the dashboard
- **Node.js + Express + TypeScript** for the backend
- **PostgreSQL** for persistent application data
- **BullMQ + Redis** for persistent delayed job scheduling
- **Ethereal Email + Nodemailer** for test email delivery
- **Elasticsearch** for email search
- **Google OAuth** for authentication
- **Slack OAuth** for rate-limit notifications

The main objective is to ensure that scheduled emails are not lost when the application restarts and that duplicate emails are prevented through idempotent job processing.

---

# Features

## Authentication

- Google OAuth authentication
- User profile information
- User avatar
- Logout
- Protected backend APIs
- User-level data isolation

---

## Email Scheduling

Users can:

- Enter email subject
- Enter email body
- Upload CSV recipient lists
- Validate email addresses
- Remove duplicate recipients
- Configure start time
- Configure delay between emails
- Configure hourly sending limit
- Select sender
- Schedule multiple emails

Example CSV:

```csv
email,name
john@example.com,John
alice@example.com,Alice
bob@example.com,Bob
```

---

## Persistent Job Scheduling

Email scheduling is implemented using:

**BullMQ + Redis**

No cron jobs are used.

Each scheduled email is stored as a persistent BullMQ delayed job.

Architecture:

```text
User
  |
  v
React Dashboard
  |
  v
Express API
  |
  +------------------+
  |                  |
  v                  v
PostgreSQL        BullMQ
                     |
                     v
                   Redis
                     |
                     v
                  Worker
                     |
                     v
               Rate Limiter
                     |
                     v
                Ethereal SMTP
```

---

# Restart Persistence

One of the main requirements of the project is that scheduled jobs must survive application restarts.

Example:

```text
Email scheduled → 10:00 AM
       |
Server stopped
       |
Server restarted
       |
BullMQ retrieves persistent delayed job
       |
Worker processes job
       |
Email sent
```

The application does **not** recreate all jobs from scratch after a restart.

BullMQ stores delayed jobs in Redis, while PostgreSQL stores the application's email/job state.

---

# Idempotency

The scheduler is designed to prevent duplicate email sends.

Before sending an email, the worker checks the current database state.

Typical state flow:

```text
scheduled
    |
    v
processing
    |
    +------> sent
    |
    +------> failed
```

If a job has already reached:

```text
sent
```

the worker does not send the email again.

This protects against duplicate processing when jobs are retried or workers restart.

---

# Rate Limiting

The system supports configurable hourly email limits.

Example:

```env
MAX_EMAILS_PER_HOUR=200
```

Rate limiting is backed by Redis rather than an in-memory counter.

This allows the system to remain consistent when multiple workers or application instances are processing jobs.

Example:

```text
Hourly Limit = 200

Hour 1
--------
Email 1
Email 2
...
Email 200

Hour 2
--------
Email 201
Email 202
...
```

When the hourly limit is reached, remaining jobs are **not permanently failed or dropped**.

They are rescheduled for the next available sending window.

---

# Email Delay

The scheduler supports a configurable minimum delay between email sends.

Example:

```env
MIN_EMAIL_DELAY_MS=2000
```

This represents a minimum delay of approximately:

```text
2 seconds
```

between email sends.

The delay can also be configured for individual campaigns.

Example:

```text
Email 1 → Send
       ↓
     2 sec
       ↓
Email 2 → Send
       ↓
     2 sec
       ↓
Email 3 → Send
```

This helps simulate provider throttling and controlled outreach.

---

# Worker Concurrency

BullMQ workers support configurable concurrency.

Example:

```env
WORKER_CONCURRENCY=10
```

This allows multiple jobs to be processed concurrently while still respecting rate limits and email-delay constraints.

The concurrency value is configurable through environment variables rather than being hardcoded.

---

# Ethereal Email

The project uses **Ethereal Email** as a fake SMTP provider for testing.

Emails are sent using:

- Nodemailer
- SMTP
- Ethereal Email

After an email is sent, the system stores relevant delivery information such as:

- Message ID
- Sent time
- Status

Ethereal also provides a browser preview of test emails.

---

# Elasticsearch

Email records are indexed into Elasticsearch to provide searchable email data.

Indexed information can include:

- Recipient
- Sender
- Subject
- Body
- Status
- Scheduled time
- Sent time
- Campaign ID

Example search:

```text
GET /api/emails/search?q=john@example.com
```

Search can be performed across relevant email fields.

Elasticsearch is used for search functionality instead of relying only on relational database filtering.

---

# Slack Notifications

The system supports Slack OAuth integration.

Users can connect Slack through the dashboard.

When an email sender reaches its configured hourly rate limit, the system can send a Slack notification.

Example notification:

```text
Email Rate Limit Reached

Sender: sender@example.com
Hourly Limit: 200

Remaining emails have been
rescheduled to the next available
sending window.
```

Slack notification failures do not stop the email scheduler.

If Slack is not connected, email processing continues normally.

---

# BullMQ Dashboard

The application provides a BullMQ monitoring dashboard.

The queue can be inspected for:

- Waiting jobs
- Delayed jobs
- Active jobs
- Completed jobs
- Failed jobs
- Retrying jobs

This makes it easier to observe the email scheduling system during development and demonstration.

---

# Frontend Dashboard

The frontend is built using React and TypeScript.

Main dashboard sections include:

### Scheduled Emails

Displays:

- Recipient
- Subject
- Scheduled time
- Sender
- Status

### Sent Emails

Displays:

- Recipient
- Subject
- Sent time
- Sender
- Status

### Compose Email

Allows users to:

- Enter subject
- Enter email body
- Upload CSV
- View detected recipient count
- Select sender
- Configure start time
- Configure delay
- Configure hourly limit
- Schedule emails

---

# Project Structure

```text
reachinbox-email-scheduler/
│
├── apps/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── queues/
│   │   │   ├── workers/
│   │   │   ├── integrations/
│   │   │   │   ├── google/
│   │   │   │   ├── slack/
│   │   │   │   ├── email/
│   │   │   │   └── elasticsearch/
│   │   │   ├── utils/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   │
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── layouts/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── api/
│       │   ├── types/
│       │   ├── utils/
│       │   ├── routes/
│       │   └── App.tsx
│       │
│       └── package.json
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── scripts/
│   └── smoke-test.ts
│
├── docker/
│
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

# Tech Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | UI |
| TypeScript | Type safety |
| Vite | Development/build tooling |
| Tailwind CSS | Styling |
| React Router | Routing |
| TanStack Query | API/server state |
| Axios | HTTP requests |
| React Hook Form | Forms |
| Zod | Validation |

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| TypeScript | Type safety |
| Express.js | REST API |
| Prisma | ORM |
| PostgreSQL | Persistent database |
| BullMQ | Job scheduling |
| Redis | Queue + rate limiting |
| Nodemailer | SMTP |
| Ethereal | Test email provider |
| Elasticsearch | Email search |
| Passport / OAuth | Authentication |

---

# Database

PostgreSQL stores persistent application state.

Main entities include:

```text
User
 |
 +--- Sender
 |
 +--- EmailCampaign
 |
 +--- EmailJob
 |
 +--- SlackConnection
```

Email jobs contain information such as:

```text
id
campaignId
userId
senderId
recipient
subject
body
scheduledAt
sentAt
status
attempts
lastError
bullJobId
messageId
createdAt
updatedAt
```

---

# Environment Variables

Create a `.env` file based on `.env.example`.

Example:

```env
NODE_ENV=development

PORT=5000

DATABASE_URL=postgresql://postgres:password@localhost:5432/reachinbox

REDIS_URL=redis://localhost:6379

ELASTICSEARCH_URL=http://localhost:9200

ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=
ETHEREAL_PASSWORD=

WORKER_CONCURRENCY=10

MIN_EMAIL_DELAY_MS=2000

MAX_EMAILS_PER_HOUR=200

JWT_SECRET=

FRONTEND_URL=http://localhost:5173

BACKEND_URL=http://localhost:5000
```

**Never commit the real `.env` file or credentials to GitHub.**

---

# Running with Docker

The project can use Docker for infrastructure services.

Start PostgreSQL, Redis and Elasticsearch:

```bash
docker compose up -d
```

Check running containers:

```bash
docker ps
```

---

# Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd reachinbox-email-scheduler
```

Install dependencies:

```bash
pnpm install
```

or:

```bash
npm install
```

depending on the package manager used by the project.

---

# Database Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Optional seed:

```bash
npx prisma db seed
```

---

# Running the Backend

From the backend directory:

```bash
npm run dev
```

or:

```bash
pnpm dev
```

The API runs on:

```text
http://localhost:5000
```

---

# Running the BullMQ Worker

Run the worker separately:

```bash
npm run worker
```

or:

```bash
pnpm worker
```

The worker consumes persistent jobs from Redis through BullMQ.

---

# Running the Frontend

From the frontend directory:

```bash
npm run dev
```

or:

```bash
pnpm dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

---

# Google OAuth Setup

Create OAuth credentials in Google Cloud Console.

Configure:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

Add the callback URL to the Google OAuth configuration.

Example:

```text
http://localhost:5000/api/auth/google/callback
```

The production callback URL should use the deployed backend URL.

---

# Slack OAuth Setup

Create a Slack application and configure OAuth.

Set:

```env
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=
```

Configure the appropriate OAuth redirect URL in the Slack application.

The application stores the Slack connection against the authenticated user.

---

# Ethereal Setup

Create an Ethereal test SMTP account or configure the provided Ethereal credentials.

Set:

```env
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=
ETHEREAL_PASSWORD=
```

The application uses Nodemailer to send test emails through Ethereal.

---

# Elasticsearch Setup

Start Elasticsearch:

```bash
docker compose up -d elasticsearch
```

Verify:

```bash
curl http://localhost:9200
```

The application creates/indexes email documents for searching.

---

# API Endpoints

## Authentication

```text
GET  /api/auth/google
GET  /api/auth/google/callback
GET  /api/auth/me
POST /api/auth/logout
```

## Emails

```text
POST /api/emails/schedule
GET  /api/emails/scheduled
GET  /api/emails/sent
GET  /api/emails/:id
GET  /api/emails/search
POST /api/emails/:id/cancel
```

## Senders

```text
GET    /api/senders
POST   /api/senders
PATCH  /api/senders/:id
DELETE /api/senders/:id
```

## Campaigns

```text
GET /api/campaigns
GET /api/campaigns/:id
```

## Slack

```text
GET  /api/slack/connect
GET  /api/slack/callback
GET  /api/slack/status
POST /api/slack/disconnect
```

## Health

```text
GET /api/health
```

---

# Testing

The project includes tests for important backend functionality.

Important test cases include:

- Email scheduling
- CSV validation
- API validation
- Rate limiting
- Idempotency
- Email status transitions
- Database persistence
- Elasticsearch indexing
- Search
- Authentication middleware

---

# Restart Persistence Test

To verify persistent scheduling:

### Step 1

Schedule an email for a future time.

### Step 2

Verify the email appears in:

```text
Scheduled Emails
```

### Step 3

Stop the backend/worker.

### Step 4

Restart the backend/worker.

### Step 5

Verify that the delayed BullMQ job still exists.

### Step 6

Wait until the scheduled time.

### Step 7

Verify:

```text
Scheduled → Processing → Sent
```

The email should not need to be scheduled again.

---

# Rate Limit Test

Example configuration:

```env
MAX_EMAILS_PER_HOUR=3
MIN_EMAIL_DELAY_MS=2000
```

Schedule five emails.

Expected behavior:

```text
Email 1 → Sent
Email 2 → Sent
Email 3 → Sent

Email 4 → Rescheduled
Email 5 → Rescheduled
```

The remaining jobs are not permanently discarded.

They are moved to the next available sending window.

---

# High-Load Behavior

The system is designed to support large batches of scheduled emails.

For example:

```text
1000 emails
      |
      v
1000 BullMQ delayed jobs
      |
      v
Redis
      |
      v
Multiple workers
      |
      +------ concurrency control
      |
      +------ email delay
      |
      +------ hourly rate limit
      |
      v
Ethereal SMTP
```

The application does not create thousands of Node.js timers.

Jobs are persisted through BullMQ and Redis.

---

# Email Search

Email records are indexed in Elasticsearch.

Search can be performed using:

```text
GET /api/emails/search?q=example
```

Possible searchable fields include:

- recipient
- sender
- subject
- body

Search results are restricted to the authenticated user's data.

---

# Queue Monitoring

Bull Board provides a visual interface for monitoring BullMQ.

Typical states:

```text
Delayed
   ↓
Waiting
   ↓
Active
   ↓
Completed
```

Failed jobs can be inspected and retried according to the configured retry policy.

---

# Security Considerations

The application includes:

- Authentication middleware
- Authorization checks
- Request validation
- Helmet
- CORS configuration
- Protected APIs
- Environment-based secrets
- User-level data isolation
- Sanitized logging
- No SMTP credentials exposed to the frontend

Sensitive credentials should always be stored in environment variables or a secure secret manager.

---

# Scheduling Constraints

The application intentionally does **not** use:

```text
cron
node-cron
Agenda
node-schedule
OS-level cron
in-memory timers for email scheduling
```

Email scheduling is handled using:

```text
BullMQ + Redis delayed jobs
```

This allows jobs to remain persistent across application restarts.

---

# Architecture

```text
                    ┌────────────────────┐
                    │    React Frontend  │
                    │   TypeScript + UI  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   Express REST API │
                    │     TypeScript     │
                    └──────┬─────┬───────┘
                           │     │
             ┌─────────────┘     └──────────────┐
             ▼                                  ▼
    ┌─────────────────┐                ┌─────────────────┐
    │   PostgreSQL    │                │ BullMQ + Redis  │
    │ Persistent Data │                │ Delayed Jobs    │
    └─────────────────┘                └────────┬────────┘
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │  Email Worker    │
                                      │ Configurable     │
                                      │ Concurrency      │
                                      └────────┬─────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
                 ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
                 │ Rate Limiter │      │ Ethereal SMTP│     │ Elasticsearch│
                 │    Redis     │      │  Nodemailer  │     │    Search    │
                 └──────────────┘      └──────────────┘     └──────────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ Slack OAuth  │
                 │ Notification │
                 └──────────────┘
```

---

# Email Lifecycle

```text
CSV Upload
    ↓
Validate Recipients
    ↓
Create Campaign
    ↓
Create EmailJob Records
    ↓
Create BullMQ Delayed Jobs
    ↓
Redis
    ↓
Worker Picks Job
    ↓
Check Idempotency
    ↓
Check Rate Limit
    ↓
Apply Sending Delay
    ↓
Send via Ethereal
    ↓
Update PostgreSQL
    ↓
Index in Elasticsearch
    ↓
Display in Sent Emails
```

---

# Demo Video

The recommended demonstration flow is:

1. Login with Google
2. Open dashboard
3. Compose a new email
4. Upload CSV
5. Show recipient count
6. Configure delay and hourly limit
7. Schedule emails
8. Show Scheduled Emails
9. Open BullMQ dashboard
10. Show delayed jobs
11. Show worker processing
12. Show Ethereal email preview
13. Show Sent Emails
14. Demonstrate rate limiting
15. Demonstrate Slack notification
16. Restart backend/worker
17. Show scheduled job surviving restart
18. Search the email using Elasticsearch

---

# Assignment Requirement Mapping

| Requirement | Implementation |
|---|---|
| TypeScript Backend | TypeScript + Node.js |
| Express | Express.js REST API |
| PostgreSQL | Prisma + PostgreSQL |
| BullMQ | Persistent email queue |
| Redis | Queue + rate limiting |
| Delayed Jobs | BullMQ delayed jobs |
| No Cron | No cron scheduler |
| Worker Concurrency | Configurable BullMQ concurrency |
| Email Delay | Configurable delay |
| Hourly Rate Limit | Redis-backed rate limiting |
| Rate-limit Rescheduling | BullMQ job rescheduling |
| Multiple Senders | Sender management |
| Ethereal SMTP | Nodemailer + Ethereal |
| Idempotency | Database state + job checks |
| Restart Persistence | Redis/BullMQ persistence |
| Elasticsearch | Email indexing/search |
| Bull Dashboard | Bull Board |
| Google Login | Google OAuth |
| Slack Integration | Slack OAuth |
| Slack Notification | Rate-limit notification |
| CSV Upload | Recipient parsing/validation |
| Scheduled Emails UI | React dashboard |
| Sent Emails UI | React dashboard |
| Loading/Empty States | Frontend UX |
| README | This document |

---

# Design Trade-offs

### BullMQ vs Cron

BullMQ delayed jobs were selected because jobs remain persisted in Redis and can be processed reliably after worker restarts.

### Redis Rate Limiting

Redis provides shared state across workers instead of relying on local memory.

### PostgreSQL + Redis

PostgreSQL acts as the source of truth for application state, while Redis/BullMQ manages asynchronous job execution.

### Ethereal

Ethereal provides a safe SMTP environment for demonstrating real email sending without sending production emails to real recipients.

### Elasticsearch

Elasticsearch provides scalable full-text search across email content and metadata.

---

# Future Improvements

Potential production extensions include:

- Multi-tenant organization management
- Advanced campaign analytics
- Open/click tracking
- Bounce handling
- Provider failover
- Amazon SES / SendGrid / Mailgun integrations
- Distributed tracing
- Prometheus/Grafana monitoring
- Dead-letter queues
- Advanced retry policies
- Email templates
- Campaign analytics
- Role-based access control

---

# Author

**B. Pranith Reddy**

B.Tech — Computer Science & Engineering

---

# 📄 License

This project was developed as part of a technical hiring assignment for evaluation and demonstration purposes.
