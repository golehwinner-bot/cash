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
5. Для створення таблиць у прод-БД запусти Prisma push один раз (локально/CI):
- `npx prisma db push`

## Локально через Docker Desktop

1. Встанови та запусти Docker Desktop.
2. У корені проєкту виконай:

```bash
docker compose up --build
```

3. Відкрий застосунок: `http://localhost:3000`
4. PostgreSQL буде доступний на `localhost:5432`.

Корисні команди:

```bash
# зупинити контейнери
docker compose down

# зупинити і видалити том БД (повне очищення локальної БД)
docker compose down -v

# перегляд логів
docker compose logs -f
```

## Локальний запуск без Docker (опційно)

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
