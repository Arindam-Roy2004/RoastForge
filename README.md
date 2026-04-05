# RoastForge 🔥

RoastForge is an interactive platform built for developers, designers, and job seekers to upload their resumes and projects, and receive honest, community-driven "roasts" (reviews), constructive feedback, and advice.

**Live Demo:** [https://roastforge-web.vercel.app/](https://roastforge-web.vercel.app/)

## 🏗️ System Architecture

The project follows a decoupled client-server architecture:

1. **Frontend (Client):** Built with **Next.js 14+ (App Router)**, React, and Tailwind CSS. It communicates with the backend via robust REST APIs. It provides an interactive UI with client-side state management and optimistic UI updates for voting and commenting.
2. **Backend (API Server):** Built with **Node.js, Express, and TypeScript**. It serves as the core engine to handle user authentication, resume management, multi-level threaded comments, and rating algorithms.
3. **Database:** **MongoDB** (via Mongoose), perfect for handling flexible schemas like nested comments, likes, and user profiles.

## 🧱 DTO-Based Architecture & Backend Design

The backend enforces a clean **Module-based MVC (Model-View-Controller) Architecture** combined with **Data Transfer Objects (DTOs)**. 

- **DTOs (`req.body` validation):** Data Transfer Objects are used to explicitly define the schema of incoming requests. Using validation middlewares, requests are validated against these DTOs *before* reaching the controller. This ensures strict type safety, prevents injection attacks, and keeps controllers focused solely on HTTP request/response handling.
- **Controllers:** Handle HTTP logic, extract parameters/body, and delegate business logic to services.
- **Services:** Contain pure business rules (e.g., algorithmic sorting for "hot" resumes, recursive comment tree logic).
- **Middlewares:** Handle cross-cutting concerns like Async Error Handling, JWT Authentication, and DTO Validation.

## 📂 Project Structure

```text
RoastForge/
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── common/             # Shared utilities (DB connect, API responses, middlewares)
│   │   │   ├── dto/            # Base DTOs
│   │   │   └── middleware/     # validation.middleware.ts, auth.middleware.ts
│   │   └── modules/            # Feature-based modular architecture
│   │       ├── auth/           # Login, Register, JWT, User Model
│   │       ├── comment/        # Nested replies, upvotes/downvotes
│   │       ├── resume/         # Resume upload, hot/new sorting
│   │       └── upload/         # Cloudinary media/pdf upload integration
│   └── package.json
└── frontend/                     # Next.js App Router
    ├── src/
    │   ├── app/                # Next.js Routes (page.tsx, layout.tsx)
    │   │   └── (roasthub)/     # Route groups for main app context
    │   ├── components/         # Reusable React UI Components (Cards, Comments)
    │   ├── hooks/              # Custom React hooks
    │   ├── lib/                # API wrappers, utility functions
    │   └── store/              # Global state (Auth Store)
    └── package.json
```

## ✨ Core Features

- **Authentication & Aliasing:** Secure JWT-based auth. Users receive anonymous aliases (e.g., "Anon") to protect their identity.
- **File Uploads:** Upload resumes as PDFs or Images (handled securely via Cloudinary).
- **Multi-Level Commenting:** Reddit-style nested comment threads.
- **Categorized Feedback:** Prefix feedback with context tags like `[STRENGTH]`, `[WEAKNESS]`, or `[SUGGESTION]`.
- **Voting System:** Upvote/downvote comments and "like" resumes, utilizing an algorithm to surface "hot" or "top" uploads.
- **Delete & Manage:** Full CRUD capabilities for users over their own uploaded resumes and comments.

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- MongoDB connection string
- Cloudinary Account (for uploads)

### 1. Backend Setup
```bash
cd backend
npm install
# Create an .env file matching env.example (PORT, MONGO_URI, JWT_SECRET, CLOUDINARY credentials)
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Create a .env.local file with NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
```

Visit `http://localhost:3000` to see the app running locally.

## 🤝 Acknowledgments
Built to make standard resume reviews more engaging and interactive. Thanks to the open-source community for standardizing DTO-based architectures in Express!