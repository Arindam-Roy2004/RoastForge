# RoastForge

RoastForge is a full-stack platform where candidates upload resumes and projects, receive AI resume analysis, and collect community feedback through comments, replies, votes, and likes. Recruiters can search candidate profiles and review talent signals in one place.

## Monorepo Layout

- [backend](backend): Express + TypeScript API
- [frontend](frontend): Next.js App Router frontend

## What Is Implemented

### Backend

- JWT auth flow: register, login, refresh, logout, me
- Profile and identity updates: me profile update, anonymous username regeneration
- Account deletion with cascade cleanup
- Resume CRUD, pagination/search/sort, like toggle
- Resume comments, replies, and voting
- Resume and avatar upload to Cloudinary
- AI roast analysis endpoint for resumes
- Candidate project module
- Recruiter candidate search and candidate profile endpoints
- MongoDB persistence (Mongoose), request validation, centralized error handling
- CORS + cookies support and health endpoint

### Frontend

- Next.js App Router structure with route groups
- Auth screens and protected candidate/recruiter flows
- Resume gallery/detail, comments, likes, uploads
- Project and recruiter views
- Shared component library and UI primitives
- Central API client with token refresh handling
- Global auth store

## Project Structure

```text
backend/
├── server.ts
├── env.example
├── src/
│   ├── app.ts
│   ├── common/
│   │   ├── config/
│   │   ├── dto/
│   │   ├── middleware/
│   │   └── utils/
│   └── modules/
│       ├── analysis/
│       ├── auth/
│       ├── comment/
│       ├── project/
│       ├── recruiter/
│       ├── resume/
│       └── upload/

frontend/
├── src/
│   ├── app/
│   │   └── (roasthub)/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── store/
```

## Dependencies

### Backend runtime

- @google/genai
- @upstash/redis
- bcryptjs
- cloudinary
- cookie-parser
- cors
- dotenv
- express
- joi
- jsonwebtoken
- mongoose
- multer
- multer-cloudinary
- nanoid
- pdf-parse

Source: [backend/package.json](backend/package.json)

### Backend development

- @types/bcryptjs
- @types/cookie-parser
- @types/cors
- @types/express
- @types/jsonwebtoken
- @types/multer
- @types/node
- nodemon
- ts-node
- typescript

Source: [backend/package.json](backend/package.json)

### Frontend runtime

- @base-ui/react
- @radix-ui/react-avatar
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-separator
- @radix-ui/react-slot
- @radix-ui/react-tabs
- @tailwindcss/typography
- class-variance-authority
- clsx
- framer-motion
- lucide-react
- next
- react
- react-dom
- react-icons
- socket.io-client
- sonner
- tailwind-merge

Source: [frontend/package.json](frontend/package.json)

### Frontend development

- @tailwindcss/postcss
- @types/node
- @types/react
- @types/react-dom
- eslint
- eslint-config-next
- tailwindcss
- typescript

Source: [frontend/package.json](frontend/package.json)

## API Routes

### Health

- GET /health

### Auth

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me
- PATCH /api/auth/me/profile
- PATCH /api/auth/regenerate-username
- DELETE /api/auth/account

### Resumes

- GET /api/resumes
- GET /api/resumes/my
- GET /api/resumes/:id
- POST /api/resumes
- PUT /api/resumes/:id
- DELETE /api/resumes/:id
- POST /api/resumes/:id/like

### Comments

- GET /api/comments/resume/:resumeId
- POST /api/comments/resume/:resumeId
- PUT /api/comments/:id
- DELETE /api/comments/:id
- POST /api/comments/:id/replies
- POST /api/comments/:id/vote

### Upload

- POST /api/upload/resume
- POST /api/upload/avatar

### Analysis

- POST /api/analysis/:id

### Project

- GET /api/project
- POST /api/project
- DELETE /api/project/:id

### Recruiter

- GET /api/recruiter/candidates
- GET /api/recruiter/candidate/:userId/profile

## Environment Variables

Template: [backend/env.example](backend/env.example)

### Backend required

- PORT
- NODE_ENV
- MONGODB_URI
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- JWT_ACCESS_EXPIRES_IN
- JWT_REFRESH_EXPIRES_IN
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- GOOGLE_AI_KEY
- UPLOAD_MAX_BYTES
- FRONTEND_ORIGIN
- CROSS_SITE_COOKIES

### Frontend required

- NEXT_PUBLIC_API_URL

## Local Setup

1. Install backend dependencies.

	```bash
	cd backend
	npm install
	```

2. Configure backend env.

	Copy [backend/env.example](backend/env.example) to backend/.env and fill values.

3. Run backend.

	```bash
	npm run dev
	```

4. Install frontend dependencies.

	```bash
	cd frontend
	npm install
	```

5. Configure frontend env.

	Create frontend/.env.local with:

	```env
	NEXT_PUBLIC_API_URL=http://localhost:5000
	```

6. Run frontend.

	```bash
	npm run dev
	```

Frontend runs on http://localhost:3000 and backend runs on http://localhost:5000.

## Scripts

### Backend

- npm run dev
- npm run dev:worker
- npm run build
- npm run start

### Frontend

- npm run dev
- npm run build
- npm run start
- npm run lint
