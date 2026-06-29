# Conversion Walkthrough — React + Express Restructure with JWT Auth

We have successfully restructured the **Intelligent Next Best Action (INBA) Platform** from a monolithic vanilla HTML/JS setup into a modern, production-ready **React (Vite)** + **Express (Node.js)** application with a clean separation of concerns and JWT-based authentication.

---

## What was Done

1. **Folder Separation**:
   - **`client/`**: Contains the React SPA. Built using Vite, React 19, and React Router 7. Includes the light-themed design system, 7 page components, and context providers.
   - **`server/`**: Contains the Express backend. Houses the JWT authentication routes, the Gemini API completion/embedding proxy routes, and the JWT validation middleware.
2. **JWT Authentication**:
   - Added `/api/auth/register` and `/api/auth/login` endpoints using `bcryptjs` and `jsonwebtoken`.
   - Built a custom `authMiddleware` to protect `/api/complete` and `/api/embed`.
   - Created `<AuthProvider>` on the client to manage login/register/logout states and persist the JWT in `localStorage`.
   - Guarded all application pages behind a `<ProtectedRoute>` component.
3. **Agent & Memory Migration**:
   - Moved all 7 agent classes, `Blackboard.js`, `VectorDB.js`, and the data registries (`categories.js`, `scenarios.js`) into `client/src/services/`.
   - Updated the agents to use `apiFetch()`, which automatically appends the `Authorization: Bearer <token>` header to all requests.
   - Guarded `localStorage` inside `apiFetch` and `VectorDB` to make them Node-safe, ensuring the CLI demo still runs perfectly.
4. **Cleanup**:
   - Deleted the old root-level `index.html`, `styles.css`, `app.js`, `server.js`, `agents/`, `memory/`, and `data/` folders to keep the workspace clean and maintainable.
   - Updated the root `package.json` with a script to install and run both servers concurrently.

---

## Folder Structure

```
Intelligent-Next-Best-Action/
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── components/                  # Pages, Auth, and Layout components
│   │   ├── context/                     # Auth and Pipeline React contexts
│   │   ├── services/                    # Migrated Agent, Memory, and Data services
│   │   └── main.jsx & App.jsx           # Entry points and routing
│   └── vite.config.js                   # Proxies /api -> http://localhost:3001
│
├── server/                              # Express backend
│   ├── middleware/                      # JWT authentication middleware
│   ├── routes/                          # Auth and LLM routes
│   └── server.js                        # Express server entry point
│
├── workflow_runner.js                   # Standalone CLI demo (updated imports)
├── package.json                         # Root runner scripts (dev concurrently)
└── .gitignore                           # Git ignore rules
```

---

## How to Run the Application

### 1. Configure the Environment
Ensure your Gemini API key is configured in `server/.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
JWT_SECRET=inba_platform_jwt_secret_key_2026
```

### 2. Install Dependencies
Run the helper script at the root of the project to install all dependencies for the root, client, and server:
```bash
npm run install:all
```

### 3. Start the Development Server
Run the concurrent development command:
```bash
npm run dev
```
This will start:
- The Express backend on `http://localhost:3001`
- The React Vite dev server on `http://localhost:5173`

Open `http://localhost:5173` in your browser. You will be automatically redirected to the `/login` page!

---

## Verifying the Work

1. **Authentication**:
   - Navigate to `http://localhost:5173`. You should see the login screen.
   - Click **Create one** to go to the Register screen. Create a new account.
   - You will be logged in and redirected to the **Dashboard**.
   - Click the user avatar in the top-right navbar to log out and verify that accessing `/` redirects you back to `/login`.
2. **Agent Pipeline**:
   - Go to the **Analyze interaction** page.
   - Select a scenario (e.g., *SSO Login Blocker*).
   - Click **Analyze & generate recommendations**.
   - You will be transitioned to the **Agent pipeline** page, where the agent nodes will animate as they execute, logging their progress in the console box.
   - Once complete, you will be redirected to the **Recommendations** page, displaying the generated Next Best Actions and explanations.
3. **CLI Demo**:
   - Verify the CLI runner still works by running:
     ```bash
     npm run demo
     ```
