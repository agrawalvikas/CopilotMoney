
# Feature Plan: Transaction Rules Engine & Flow System

This document outlines the phased implementation plan for creating a user-configurable rules engine for transaction categorization and a more sophisticated transaction flow system.

---

## Phase 1: Core System Refactoring (The Foundation)

**Goal:** Update the underlying database schema and services to support the new logic.

*   **Task 1.1: Enhance the Database Schema**
    *   **File:** `apps/api/prisma/schema.prisma`
    *   **Action:**
        1.  Add a new `TransactionFlow` enum to define our standard internal types.
            ```prisma
            enum TransactionFlow {
              INCOME
              EXPENSE
              TRANSFER
            }
            ```
        2.  Update the `Transaction` model to use this enum. The `type` column will now be for the raw data from Teller, while `flow` will be our reliable internal standard.
            ```prisma
            model Transaction {
              // ... existing fields
              type     String // Raw type from Teller, e.g., 'debit', 'card_payment'
              flow     TransactionFlow
            }
            ```
        3.  Add the new `CategorizationRule` model to store user-defined rules.
            ```prisma
            model CategorizationRule {
              id                  String   @id @default(cuid())
              userId              String
              user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
              descriptionContains String
              categoryId          String
              category            Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

              @@unique([userId, descriptionContains])
            }
            ```
    *   **Migration:** Run `npx prisma migrate dev --name transaction_flow_and_rules` to apply these changes to the database.

*   **Task 1.2: Create the `TransactionMapperService`**
    *   **File:** `apps/api/src/transactions/transaction-mapper.service.ts`
    *   **Action:** Create a new injectable NestJS service. This service will contain the logic to map a raw transaction from Teller to our internal `TransactionFlow`.
    *   **Implementation Detail:** The service will contain a set of configurable rules. For example:
        ```typescript
        const rules = [
          { tellerType: 'payment', flow: TransactionFlow.TRANSFER },
          { tellerType: 'credit', flow: TransactionFlow.INCOME },
          { tellerType: 'debit', flow: TransactionFlow.EXPENSE },
          // etc.
        ];
        ```
    *   This service will be added to the `providers` and `exports` array of the `TransactionsModule`.

*   **Task 1.3: Update Data Sync & Dashboard**
    *   **File:** `apps/api/src/teller/teller.service.ts`
    *   **Action:** Inject the new `TransactionMapperService` and use it during the data sync process to correctly populate the new `flow` column for every transaction.
    *   **File:** `apps/api/src/dashboard/dashboard.service.ts`
    *   **Action:** Update all aggregate queries. Any query for calculating income or expenses will be modified to use the new `flow` column (e.g., `where: { flow: 'EXPENSE' }`) instead of the unreliable `type` field. This will make the dashboard calculations accurate.

---

## Phase 2: Backend Rules Engine & API

**Goal:** Build the backend functionality for users to manage and apply their custom rules.

*   **Task 2.1: Build Rule Management API**
    *   **Action:** Create a new `CategorizationRulesModule` with a controller and service.
    *   **Endpoints:** Implement the full set of CRUD endpoints (`GET`, `POST`, `DELETE` at `/api/v1/rules`) to allow the frontend to manage rules. All endpoints will be protected and scoped to the authenticated user.

*   **Task 2.2: Build the "Rules Engine" & Backfill Endpoint**
    *   **Action:** Create a `RulesEngineService` that can apply a user's set of rules to a list of transactions.
    *   **Action:** Create the `POST /api/v1/transactions/backfill` endpoint. This endpoint will fetch all of a user's transactions, pass them through the `RulesEngineService`, and update their `categoryId` in the database. This will be done in batches to handle large numbers of transactions efficiently.

---

## Phase 3: Frontend UI for Rule Management

**Goal:** Create the user interface for managing categorization rules.

*   **Task 3.1: Build the UI**
    *   **Action:** Create a new page at `/settings/rules`.
    *   **Implementation:** This page will be a client-side component that allows users to:
        *   View their existing rules in a list.
        *   Create a new rule with a text input (`descriptionContains`) and a category dropdown.
        *   Delete rules.
        *   Trigger the backfill process with a button click.

