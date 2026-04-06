# RoastForge

RoastForge is a full-stack web app for sharing resumes and collecting feedback through comments, replies, votes, and likes. The repository is split into a TypeScript backend API and a Next.js frontend.

## What Is Implemented

### Backend

- JWT authentication with register, login, refresh, logout, `me`, and username regeneration endpoints
- Resume CRUD with list, detail, my-resumes, and like/unlike support
- Commenting on resumes with replies and comment voting
- Resume and avatar uploads to Cloudinary
- MongoDB persistence through Mongoose
- Request validation with DTOs and middleware
- CORS, cookie parsing, async error handling, and a `/health` endpoint

### Frontend

- App Router pages for home, login, register, verify email, profile, recruiter, projects, resume detail, and upload
- Shared UI components for navbar, footer, resume cards, comment threads, and reusable form controls
- Frontend state management for authentication
- API helpers and shared utilities

## Code Structure

### Backend

```text
backend/
├── server.ts                # Starts the HTTP server and connects to MongoDB
├── src/
│   ├── app.ts               # Express app, middleware, routes, and health check
│   ├── common/              # Shared config, middleware, DTO base class, and utilities
│   │   ├── config/db.ts     # MongoDB connection setup
│   │   ├── dto/             # Shared DTO base definitions
│   │   ├── middleware/      # Validation, error handling, async wrapper, upload config
│   │   └── utils/           # API response/error helpers, JWT, username, Cloudinary upload
│   └── modules/             # Feature-based API modules
│       ├── auth/            # Register/login/session handling and auth middleware
│       ├── comment/         # Comments, replies, and comment voting
│       ├── resume/          # Resume CRUD and likes
│       └── upload/          # Resume and avatar upload endpoints
```

### Frontend

```text
frontend/
├── src/
│   ├── app/                 # Next.js App Router entry points and route groups
│   │   └── (roasthub)/      # Main application pages
│   ├── components/          # Reusable UI and feature components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # API client and utility helpers
│   └── store/               # Global state, including auth state
```

## API Routes

- `GET /health` - service health check
- `POST /api/auth/register` - create account
- `POST /api/auth/login` - sign in
- `POST /api/auth/refresh` - refresh tokens
- `POST /api/auth/logout` - sign out
- `GET /api/auth/me` - current user profile
- `PATCH /api/auth/regenerate-username` - regenerate username
- `GET /api/resumes` - list resumes
- `GET /api/resumes/my` - current user's resumes
- `GET /api/resumes/:id` - get one resume
- `POST /api/resumes` - create resume
- `PUT /api/resumes/:id` - update resume
- `DELETE /api/resumes/:id` - delete resume
- `POST /api/resumes/:id/like` - toggle like
- `GET /api/comments/resume/:resumeId` - list comments for a resume
- `POST /api/comments/resume/:resumeId` - add comment
- `PUT /api/comments/:id` - update comment
- `DELETE /api/comments/:id` - delete comment
- `POST /api/comments/:id/replies` - add reply
- `POST /api/comments/:id/vote` - vote on a comment
- `POST /api/upload/resume` - upload resume file
- `POST /api/upload/avatar` - upload avatar image

## Local Setup

### Prerequisites

- Node.js
- MongoDB connection string
- Cloudinary account

### Backend

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/env.example` and set the required values:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `UPLOAD_MAX_BYTES`
- `FRONTEND_ORIGIN`
- `CROSS_SITE_COOKIES`

Run the backend:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` with the backend API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Run the frontend:

```bash
npm run dev
```

## Scripts

### Backend

- `npm run dev` - start the API in development mode
- `npm run dev:worker` - start the API with worker mode enabled
- `npm run build` - compile TypeScript
- `npm run start` - run the compiled server

### Frontend

- `npm run dev` - start the Next.js dev server
- `npm run build` - build the frontend
- `npm run start` - start the production frontend
- `npm run lint` - run ESLint
