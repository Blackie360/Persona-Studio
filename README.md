# Persona Studio

An AI-powered avatar generation application.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables in `.env.local`:
   ```env
   DATABASE_URL=your_database_url
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   BETTER_AUTH_SECRET=your_better_auth_secret
   BETTER_AUTH_URL=your_better_auth_url
   ADMIN_SESSION_SECRET=your_admin_session_secret (optional, defaults to BETTER_AUTH_SECRET)
   ```

3. Run database migrations:
   ```bash
   pnpm drizzle-kit push
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

## Admin Dashboard

Access the admin dashboard at `/admin/login` with your admin credentials.

## Security Notes

- Never commit `.env.local` or any files containing secrets
- Admin credentials should be set via environment variables, not hardcoded
- Admin users must be created directly in the database or through a secure admin interface
