# 🚀 How to Run and Verify This Project

My apologies for not providing these instructions earlier. Here is a complete guide to get the backend application running in your local environment.

### Prerequisites

*   You have `npm` (or a similar package manager) installed.
*   You have `docker` installed and the Docker daemon is running.

### Step 1: Install Dependencies

If you haven't already, install all the project dependencies from the root directory of the monorepo.

```bash
npm install
```

### Step 2: Create the Environment File

The application requires an environment file named `.env` to be present in the `apps/api` directory.

Create a new file at `apps/api/.env` and paste the following content into it.

**Important:** You will need to provide your actual Teller API credentials. The `ENCRYPTION_KEY` has been pre-generated for you.

```dotenv
# ---------------------------------
# DATABASE CONNECTION
# ---------------------------------
# This should match the credentials in the docker-compose.yml file.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# ---------------------------------
# TELLER.IO API CREDENTIALS
# ---------------------------------
# Replace these with your actual credentials from the Teller Dashboard.
TELLER_APP_ID="YOUR_TELLER_APP_ID"
TELLER_CERTIFICATE="-----BEGIN CERTIFICATE-----\nYOUR_MULTI_LINE_CERTIFICATE\n-----END CERTIFICATE-----"
TELLER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_MULTI_LINE_PRIVATE_KEY\n-----END PRIVATE KEY-----"

# ---------------------------------
# SECURITY
# ---------------------------------
# A 32-byte (256-bit) secret key for encrypting access tokens.
ENCRYPTION_KEY="87350f2d9dfa240b85b16ece888c3b703522e25911cf975371a3e8fdac5e480a"
```

### Step 3: Start the Database

From the root of the project, run the following command to start the PostgreSQL database container in the background.

```bash
# Use sudo if you encounter permission errors with the Docker daemon
sudo docker compose up -d
```

### Step 4: Run Database Migrations

Once the database is running, you need to apply the schema migrations. Run this command from the root directory:

```bash
cd apps/api && npx prisma migrate dev
```
*Note: You may need to `cd ..` to return to the root directory after this step.*


### Step 5: Build the Application

Now, build the backend application. This command will first generate the Prisma client and then compile the TypeScript code.

```bash
cd apps/api && npm run build
```
*Note: You may need to `cd ..` to return to the root directory after this step.*

### Step 6: Run the Application

Finally, you can start the application in production mode.

```bash
cd apps/api && npm run start:prod
```

The application should now be running, and the `ENCRYPTION_KEY` error should be resolved. You can now make requests to the API (e.g., via the frontend application or a tool like Postman).
