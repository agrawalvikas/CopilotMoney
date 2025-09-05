# 📈 Project Implementation Plan (Task List)

This document outlines the phased development plan for the Finance Tracker application. Each numbered item is a discrete task that can be assigned to a coding agent.

## 📋 How to Use This Plan

1.  **Assign tasks sequentially.** Start with "Phase 0, Task 1" and proceed in order.
2.  **Provide context for each task.** When assigning a task, provide the `AGENT_INSTRUCTIONS.md` as a persistent rulebook.
3.  **Use LLD as a template.** For tasks requiring new API endpoints or components, use the Low-Level Design (LLD) as a guide to create a specific, detailed prompt for the agent.

---

## Phase 0: Foundation & Setup

**Goal:** Establish the project structure, development environment, and core services.

* **Task 1: [Backend]** Initialize a new NestJS project (`apps/api`) with TypeScript and install core dependencies (`@nestjs/config`, `prisma`, `@clerk/nestjs`).
* **Task 2: [Database]** Set up a `docker-compose.yml` file in the root directory to run a PostgreSQL database. Configure Prisma to connect to this database.
* **Task 3: [Database]** Create the initial Prisma schema (`schema.prisma`) with models for `User`, `Account`, `Transaction`, and `Category` based on the LLD. Run `prisma migrate dev` to apply the schema.
* **Task 4: [Backend]** Integrate Clerk for authentication. Create a protected "hello world" endpoint that only authenticated users can access.
* **Task 5: [Frontend]** Initialize a new Next.js project (`apps/web`) with TypeScript and Tailwind CSS.
* **Task 6: [Frontend]** Integrate the `@clerk/nextjs` provider in the root layout to handle frontend authentication.
* **Task 7: [Frontend]** Create the basic page structure: a public landing page (`/`), a sign-in page (`/sign-in`), a sign-up page (`/sign-up`), and a protected dashboard page (`/dashboard`).

---

## Phase 1: Core Data Ingestion

**Goal:** Connect to financial institutions and pull account/transaction data into our database.

* **Task 8: [Backend]** Create a `TellerModule`. Inside it, create a `TellerService` that encapsulates the Teller API client. Store Teller API keys securely using the config service.
* **Task 9: [Backend]** Implement the `POST /api/v1/connections` endpoint. This endpoint should receive a `enrollmentId` from the frontend, exchange it for a permanent `accessToken` with Teller, encrypt the token, and store it in the database associated with the user.
* **Task 10: [Backend]** Implement a job-based `POST /api/v1/sync` endpoint. For now, this endpoint can perform the sync directly. It should use the stored `accessToken` to fetch and store accounts and transactions from Teller, ensuring no duplicates are created.
* **Task 11: [Frontend]** Create an "Add Account" button on the dashboard that launches the Teller Connect SDK. On successful connection, send the `enrollmentId` to the backend.
* **Task 12: [Frontend]** Create a basic "Accounts" page (`/accounts`) that fetches and displays a list of the user's connected accounts from your database.

---

## Phase 2: Transaction Management

**Goal:** Allow users to view, edit, and manually add transactions.

* **Task 13: [Backend]** Implement the `GET /api/v1/transactions` endpoint with filtering by `accountId` and date range, as specified in the LLD.
* **Task 14: [Backend]** Implement the `PATCH /api/v1/transactions/:id` endpoint. Ensure a user can only edit transactions they own.
* **Task 15: [Backend]** Implement the `POST /api/v1/transactions` endpoint for creating manual transactions.
* **Task 16: [Frontend]** Build the "Transactions" page (`/transactions`) with a `TransactionTable` component that fetches and displays data from the new endpoint.
* **Task 17: [Frontend]** Add UI controls for filtering transactions (date pickers, account dropdown).
* **Task 18: [Frontend]** Create an `EditTransactionModal`. When a user clicks a transaction's category, this modal should open and allow them to re-categorize it.

---

## Phase 3: The Dashboard (MVP Launch)

**Goal:** Provide an at-a-glance summary of user finances.

* **Task 19: [Backend]** Create the `GET /api/v1/dashboard/summary` endpoint. This should perform efficient aggregate database queries to calculate metrics like total income vs. expense for a given period.
* **Task 20: [Frontend]** Build the main Dashboard page (`/dashboard`).
* **Task 21: [Frontend]** Integrate a charting library (e.g., Recharts) and create a bar chart component to show spending by category, powered by the new dashboard endpoint.
* **Task 22: [Frontend]** Create a summary card component that displays Total Income, Expenses, and Net Cash Flow for the current month.