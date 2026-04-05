# 🔥 RoastForge

RoastForge is an interactive platform for developers, designers, and job seekers to upload their resumes and projects and receive honest, community-driven **“roasts”** (reviews), constructive feedback, and actionable advice.

🌐 **Live Demo:** https://roastforge-web.vercel.app/

---

## 🏗️ System Architecture

RoastForge follows a **decoupled client-server architecture**:

### 1. Frontend (Client)

* Built with **Next.js 14+ (App Router)**, React, and Tailwind CSS
* Communicates with backend via REST APIs
* Features:

  * Interactive UI
  * Optimistic updates (votes, comments)
  * Client-side state management

---

### 2. Backend (API Server)

* Built with **Node.js, Express, and TypeScript**
* Responsible for:

  * Authentication (JWT)
  * Resume & project management
  * Multi-level threaded comments
  * Voting and ranking logic

---

### 3. Database

* **MongoDB (Mongoose)**
* Handles:

  * Nested comment structures
  * User data
  * Resume/project documents

---

## 🧱 Backend Architecture (DTO + Modular MVC)

The backend uses a **feature-based modular MVC architecture** combined with **DTO-driven validation**.

### 📦 DTOs (Data Transfer Objects)

* Define strict schemas for incoming requests
* Validated via middleware before reaching controllers
* Benefits:

  * Type safety
  * Security (prevents malformed input)
  * Cleaner controller logic

---

### 🎮 Controllers

* Handle HTTP requests/responses
* Extract params/body
* Delegate logic to services

---

### ⚙️ Services

* Contain core business logic:

  * Resume ranking algorithms
  * Comment tree handling
  * Voting systems

---

### 🔌 Middlewares

* Handle cross-cutting concerns:

  * JWT Authentication
  * DTO Validation
  * Async error handling

---

## 📂 Project Structure

```text
RoastForge/
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── common/             # Shared utilities
│   │   │   ├── dto/            # Base DTOs
│   │   │   └── middleware/     # Auth, validation, error handling
│   │   └── modules/            # Feature-based modules
│   │       ├── auth/           # Authentication (JWT, User)
│   │       ├── comment/        # Nested replies, voting
│   │       ├── resume/         # Resume logic, sorting
│   │       └── upload/         # Cloudinary integration
│   └── package.json
│
└── frontend/                   # Next.js App Router
    ├── src/
    │   ├── app/                # Routes (App Router)
    │   │   └── (roasthub)/     # Route grouping
    │   ├── components/         # Reusable UI components
    │   ├── hooks/              # Custom React hooks
    │   ├── lib/                # API utilities
    │   └── store/              # Global state (Auth)
    └── package.json
```

---

## ✨ Core Features

* 🔐 **Authentication & Aliasing**

  * JWT-based authentication
  * Anonymous user identities

* 📄 **File Uploads**

  * Upload resumes (PDF/Image)
  * Managed via Cloudinary

* 🧵 **Multi-Level Commenting**

  * Reddit-style nested threads

* 🏷️ **Categorized Feedback**

  * Tag feedback:

    * `[STRENGTH]`
    * `[WEAKNESS]`
    * `[SUGGESTION]`

* 👍 **Voting System**

  * Upvote/downvote comments
  * Resume ranking (hot/top logic)

* 🗑️ **Full CRUD Control**

  * Users can manage their own:

    * Resumes
    * Comments

---

## 🚀 Local Development Setup

### 📌 Prerequisites

* Node.js (v18+)
* MongoDB (Atlas recommended)
* Cloudinary account

---

### ⚙️ Backend Setup

```bash
cd backend
npm install
```

Create `.env` file (based on `env.example`):

```env
PORT=
MONGODB_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Run:

```bash
npm run dev
```

---

### 🎨 Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Run:

```bash
npm run dev
```

---

### 🌐 Access App

Open:

```
http://localhost:3000
```

---

## 🧠 Notes

RoastForge was created to solve a real problem:

> Traditional resume reviews are passive — this makes them **interactive and transparent**.
