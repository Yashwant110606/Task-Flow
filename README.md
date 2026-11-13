# 📋 TaskFlow

A modern, full-stack task management application with Google Authentication, real-time workflow states, and a scalable cloud database powered by **MongoDB Atlas**.

---

## 🌟 Key Features & Functions

### 🔐 1. Authentication & User Profile
- **Google Sign-In:** Secure one-click authentication powered by Firebase Auth.
- **Server-Side Token Verification:** Express backend securely verifies Google ID tokens using Google's Identity Toolkit API with in-memory caching for minimal latency.
- **Auto-Provisioning:** User profiles (`uid`, `displayName`, `email`, `photoUrl`) are automatically synchronized to MongoDB Atlas upon sign-in.

### 🗂️ 2. Dual-View Task Management
- **Kanban Board View:** Visual column workflow (*Planned*, *In Progress*, *Complete*) with one-click status transitions.
- **List View:** Compact, detailed tabular layout displaying creation dates, due dates, priority tags, and quick-action menus.
- **Optimistic UI Updates:** State changes transition instantly on the client while syncing with the server in the background, with automatic rollback if an error occurs.

### ⚡ 3. Task Attributes & Controls
- **Workflow Statuses:** `Planned` ➔ `In Progress` ➔ `Complete`.
- **Priority Levels:** Color-coded priority badges (`Low`, `Medium`, `High`) with rank-based sorting.
- **Due Dates:** Custom due date scheduling with dynamic badges and overdue alerts.
- **Search & Filtering:** Instant live search across titles and descriptions, combined with status filters.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["Frontend (React 19 + Vite + Tailwind)"]
    Auth["Google Identity / Firebase Auth"]
    Server["Backend API (Node.js + Express)"]
    DB[("MongoDB Atlas (Cloud Cluster)")]

    Client -->|"1. Signs in with Google"| Auth
    Auth -->|"2. Returns Google ID Token"| Client
    Client -->|"3. Authorized API requests (Bearer Token)"| Server
    Server -->|"4. Verifies Token"| Auth
    Server -->|"5. Reads & Writes (tasks, users)"| DB
    Server -->|"6. Returns JSON Response"| Client
```

### Architecture Breakdown:

1. **Frontend Layer (Client):**
   * **Framework:** React 19 with TypeScript, built using Vite.
   * **Styling:** Tailwind CSS v4 with modern responsive utility classes.
   * **Icons & Animation:** Lucide React icons and smooth motion transitions.
   * **State & Networking:** Centralized API client with automatic token refreshing and error handling.

2. **Backend Layer (Server):**
   * **Framework:** Express.js on Node.js with TypeScript (`tsx`).
   * **Middleware:** CORS protection, JSON payload limits, and authentication guards.
   * **Dual Operating Mode:**
     * *Development:* Vite middleware integration for Hot Module Replacement (HMR).
     * *Production:* Serves optimized static assets (`dist/`) while hosting `/api/*` endpoints.

3. **Database Layer (Storage):**
   * **Provider:** MongoDB Atlas (Cloud Replica Set).
   * **Collections:**
     * `tasks`: Stores task items, ownership (`userId`), priority, status, and timestamps.
     * `users`: Stores synchronized Google user profiles and last login timestamps.
   * **Indexes:** Optimized compound indexing (`userId + updatedAt + _id`) for instantaneous query execution.

---

## 🔌 API Reference

All `/api/tasks` endpoints require a valid Google ID token passed via the `Authorization: Bearer <token>` header.

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | None |
| `GET` | `/api/me` | Fetch authenticated user profile | None |
| `GET` | `/api/tasks` | List tasks for the authenticated user (supports `?status=` and `?q=`) | None |
| `POST` | `/api/tasks` | Create a new task | `{ title, description?, status?, priority?, dueDate? }` |
| `PATCH` | `/api/tasks/:id` | Update fields on an existing task | `{ title?, description?, status?, priority?, dueDate? }` |
| `DELETE` | `/api/tasks/:id` | Permanently delete a task | None |

---

## ⚙️ Environment Variables

Configure these variables in your `.env` file (see `.env.example`):

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `MONGODB_URI` | **Required.** MongoDB Atlas connection SRV string | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/taskflow?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | Name of the target MongoDB database | `taskflow` |
| `PORT` | Local and production server port | `3000` |
| `CORS_ORIGIN` | Allowed frontend origin URLs (comma-separated) | `http://localhost:3000,http://localhost:5173` |
| `VITE_API_URL` | Base API URL for frontend (leave empty for single-service hosting) | `https://your-backend.onrender.com` |

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yashwant110606/TaskFlow.git
   cd TaskFlow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI="your-mongodb-atlas-connection-string"
   MONGODB_DB_NAME="taskflow"
   PORT=3000
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment

### Option A: All-in-One on Render (Recommended)
1. Go to [Render.com](https://render.com) and create a new **Web Service**.
2. Connect your GitHub repository: `Yashwant110606/TaskFlow`.
3. Configure the service:
   * **Runtime:** Node
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm start`
4. Add the **Environment Variable**:
   * Key: `MONGODB_URI`
   * Value: *Your MongoDB Atlas connection string*
5. Click **Deploy Web Service**.

### Option B: Split Deployment (Vercel + Render)
* **Backend (Render):**
  * Deploy as a Web Service on Render with `MONGODB_URI` and set `CORS_ORIGIN` to your Vercel URL.
* **Frontend (Vercel):**
  * Import repository into Vercel.
  * Set `VITE_API_URL` in Vercel project settings to your Render backend URL.

---

## 🛡️ Security

- **Environment Isolation:** Sensitive credentials (`MONGODB_URI`, passwords) are restricted to `.env` and excluded from git via `.gitignore`.
- **Token Verification:** User requests are verified server-side with Google Identity Toolkit, preventing user impersonation.
- **Data Scoping:** All database queries strictly filter by `userId`, guaranteeing users can only read or modify their own data.
