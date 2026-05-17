Admin test credentials and seeding

Use the included seed script to create a test admin (customer + approved company + company_user with role ADMIN).

Run:

```
pnpm --filter @ctg/backend medusa exec ./src/scripts/seed-admin-user.ts
```

What it does:
- Creates a new customer with an email like `test-admin+<timestamp>@example.com`.
- Attempts to set the password to `TestAdmin123!` (may or may not be accepted depending on your customer service implementation).
- Creates a company and marks it as approved.
- Creates a `company_user` linking the created customer as `ADMIN` and primary contact.

If the password was not accepted on creation:
- Set the password manually in the database (hash with bcrypt) or use your app's password-reset flow.
- Example SQL (Postgres) to update a password hash (adapt as needed):

```
-- generate bcrypt hash locally, then:
UPDATE customer SET password_hash = '<bcrypted-password>' WHERE email = 'test-admin+<timestamp>@example.com';
```

Notes:
- This script is intended for test/dev only. Do not commit real production secrets.
- The generated email and password will be printed to the medusa exec logger output when the script runs.
