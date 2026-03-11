# Cashflow Compass

Expense and income tracker with a foundation for family budgets.

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma + PostgreSQL
- NextAuth (Credentials)

## Local setup

```bash
npm install
```

1. Create `.env` from `.env.example`.
2. Fill these variables:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=http://localhost:3000`

3. Prepare database:

```bash
npm run db:generate
npm run db:push
```

4. Run app:

```bash
npm run dev
```

## Auth and households

- `POST /api/auth/register` � create user + initial household
- `GET /api/households` � list user households
- `POST /api/households` � create household
- `POST /api/households/:id/members` � add/update household member role

## Security notes

- Never commit real secrets to `.env.example`.
- Keep production values only in Vercel Environment Variables.
