# Puul Task Management API

REST API for team task management, built as part of the Puul Backend Engineer technical challenge.

## Tech Stack

- **Runtime:** Node.js v20.11+
- **Framework:** NestJS v11
- **Language:** TypeScript v5 (strict null checks, no implicit any)
- **Database:** PostgreSQL v16
- **ORM:** TypeORM v0.3
- **Validation:** class-validator, class-transformer
- **Rate limiting:** @nestjs/throttler
- **Containerization:** Docker & Docker Compose

## Prerequisites

- Node.js v20.11 or higher
- Docker & Docker Compose

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd puul-task-api

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Start the database
docker compose up -d

# 5. Run database migrations
npm run migration:run

# 6. Seed with sample data
npm run seed

# 7. Start the application
npm run start:dev
```

The API will be available at `http://localhost:3000`

---

## API Endpoints

### POST /users
Create a new user.

```json
{ "name": "John Doe", "email": "john@example.com", "role": "admin" }
```

### GET /users
List users with optional filters and completed task stats.

**Query params:** `name`, `email`, `role`

Returns each user with `completedTasksCount` and `completedTasksTotalCost`.

Both values are calculated only from tasks with `status = "completed"`.

### POST /tasks
Create a task assigned to one or more users.

```json
{
  "title": "Implement user API",
  "description": "User creation, listing, filters, and stats",
  "estimatedHours": 8.5,
  "dueDate": "2024-05-01",
  "status": "active",
  "assignedUserIds": [1, 2, 3],
  "cost": 500.00,
  "actualHours": 7.5
}
```

`estimatedHours` and `actualHours` use decimal hours. Example: `8.5` = 8h 30min.

### GET /tasks
List tasks ordered by creation date (newest first). All filters are combinable with AND logic.

**Query params:** `dueDate`, `title`, `status`, `assignedUserId`, `assignedUserName`, `assignedUserEmail`

```bash
GET /tasks
GET /tasks?status=active
GET /tasks?assignedUserName=John&dueDate=2024-05-01
GET /tasks?assignedUserId=1&status=active&title=API
```

### PATCH /tasks/:id
Update any editable task field. Sending `assignedUserIds` replaces all current assigned users.

```json
{ "status": "completed", "actualHours": 7.5, "assignedUserIds": [1, 4] }
```

`actualHours` represents actual time invested and feeds the `timeEfficiency` analytics metric.

### DELETE /tasks/:id
Delete a task.

### GET /analytics
Returns two metrics:

- `productivityByRole`: completion, workload, and cost grouped by user role.
- `timeEfficiency`: estimated hours vs actual hours for completed tasks.

---

## Error Handling

| Code | Cause |
|------|-------|
| 400 | Validation failed (invalid or missing field) |
| 404 | Resource not found |
| 409 | Duplicate email |
| 429 | Too many requests |
| 500 | Internal server error |

---

## Rate Limiting

All endpoints are protected by a global IP-based rate limit.

Default configuration:

```env
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
```

This allows 60 requests per 60 seconds per IP.

---

## Scripts

```bash
npm run start:dev    # Development mode with hot-reload
npm run build        # Compile TypeScript
npm run start:prod   # Production (requires build first)
npm run seed         # Seed DB with sample data (5 users, 5 tasks)
npm run migration:run   # Apply database migrations
npm run migration:show  # Show migration status
npm test                # Unit tests
npm run test:e2e        # End-to-end API tests
npm run lint         # ESLint
npm run format       # Prettier
```

## Docker

```bash
docker compose up -d          # Start PostgreSQL
docker compose logs -f        # Follow logs
docker compose down           # Stop
docker compose down -v        # Stop and remove volumes
```

---

## Architecture & Design Decisions

### Module structure
```
AppModule
├── UsersModule   — User creation/listing with filters and SQL aggregations
├── TasksModule   — Task CRUD with many-to-many assignments
└── AnalyticsModule — Productivity and distribution metrics
```

### Many-to-Many with JoinTable
`Task` owns the relationship (`@JoinTable`), which simplifies creating and updating user assignments without extra queries.

### SQL Aggregations in Query Builder
For `completedTasksCount` and `completedTasksTotalCost` in `GET /users`, I use `CASE WHEN` directly in SQL via QueryBuilder instead of loading all relations into memory. This avoids N+1 queries and scales well.

### Dynamic Filters
Filters in `GET /tasks` are applied with conditional `andWhere()`, allowing any combination without duplicating query logic.

### Global Validation
`ValidationPipe` with `transform: true` automatically converts query param types (`"1"` → `1`), and `whitelist: true` rejects undeclared DTO properties.

### Analytics Metrics
- **Productivity by Role:** Compares admins vs members on task completion rate, workload, and cost generated. Gives the `role` field business value beyond storage — useful to verify whether role assignments reflect actual responsibilities.
- **Time Efficiency:** Estimated hours vs actual hours invested (`actualHours` field) for completed tasks. Users can report `actualHours` via `PATCH /tasks/:id`, enabling accurate time tracking rather than approximating with timestamps.

---

## Database Schema

```
users          user_tasks        tasks
───────        ──────────        ──────────────
id (PK)        user_id (FK) ─→  id (PK)
name           task_id (FK) ←─  title
email (unique)                   description
role (enum)                      estimated_hours
created_at                       due_date
updated_at                       status (enum)
                                 cost
                                 actual_hours
                                 created_at
                                 updated_at
```

---

## Production Considerations

- JWT authentication and guards
- Cursor-based pagination for large datasets
- Structured logging with Winston or Pino
- TypeORM migrations instead of `synchronize: true`
- Health checks with `@nestjs/terminus`
- CI/CD pipeline with GitHub Actions

---

## Author

**Steve**
Backend Engineer Challenge — Puul
