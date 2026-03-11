"use client";

import { useEffect, useMemo, useState } from "react";

type CategoryId = "groceries" | "transport" | "entertainment" | "subscriptions" | "coffee";

type Expense = {
  id: string;
  name: string;
  category: CategoryId;
  amount: number;
  date: string;
};

type ExpenseForm = {
  name: string;
  category: CategoryId;
  amount: string;
  date: string;
};

const STORAGE_EXPENSES = "cashflow-expenses-v1";
const STORAGE_BUDGET = "cashflow-budget-v1";

const categories: Array<{ id: CategoryId; label: string }> = [
  { id: "groceries", label: "Продукти" },
  { id: "transport", label: "Транспорт" },
  { id: "entertainment", label: "Розваги" },
  { id: "subscriptions", label: "Підписки" },
  { id: "coffee", label: "Кафе" },
];

const categoryLabelMap: Record<CategoryId, string> = {
  groceries: "Продукти",
  transport: "Транспорт",
  entertainment: "Розваги",
  subscriptions: "Підписки",
  coffee: "Кафе",
};

const budgetLimits: Record<CategoryId, number> = {
  groceries: 10000,
  transport: 3000,
  entertainment: 2500,
  subscriptions: 800,
  coffee: 1500,
};

const initialExpenses: Expense[] = [
  { id: "1", name: "Сільпо", category: "groceries", amount: 1240, date: "2026-03-10" },
  { id: "2", name: "Bolt", category: "transport", amount: 186, date: "2026-03-10" },
  { id: "3", name: "Monobank", category: "subscriptions", amount: 219, date: "2026-03-09" },
  { id: "4", name: "Coffee Lab", category: "coffee", amount: 145, date: "2026-03-09" },
];

const defaultForm = (): ExpenseForm => ({
  name: "",
  category: categories[0].id,
  amount: "",
  date: "",
});

const currency = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" }).format(new Date(value));

