# Finance Tracker - "Copilot Money" Clone

This project is a modern, scalable personal finance and budgeting application designed to provide a holistic view of a user's financial life. It aggregates data from various financial institutions, provides powerful budgeting tools, and offers insightful visualizations.

## ✨ Vision

Our mission is to build a secure, intuitive, and powerful personal finance platform. We empower users to take control of their financial lives by providing a clean, fast, and insightful user experience. **Security and data privacy are non-negotiable.**

---

## 🚀 Core Features (Roadmap)

- **Account Aggregation:** Securely connect to thousands of financial institutions.
- **Transaction Management:** Automatically pull, categorize, and edit transactions.
- **Manual Transactions:** Add cash, Venmo, or other out-of-band transactions.
- **Dashboard & Visualization:** At-a-glance summaries of income, expenses, and cash flow.
- **Budgeting Engine:** Set category-based budgets with optional rollovers.
- **Investment Tracking:** Monitor investment performance and holdings.
- **Net Worth Calculation:** A real-time view of your total assets and liabilities.

---

## 💻 Tech Stack

This project uses a modern, decoupled, and scalable technology stack.

- **Frontend:** Next.js (React) with TypeScript & Tailwind CSS
- **Backend:** NestJS (Node.js) with TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Clerk
- **Data Aggregation:** Teller.io
- **Deployment:** Vercel (Frontend) & AWS/Railway (Backend)

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm (or npm/yarn)
- Docker & Docker Compose
- Access keys for Clerk and Teller.io

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-name>
    ```

2.  **Install dependencies:**
    This project uses a monorepo structure. Install dependencies from the root directory.
    ```bash
    pnpm install
    ```

3.  **Setup Environment Variables:**
    Create a `.env` file in both the `apps/web` (frontend) and `apps/api` (backend) directories. Refer to `.env.example` in each directory for the required variables.

4.  **Start the development environment:**
    This command will start the database in Docker and launch both the backend and frontend development servers.
    ```bash
    pnpm dev
    ```

- The Next.js frontend will be available at `http://localhost:3000`.
- The NestJS backend API will be available at `http://localhost:3001`.