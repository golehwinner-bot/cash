# Cashflow Compass

Вебзастосунок для обліку витрат і доходів з авторизацією та сімейними бюджетами.

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma + PostgreSQL
- NextAuth (Credentials)

## Робота через GitHub + Vercel (без локального запуску)

1. Зміни в коді робимо у GitHub (web editor або через PR).
2. У Vercel проєкт має бути імпортований з цього репозиторію.
3. У Vercel додай Environment Variables:
- `DATABASE_URL` = рядок підключення до Neon/Postgres
- `NEXTAUTH_SECRET` = випадковий секрет (мінімум 32 байти)
- `NEXTAUTH_URL` = URL твого прод-домену (наприклад `https://cash-l5cb.vercel.app`)
4. Після додавання env змінних зроби Redeploy у Vercel.
5. Для створення таблиць у БД запусти Prisma push один раз через Vercel/CI або локально:
- `npx prisma db push`

## Локальний запуск (опційно)

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

## API

- `POST /api/auth/register` - створює користувача і перший household
- `GET /api/households` - повертає household-и поточного користувача
- `POST /api/households` - створює household
- `POST /api/households/:id/members` - додає/оновлює роль учасника

## Важливо

- Ніколи не коміть реальні секрети у `.env.example`.
- Прод-значення зберігай тільки у Vercel Environment Variables.