const toId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatPlain = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [monthlyBudget, setMonthlyBudget] = useState(30000);
  const [mounted, setMounted] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(defaultForm);

  useEffect(() => {
    const today = new Date();
    const fallbackDate = today.toISOString().slice(0, 10);

    setForm((prev) => ({ ...prev, date: prev.date || fallbackDate }));

    try {
      const rawExpenses = localStorage.getItem(STORAGE_EXPENSES);
      const rawBudget = localStorage.getItem(STORAGE_BUDGET);

      if (rawExpenses) {
        const parsed = JSON.parse(rawExpenses) as Expense[];
        if (Array.isArray(parsed)) {
          setExpenses(parsed);
        }
      }

      if (rawBudget) {
        const parsedBudget = Number(rawBudget);
        if (Number.isFinite(parsedBudget) && parsedBudget >= 0) {
          setMonthlyBudget(parsedBudget);
        }
      }
    } catch {
      // Ignore broken localStorage values and keep defaults.
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_EXPENSES, JSON.stringify(expenses));
      localStorage.setItem(STORAGE_BUDGET, String(monthlyBudget));
    } catch {
      // Ignore storage write errors (private mode / quota / disabled storage).
    }
  }, [expenses, monthlyBudget, mounted]);

  const formatCurrency = (value: number) =>
    mounted ? currency.format(value) : `${formatPlain(value)} грн`;

  const formatBudgetNumber = (value: number) =>
    mounted ? value.toLocaleString("uk-UA") : formatPlain(value);

  const formatDateSafe = (value: string) => (mounted ? formatDate(value) : value);

  const totalSpent = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);

  const budgets = useMemo(() => {
    const totals = expenses.reduce<Record<CategoryId, number>>(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
        return acc;
      },
      {
        groceries: 0,
        transport: 0,
        entertainment: 0,
        subscriptions: 0,
        coffee: 0,
      },
    );

    return (Object.keys(budgetLimits) as CategoryId[]).map((category) => {
      const limit = budgetLimits[category];
      const spent = totals[category] ?? 0;
      const progress = Math.min(100, Math.round((spent / limit) * 100));
      return { category, spent, limit, progress };
    });
  }, [expenses]);

  const resetForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({ ...defaultForm(), date: today });
    setEditingExpenseId(null);
  };

  const startEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setForm({
      name: expense.name,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
    });
  };

  const handleDelete = (expenseId: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
    if (editingExpenseId === expenseId) {
      resetForm();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amountValue = Number(form.amount);
    if (!form.name.trim() || !form.category || !form.date || !amountValue || amountValue <= 0) {
      return;
    }

    if (editingExpenseId) {
      setExpenses((prev) =>
        prev.map((expense) =>
          expense.id === editingExpenseId
            ? {
                ...expense,
                name: form.name.trim(),
                category: form.category,
                amount: amountValue,
                date: form.date,
              }
            : expense,
        ),
      );
      resetForm();
      return;
    }

    const next: Expense = {
      id: toId(),
      name: form.name.trim(),
      category: form.category,
      amount: amountValue,
      date: form.date,
    };

    setExpenses((prev) => [next, ...prev]);
    setForm((prev) => ({ ...prev, name: "", amount: "" }));
  };

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Cashflow Compass</p>
          <div className="hero-actions">
            <button className="button button-primary" type="button">
              Додати витрату
            </button>
            <button className="button button-secondary" type="button">
              Переглянути аналітику
            </button>
          </div>
          <div className="budget-control">
            <label htmlFor="monthlyBudget">Бюджет на місяць</label>
            <div className="budget-input">
              <input
                id="monthlyBudget"
                type="number"
                min="0"
                step="100"
                value={monthlyBudget}
                onChange={(event) => setMonthlyBudget(Number(event.target.value))}
              />
              <span>грн</span>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="column">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="section-label">{editingExpenseId ? "Редагувати витрату" : "Додати витрату"}</p>
                <h2>{editingExpenseId ? "Оновлення запису" : "Швидкий запис"}</h2>
              </div>
            </div>

            <form className="expense-form" onSubmit={handleSubmit}>
              <label>
                Назва
                <input
                  type="text"
                  placeholder="Наприклад, АТБ"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>

              <label>
                Категорія
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category: event.target.value as CategoryId }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Сума
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={form.amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </label>

              <label>
                Дата
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                  required
                />
              </label>

              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  {editingExpenseId ? "Оновити" : "Зберегти"}
                </button>
                {editingExpenseId ? (
                  <button className="button button-secondary" type="button" onClick={resetForm}>
                    Скасувати
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="panel panel-wide">
            <div className="panel-head">
              <div>
                <p className="section-label">Останні витрати</p>
                <h2>Стрічка транзакцій</h2>
              </div>
              <button className="text-button" type="button">
                Усі записи
              </button>
            </div>

            <div className="expense-table">
              {expenses.map((expense) => (
                <div className="expense-row" key={expense.id}>
                  <div>
                    <strong>{expense.name}</strong>
                    <p>{categoryLabelMap[expense.category]}</p>
                  </div>
                  <span>{formatDateSafe(expense.date)}</span>
                  <strong>-{formatCurrency(expense.amount)}</strong>
                  <div className="row-actions">
                    <button className="row-action" type="button" onClick={() => startEdit(expense)}>
                      Редагувати
                    </button>
                    <button
                      className="row-action row-action-danger"
                      type="button"
                      onClick={() => handleDelete(expense.id)}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="section-label">Бюджети</p>
              <h2>Ліміти за категоріями</h2>
            </div>
          </div>

          <div className="budget-list">
            {budgets.map((budget) => (
              <div className="budget-card" key={budget.category}>
                <div className="budget-copy">
                  <strong>{categoryLabelMap[budget.category]}</strong>
                  <span>
                    {formatBudgetNumber(budget.spent)} / {formatBudgetNumber(budget.limit)} грн
                  </span>
                </div>
                <div className="budget-bar">
                  <div style={{ width: `${budget.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {expenses.length === 0 ? (
        <section className="empty-state">
          <p>Поки що немає витрат. Додай першу транзакцію вище.</p>
        </section>
      ) : null}
    </main>
  );
}