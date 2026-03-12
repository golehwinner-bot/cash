import { NextResponse } from "next/server";
import { IncomeCategory, IncomeType, ExpenseSource } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ScopeResolution = { householdId: string } | { error: NextResponse };

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Server error";
};

const incomeCategoryToDb = (value: string): IncomeCategory => {
  switch (value) {
    case "salary":
      return "SALARY";
    case "part_time":
      return "PART_TIME";
    case "rent":
      return "RENT";
    case "sale":
      return "SALE";
    case "fop":
      return "FOP";
    default:
      return "OTHER";
  }
};

const incomeCategoryFromDb = (value: IncomeCategory): string => {
  switch (value) {
    case "SALARY":
      return "salary";
    case "PART_TIME":
      return "part_time";
    case "RENT":
      return "rent";
    case "SALE":
      return "sale";
    case "FOP":
      return "fop";
    default:
      return "other";
  }
};

const incomeTypeToDb = (value: string): IncomeType => (value === "cash" ? "CASH" : "CARD");
const incomeTypeFromDb = (value: IncomeType): string => (value === "CASH" ? "cash" : "card");
const expenseSourceToDb = (value: string): ExpenseSource => (value === "cash" ? "CASH" : "CARD");
const expenseSourceFromDb = (value: ExpenseSource): string => (value === "CASH" ? "cash" : "card");

const formatDateIso = (value: Date) => value.toISOString().slice(0, 10);

const resolveCurrentUserId = async () => {
  const session = await auth();

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.user.id) {
    const byId = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (byId) return { userId: byId.id };
  }

  if (session.user.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (byEmail) return { userId: byEmail.id };
  }

  return {
    error: NextResponse.json(
      { error: "Session is out of sync. Please sign in again." },
      { status: 401 },
    ),
  };
};

const ensurePersonalHousehold = async (userId: string) => {
  const existing = await prisma.household.findUnique({ where: { personalOwnerId: userId }, select: { id: true } });
  if (existing) return existing.id;

  const created = await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: {
        name: "Особистий бюджет",
        personalOwnerId: userId,
      },
      select: { id: true },
    });

    await tx.householdMember.upsert({
      where: {
        userId_householdId: {
          userId,
          householdId: household.id,
        },
      },
      update: { role: "OWNER" },
      create: {
        userId,
        householdId: household.id,
        role: "OWNER",
      },
    });

    return household;
  });

  return created.id;
};

const resolveScopeHouseholdId = async (userId: string, scopeKey: string): Promise<ScopeResolution> => {
  if (!scopeKey || scopeKey === "personal") {
    const householdId = await ensurePersonalHousehold(userId);
    return { householdId };
  }

  if (!scopeKey.startsWith("room:")) {
    return { error: NextResponse.json({ error: "Invalid scope key." }, { status: 400 }) };
  }

  const householdId = scopeKey.slice(5);
  if (!householdId) {
    return { error: NextResponse.json({ error: "Invalid scope key." }, { status: 400 }) };
  }

  const membership = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
    select: { householdId: true },
  });

  if (!membership) {
    return { error: NextResponse.json({ error: "Access denied for this room." }, { status: 403 }) };
  }

  return { householdId };
};

