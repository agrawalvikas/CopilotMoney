# 📋 Project Vision & Agent Instructions

## 1. The Vision

Our mission is to build a secure, intuitive, and powerful personal finance platform. We empower users to take control of their financial lives by providing a holistic view of their money and the tools to manage it effectively. The user experience should be clean, fast, and insightful. **Security and data privacy are non-negotiable.**

---

## 2. Guiding Principles

- **API-Driven:** All logic and data access must be handled by the backend API. The frontend is for presentation only. This ensures modularity and allows us to support multiple clients (web, mobile) seamlessly.
- **Security First:**
    - Never expose secret keys, API keys, or credentials on the frontend. All sensitive operations must happen on the backend.
    - Use the integrated authentication service (Clerk) for all user management and session control. All API routes must be protected and verify user ownership of data.
    - Sanitize all user inputs to prevent XSS and other injection attacks.
- **Modularity & Reusability:**
    - On the frontend, build small, reusable React components (e.g., `Button`, `Input`, `Chart`, `TransactionRow`).
    - On the backend, separate concerns into modules (e.g., `AuthModule`, `TransactionsModule`, `AccountsModule`) and services (`TellerService`, `SyncService`).
- **Testability:** All critical backend logic (e.g., transaction syncing, budget calculations) must be covered by unit and integration tests (using Jest).
- **Clean, Consistent Code:** Code is written for humans first. Follow the established linting and formatting rules strictly.

---

## 3. Technology & Standards

- **Language:** Use **TypeScript** for everything (backend, frontend, scripts). Enforce strict type checking.
- **Backend (NestJS):**
    - Follow the standard NestJS project structure (modules, controllers, services, providers).
    - Use Prisma as the ORM. All database interactions must go through the Prisma client. Define all models in `schema.prisma`. Use Prisma Migrate for all schema changes.
    - **API Versioning:** All API routes must be prefixed with `/api/v1`.
    - **Error Handling:** Use standard HTTP status codes and provide clear, consistent error messages.
- **Frontend (Next.js):**
    - Use the `app` router.
    - Use Server Components for data fetching where possible to improve performance.
    - **Styling:** Use **Tailwind CSS** for all styling. Create reusable style classes only when necessary.
    - **State Management:** Use **Zustand** for global client-side state. Avoid prop drilling.
    - **Data Fetching:** Use SWR or React Query for client-side data fetching to handle caching, revalidation, and loading states.
- **Environment Variables:**
    - All secrets (API keys, database URLs, JWT secrets) **MUST** be managed via environment variables.
    - Use `.env` for local development. Never commit `.env` files to git.
    - Reference frontend environment variables using `process.env.NEXT_PUBLIC_...`.

---

## 4. Workflow

1.  **Branching:** Create a new feature branch from `main` for every new task (e.g., `feature/add-transaction-modal`).
2.  **Commits:** Write clear, concise commit messages following the Conventional Commits specification (e.g., `feat: add transaction delete endpoint`, `fix: correct category filter logic`).
3.  **Pull Requests (PRs):** Once a feature is complete, open a PR against `main`. The PR description should explain what was done and why. All CI checks (linting, tests) must pass before a PR can be merged.