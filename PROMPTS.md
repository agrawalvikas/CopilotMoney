Phase 0 Prompts
Task 1 Prompt:
"Let's begin Phase 0, Task 1.
Task: In the apps/api directory of our monorepo, initialize a new NestJS project with TypeScript. Then, install the following core dependencies: @nestjs/config, prisma, and @clerk/nestjs. Ensure the Prisma CLI is installed as a dev dependency."

Task 2 Prompt:
"Proceed with Phase 0, Task 2.
Task: Create a docker-compose.yml file in the project root to run a PostgreSQL 15 container. Define a service named db. Set the required environment variables for the PostgreSQL user, password, and database name. Then, create a .env file in apps/api and add the DATABASE_URL variable, configuring it for Prisma to connect to this Docker container."

Task 3 Prompt:
"Let's do Phase 0, Task 3.
Task: Create the initial Prisma schema in apps/api/prisma/schema.prisma. Define the models for User, Account, Transaction, and Category based on the Low-Level Design we discussed. After defining the schema, run the prisma migrate dev command to generate the SQL migration and apply it to the database."

Task 4 Prompt:
"Time for Phase 0, Task 4.
Task: Integrate Clerk into the NestJS application for authentication. Configure the AuthModule with your Clerk credentials from the environment variables. Then, create a simple test endpoint, GET /api/v1/test, that is protected by the Clerk auth guard and returns a success message. This will verify that our authentication setup is working."

Task 5 Prompt:
"Let's move to Phase 0, Task 5.
Task: In the apps/web directory, initialize a new Next.js project using the App Router, TypeScript, and Tailwind CSS."

Task 6 Prompt:
"Now for Phase 0, Task 6.
Task: Integrate Clerk into the Next.js app. Wrap the root layout (/app/layout.tsx) with the <ClerkProvider> to make authentication available throughout the application."

Task 7 Prompt:
"Let's complete Phase 0 with Task 7.
Task: Create the basic page and routing structure in the Next.js app. This includes:

A public landing page at the root (/app/page.tsx).

The sign-in and sign-up pages using Clerk's components at /app/sign-in/[[...sign-in]]/page.tsx and /app/sign-up/[[...sign-up]]/page.tsx.

A protected dashboard page at /app/dashboard/page.tsx. Ensure this page redirects unauthenticated users to the sign-in page."

Phase 1 Prompts
Task 8 Prompt:
"Let's begin Phase 1, Task 8.
Task: In the NestJS backend, create a new TellerModule. Within this module, create a TellerService. This service should be responsible for all future interactions with the Teller.io API. Initialize the Teller client using the API keys, which should be loaded securely from environment variables via the ConfigService."

Task 9 Prompt:
"Time for Phase 1, Task 9.
Task: Implement the POST /api/v1/connections endpoint in the NestJS backend. This endpoint must be authenticated. It will receive an enrollmentId in the request body from the frontend. Your implementation should then call the Teller API to exchange this for a permanent accessToken. Securely encrypt this token before storing it in a new Connection table in our database, linked to the authenticated user's ID."

Task 10 Prompt:
"Let's proceed with Phase 1, Task 10.
Task: Implement the POST /api/v1/sync endpoint. This endpoint will be used to pull data for a specific connection. It should retrieve the stored accessToken for a given user/connection, make API calls to Teller.io to fetch all associated accounts and transactions, and then save this information into our Account and Transaction tables. Make sure to include logic to prevent creating duplicate records if a sync is run multiple times."

Task 11 Prompt:
"Now for Phase 1, Task 11.
Task: In the Next.js frontend, on the dashboard page, add an "Add Account" button. When this button is clicked, it should initialize and open the Teller Connect SDK. Configure the onSuccess callback of the SDK to receive the enrollmentId and then make a POST request to our /api/v1/connections backend endpoint with this ID."

Task 12 Prompt:
"Let's finish Phase 1 with Task 12.
Task: Create a new page in the frontend at /accounts. This page should make an authenticated API call to our backend to fetch all the Account records for the logged-in user. Display the fetched accounts in a simple list or table, showing the institution name, account name, type, and balance."

Phase 2 Prompts
Task 13 Prompt:
"Let's begin Phase 2, Task 13.
Task: Implement the GET /api/v1/transactions endpoint in the NestJS backend. This endpoint must be paginated and allow filtering by accountId, startDate, and endDate, as specified in our LLD. Ensure it only returns transactions owned by the authenticated user."

Task 14 Prompt:
"Proceed with Phase 2, Task 14.
Task: Implement the PATCH /api/v1/transactions/:id endpoint. This will be used to update a transaction, primarily for changing its categoryId or adding notes. The implementation must verify that the transaction being updated belongs to the authenticated user before applying any changes."

Task 15 Prompt:
"Let's do Phase 2, Task 15.
Task: Implement the POST /api/v1/transactions endpoint. This will be used to create manual transactions (e.g., cash expenses, Venmo payments). The request body will contain the description, amount, date, type (debit/credit), and the accountId it belongs to. Mark these transactions with isManual: true."

Task 16 Prompt:
"Time for Phase 2, Task 16.
Task: In the Next.js frontend, build a new page at /transactions. Create a reusable TransactionTable component that fetches data from our new GET /api/v1/transactions endpoint and displays the transactions in a clear, tabular format. Include columns for Date, Description, Category, and Amount."

Task 17 Prompt:
"Let's move to Phase 2, Task 17.
Task: On the /transactions page, add UI controls for filtering the transaction list. This should include two date-picker inputs (for start and end dates) and a dropdown menu to select a specific account. The TransactionTable should refetch its data when these filters are changed."

Task 18 Prompt:
"Let's complete Phase 2 with Task 18.
Task: Create an EditTransactionModal component in the frontend. When a user clicks on the 'Category' cell within the TransactionTable, this modal should open. It should contain a form, including a dropdown or searchable input for selecting a new category. On submit, it must call our PATCH /api/v1/transactions/:id endpoint and then refresh the transaction list to show the update."

Phase 3 Prompts
Task 19 Prompt:
"Let's begin the final MVP phase with Phase 3, Task 19.
Task: Create a new DashboardModule and implement the GET /api/v1/dashboard/summary endpoint in the NestJS backend. This endpoint must be highly optimized. It should perform aggregate database queries using Prisma to calculate and return key metrics for the current month, such as total income, total expenses, and total spending broken down by category."

Task 20 Prompt:
"Time for Phase 3, Task 20.
Task: Build the main UI layout for the dashboard page at /dashboard. It should be a grid-based layout that will hold various summary and chart components. For now, create placeholder components for each section."

Task 21 Prompt:
"Proceed with Phase 3, Task 21.
Task: Integrate a charting library like Recharts into the Next.js app. Create a SpendingChart component. This component will fetch data from our /api/v1/dashboard/summary endpoint and display the 'spending by category' data as a bar chart."

Task 22 Prompt:
"Let's finish the MVP with Phase 3, Task 22.
Task: Create a SummaryCard component. This component will also fetch data from the dashboard summary endpoint. It should display three key metrics in a clear, visually appealing way: 'Total Income', 'Total Expenses', and 'Net Cash Flow' for the current month. Place this component at the top of the dashboard grid."