export async function GET(request: Request) {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    const { searchParams } = new URL(request.url);
    const scopeKey = searchParams.get("scopeKey") ?? "personal";

    const scope = await resolveScopeHouseholdId(resolved.userId, scopeKey);
    if ("error" in scope) return scope.error;

    const [expenses, incomes, limits] = await prisma.$transaction([
      prisma.expense.findMany({
        where: { householdId: scope.householdId },
        include: { createdBy: { select: { name: true, email: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.income.findMany({
        where: { householdId: scope.householdId },
        include: { createdBy: { select: { name: true, email: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.categoryLimit.findMany({ where: { householdId: scope.householdId } }),
    ]);

    return NextResponse.json({
      expenses: expenses.map((item) => ({
        id: item.id,
        name: item.title,
        category: item.category,
        source: expenseSourceFromDb(item.source),
        amount: item.amount,
        date: formatDateIso(item.date),
        createdById: item.createdById,
        createdByName: item.createdBy.name || item.createdBy.email || undefined,
      })),
      incomes: incomes.map((item) => ({
        id: item.id,
        name: item.title,
        type: incomeTypeFromDb(item.type),
        category: incomeCategoryFromDb(item.category),
        amount: item.amount,
        date: formatDateIso(item.date),
        createdById: item.createdById,
        createdByName: item.createdBy.name || item.createdBy.email || undefined,
      })),
      limits: limits.map((item) => ({
        category: item.category,
        limit: item.limitAmount,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to load finance data.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    const body = await request.json().catch(() => ({}));
    const scopeKey = String(body.scopeKey ?? "personal");
    const kind = String(body.kind ?? "");

    const scope = await resolveScopeHouseholdId(resolved.userId, scopeKey);
    if ("error" in scope) return scope.error;

    if (kind === "expense") {
      const name = String(body.name ?? "").trim();
      const category = String(body.category ?? "other");
      const source = String(body.source ?? "card");
      const amount = Number(body.amount ?? 0);
      const date = String(body.date ?? "");

      if (!name || !date || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid expense payload." }, { status: 400 });
      }

      const created = await prisma.expense.create({
        data: {
          title: name,
          category,
          source: expenseSourceToDb(source),
          amount: Math.round(amount),
          date: new Date(date),
          householdId: scope.householdId,
          createdById: resolved.userId,
        },
        include: { createdBy: { select: { name: true, email: true } } },
      });

      return NextResponse.json(
        {
          item: {
            id: created.id,
            name: created.title,
            category: created.category,
            source: expenseSourceFromDb(created.source),
            amount: created.amount,
            date: formatDateIso(created.date),
            createdById: created.createdById,
            createdByName: created.createdBy.name || created.createdBy.email || undefined,
          },
        },
        { status: 201 },
      );
    }

    if (kind === "income") {
      const name = String(body.name ?? "").trim();
      const type = String(body.type ?? "card");
      const category = String(body.category ?? "other");
      const amount = Number(body.amount ?? 0);
      const date = String(body.date ?? "");

      if (!name || !date || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid income payload." }, { status: 400 });
      }

      const created = await prisma.income.create({
        data: {
          title: name,
          type: incomeTypeToDb(type),
          category: incomeCategoryToDb(category),
          amount: Math.round(amount),
          date: new Date(date),
          householdId: scope.householdId,
          createdById: resolved.userId,
        },
        include: { createdBy: { select: { name: true, email: true } } },
      });

      return NextResponse.json(
        {
          item: {
            id: created.id,
            name: created.title,
            type: incomeTypeFromDb(created.type),
            category: incomeCategoryFromDb(created.category),
            amount: created.amount,
            date: formatDateIso(created.date),
            createdById: created.createdById,
            createdByName: created.createdBy.name || created.createdBy.email || undefined,
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ error: "Unsupported operation." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to save finance data.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    const body = await request.json().catch(() => ({}));
    const scopeKey = String(body.scopeKey ?? "personal");
    const kind = String(body.kind ?? "");

    const scope = await resolveScopeHouseholdId(resolved.userId, scopeKey);
    if ("error" in scope) return scope.error;

    if (kind === "expense") {
      const id = String(body.id ?? "").trim();
      const name = String(body.name ?? "").trim();
      const category = String(body.category ?? "other");
      const source = String(body.source ?? "card");
      const amount = Number(body.amount ?? 0);
      const date = String(body.date ?? "");

      if (!id || !name || !date || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid expense payload." }, { status: 400 });
      }

      const updated = await prisma.expense.updateMany({
        where: {
          id,
          householdId: scope.householdId,
          createdById: resolved.userId,
        },
        data: {
          title: name,
          category,
          source: expenseSourceToDb(source),
          amount: Math.round(amount),
          date: new Date(date),
        },
      });

      if (updated.count === 0) {
        return NextResponse.json({ error: "Лише автор може редагувати цей запис." }, { status: 403 });
      }

      const item = await prisma.expense.findUnique({
        where: { id },
        include: { createdBy: { select: { name: true, email: true } } },
      });

      if (!item) {
        return NextResponse.json({ error: "Record not found." }, { status: 404 });
      }

      return NextResponse.json({
        item: {
          id: item.id,
          name: item.title,
          category: item.category,
          source: expenseSourceFromDb(item.source),
          amount: item.amount,
          date: formatDateIso(item.date),
          createdById: item.createdById,
          createdByName: item.createdBy.name || item.createdBy.email || undefined,
        },
      });
    }

    if (kind === "income") {
      const id = String(body.id ?? "").trim();
      const name = String(body.name ?? "").trim();
      const type = String(body.type ?? "card");
      const category = String(body.category ?? "other");
      const amount = Number(body.amount ?? 0);
      const date = String(body.date ?? "");

      if (!id || !name || !date || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid income payload." }, { status: 400 });
      }

      const updated = await prisma.income.updateMany({
        where: {
          id,
          householdId: scope.householdId,
          createdById: resolved.userId,
        },
        data: {
          title: name,
          type: incomeTypeToDb(type),
          category: incomeCategoryToDb(category),
          amount: Math.round(amount),
          date: new Date(date),
        },
      });

      if (updated.count === 0) {
        return NextResponse.json({ error: "Лише автор може редагувати цей запис." }, { status: 403 });
      }

      const item = await prisma.income.findUnique({
        where: { id },
        include: { createdBy: { select: { name: true, email: true } } },
      });

      if (!item) {
        return NextResponse.json({ error: "Record not found." }, { status: 404 });
      }

      return NextResponse.json({
        item: {
          id: item.id,
          name: item.title,
          type: incomeTypeFromDb(item.type),
          category: incomeCategoryFromDb(item.category),
          amount: item.amount,
          date: formatDateIso(item.date),
          createdById: item.createdById,
          createdByName: item.createdBy.name || item.createdBy.email || undefined,
        },
      });
    }

    const category = String(body.category ?? "").trim();
    const limit = Number(body.limit ?? 0);

    if (!category || !Number.isFinite(limit) || limit < 0) {
      return NextResponse.json({ error: "Invalid limit payload." }, { status: 400 });
    }

    await prisma.categoryLimit.upsert({
      where: {
        householdId_category: {
          householdId: scope.householdId,
          category,
        },
      },
      update: { limitAmount: Math.round(limit) },
      create: {
        householdId: scope.householdId,
        category,
        limitAmount: Math.round(limit),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to update category limit.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    const { searchParams } = new URL(request.url);
    const scopeKey = searchParams.get("scopeKey") ?? "personal";
    const kind = searchParams.get("kind") ?? "";
    const id = searchParams.get("id") ?? "";

    if (!id || (kind !== "expense" && kind !== "income")) {
      return NextResponse.json({ error: "Invalid delete payload." }, { status: 400 });
    }

    const scope = await resolveScopeHouseholdId(resolved.userId, scopeKey);
    if ("error" in scope) return scope.error;

    if (kind === "expense") {
      await prisma.expense.deleteMany({ where: { id, householdId: scope.householdId } });
      return NextResponse.json({ ok: true });
    }

    await prisma.income.deleteMany({ where: { id, householdId: scope.householdId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to delete record.",
      },
      { status: 500 },
    );
  }
}


