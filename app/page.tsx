"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { HouseholdMembersPanel } from "./components/household-members-panel";

type CategoryId = "groceries" | "transport" | "entertainment" | "subscriptions" | "coffee";
type FilterCategoryId = CategoryId | "all";
type AppTab = "home" | "expenses" | "income" | "room";

type IncomeTypeId = "cash" | "card";
type IncomeCategoryId = "salary" | "part_time" | "other";
type ExpenseSourceId = "cash" | "card";

type Expense = {
  id: string;
  name: string;
  category: CategoryId;
  source: ExpenseSourceId;
  amount: number;
  date: string;
  createdByName?: string;
};

type Income = {
  id: string;
  name: string;
  type: IncomeTypeId;
  category: IncomeCategoryId;
  amount: number;
  date: string;
  createdByName?: string;
};

type ExpenseForm = {
  name: string;
  category: CategoryId;
  source: ExpenseSourceId;
  amount: string;
  date: string;
};

type IncomeForm = {
  name: string;
  type: IncomeTypeId;
  category: IncomeCategoryId;
  amount: string;
  date: string;
};

type ExpenseFilters = {
  category: FilterCategoryId;
  dateFrom: string;
  dateTo: string;
};

type Household = {
  id: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

const STORAGE_EXPENSES = "cashflow-expenses-v1";
const STORAGE_INCOMES = "cashflow-incomes-v1";

const TXT = {
  tabHome: "Основна",
  tabExpenses: "Витрати",
  tabIncome: "Дохід",
  tabRoom: "Кімната",
  balance: "Баланс",
  totalBalance: "Загальний баланс",
  cashBalance: "Готівка",
  cardBalance: "Картка",
  addExpense: "Додати витрату",
  quickEntry: "Швидкий запис",
  name: "Назва",
  namePlaceholder: "Наприклад, АТБ",
  incomeNamePlaceholder: "Наприклад, Аванс",
  category: "Категорія",
  expenseSource: "Спосіб оплати",
  amount: "Сума",
  date: "Дата",
  save: "Зберегти",
  expensesTitle: "Усі витрати",
  filters: "Фільтри",
  periodSummary: "Підсумок за період",
  records: "записів",
  allCategories: "Усі категорії",
  dateFrom: "Від",
  dateTo: "До",
  clearFilters: "Скинути фільтри",
  categoryLimits: "Ліміти категорій",
  delete: "Видалити",
  author: "Автор",
  unknownUser: "Невідомий користувач",
  incomeTitle: "Доходи",
  addIncome: "Додати дохід",
  incomeType: "Тип доходу",
  incomeCategory: "Категорія доходу",
  totalIncome: "Сукупний дохід",
  noExpenses: "Поки що немає витрат.",
  noIncomes: "Поки що немає доходів.",
  noFilteredExpenses: "За обраними фільтрами витрат не знайдено.",
  uah: "грн",
  scopeTitle: "Контекст обліку",
  personalScope: "Особистий",
  roomScopePrefix: "Кімната",
  roomBalances: "Баланси кімнат",
  noRoomsYet: "Ви ще не є учасником жодної кімнати.",
  activeScope: "Активний контекст",
};

const categories: Array<{ id: CategoryId; label: string }> = [
  { id: "groceries", label: "Продукти" },
  { id: "transport", label: "Транспорт" },
  { id: "entertainment", label: "Розваги" },
  { id: "subscriptions", label: "Підписки" },
  { id: "coffee", label: "Кафе" },
];

const expenseSources: Array<{ id: ExpenseSourceId; label: string }> = [
  { id: "cash", label: "Готівка" },
  { id: "card", label: "Банківська картка" },
];

const incomeTypes: Array<{ id: IncomeTypeId; label: string }> = [
  { id: "cash", label: "Готівка" },
  { id: "card", label: "Банківська картка" },
];

const incomeCategories: Array<{ id: IncomeCategoryId; label: string }> = [
  { id: "salary", label: "Зарплата" },
  { id: "part_time", label: "Підробіток" },
  { id: "other", label: "Інші доходи" },
];

const categoryLabelMap: Record<CategoryId, string> = {
  groceries: "Продукти",
  transport: "Транспорт",
  entertainment: "Розваги",
  subscriptions: "Підписки",
  coffee: "Кафе",
};

const incomeTypeLabelMap: Record<IncomeTypeId, string> = {
  cash: "Готівка",
  card: "Банківська картка",
};

const incomeCategoryLabelMap: Record<IncomeCategoryId, string> = {
  salary: "Зарплата",
  part_time: "Підробіток",
  other: "Інші доходи",
};

const categoryLimits: Record<CategoryId, number> = {
  groceries: 10000,
  transport: 3000,
  entertainment: 2500,
  subscriptions: 800,
  coffee: 1500,
};

const initialExpenses: Expense[] = [
  { id: "1", name: "Сільпо", category: "groceries", source: "card", amount: 1240, date: "2026-03-10" },
  { id: "2", name: "Bolt", category: "transport", source: "card", amount: 186, date: "2026-03-10" },
  { id: "3", name: "Monobank", category: "subscriptions", source: "card", amount: 219, date: "2026-03-09" },
  { id: "4", name: "Coffee Lab", category: "coffee", source: "cash", amount: 145, date: "2026-03-09" },
];

const initialIncomes: Income[] = [
  { id: "i1", name: "Зарплата", type: "card", category: "salary", amount: 42000, date: "2026-03-01" },
  { id: "i2", name: "Фріланс", type: "cash", category: "part_time", amount: 8500, date: "2026-03-05" },
];

const defaultExpenseForm = (): ExpenseForm => ({ name: "", category: categories[0].id, source: expenseSources[0].id, amount: "", date: "" });
const defaultIncomeForm = (): IncomeForm => ({ name: "", type: incomeTypes[0].id, category: incomeCategories[0].id, amount: "", date: "" });
const defaultFilters = (): ExpenseFilters => ({ category: "all", dateFrom: "", dateTo: "" });

const currency = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" }).format(new Date(value));

const toId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatPlain = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const storageKeyExpenses = (scopeKey: string) => `${STORAGE_EXPENSES}:${scopeKey}`;
const storageKeyIncomes = (scopeKey: string) => `${STORAGE_INCOMES}:${scopeKey}`;

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [mounted, setMounted] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(defaultExpenseForm);
  const [incomeForm, setIncomeForm] = useState<IncomeForm>(defaultIncomeForm);
  const [filters, setFilters] = useState<ExpenseFilters>(defaultFilters);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeScopeKey, setActiveScopeKey] = useState("personal");
  const { data: session, status } = useSession();
  const currentUserName = (session?.user?.name || session?.user?.email || TXT.unknownUser).trim();

  const scopeOptions = useMemo(
    () => [
      { key: "personal", label: TXT.personalScope },
      ...households.map((room) => ({ key: `room:${room.id}`, label: `${TXT.roomScopePrefix}: ${room.name}` })),
    ],
    [households],
  );

  const activeScopeLabel = useMemo(() => {
    const found = scopeOptions.find((item) => item.key === activeScopeKey);
    return found ? found.label : TXT.personalScope;
  }, [scopeOptions, activeScopeKey]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setExpenseForm((prev) => ({ ...prev, date: prev.date || today }));
    setIncomeForm((prev) => ({ ...prev, date: prev.date || today }));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const loadHouseholds = async () => {
      const response = await fetch("/api/households", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { households: Household[] };
      const list = Array.isArray(data.households) ? data.households : [];
      setHouseholds(list);
    };
    void loadHouseholds();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!mounted) return;
    const keyExp = storageKeyExpenses(activeScopeKey);
    const keyInc = storageKeyIncomes(activeScopeKey);

    try {
      const rawExp = localStorage.getItem(keyExp);
      const rawInc = localStorage.getItem(keyInc);

      if (rawExp) setExpenses(JSON.parse(rawExp) as Expense[]);
      else setExpenses(activeScopeKey === "personal" ? initialExpenses : []);

      if (rawInc) setIncomes(JSON.parse(rawInc) as Income[]);
      else setIncomes(activeScopeKey === "personal" ? initialIncomes : []);
    } catch {
      setExpenses(activeScopeKey === "personal" ? initialExpenses : []);
      setIncomes(activeScopeKey === "personal" ? initialIncomes : []);
    }
  }, [mounted, activeScopeKey]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(storageKeyExpenses(activeScopeKey), JSON.stringify(expenses));
    localStorage.setItem(storageKeyIncomes(activeScopeKey), JSON.stringify(incomes));
  }, [expenses, incomes, mounted, activeScopeKey]);

  const formatCurrency = (value: number) => mounted ? currency.format(value) : `${formatPlain(value)} ${TXT.uah}`;

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => {
      const categoryPass = filters.category === "all" || expense.category === filters.category;
      const fromPass = !filters.dateFrom || expense.date >= filters.dateFrom;
      const toPass = !filters.dateTo || expense.date <= filters.dateTo;
      return categoryPass && fromPass && toPass;
    }),
    [expenses, filters],
  );

  const totalSpentAll = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const totalSpentFiltered = useMemo(() => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0), [filteredExpenses]);
  const totalIncomeAll = useMemo(() => incomes.reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const cashIncome = useMemo(() => incomes.filter((income) => income.type === "cash").reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const cardIncome = useMemo(() => incomes.filter((income) => income.type === "card").reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const cashSpent = useMemo(() => expenses.filter((expense) => expense.source === "cash").reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const cardSpent = useMemo(() => expenses.filter((expense) => expense.source === "card").reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const cashBalance = cashIncome - cashSpent;
  const cardBalance = cardIncome - cardSpent;
  const totalBalance = totalIncomeAll - totalSpentAll;

  const limitsByCategory = useMemo(() => {
    const totals = filteredExpenses.reduce<Record<CategoryId, number>>(
      (acc, expense) => {
        acc[expense.category] += expense.amount;
        return acc;
      },
      { groceries: 0, transport: 0, entertainment: 0, subscriptions: 0, coffee: 0 },
    );

    return (Object.keys(categoryLimits) as CategoryId[]).map((category) => {
      const limit = categoryLimits[category];
      const spent = totals[category];
      const progress = Math.min(100, Math.round((spent / limit) * 100));
      return { category, spent, limit, progress };
    });
  }, [filteredExpenses]);

  const handleAddExpense = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(expenseForm.amount);
    if (!expenseForm.name.trim() || !expenseForm.date || !amountValue || amountValue <= 0) return;

    const next: Expense = {
      id: toId(),
      name: expenseForm.name.trim(),
      category: expenseForm.category,
      source: expenseForm.source,
      amount: amountValue,
      date: expenseForm.date,
      createdByName: currentUserName,
    };

    setExpenses((prev) => [next, ...prev]);
    setExpenseForm((prev) => ({ ...prev, name: "", amount: "" }));
  };

  const handleAddIncome = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(incomeForm.amount);
    if (!incomeForm.name.trim() || !incomeForm.date || !amountValue || amountValue <= 0) return;

    const next: Income = {
      id: toId(),
      name: incomeForm.name.trim(),
      type: incomeForm.type,
      category: incomeForm.category,
      amount: amountValue,
      date: incomeForm.date,
      createdByName: currentUserName,
    };

    setIncomes((prev) => [next, ...prev]);
    setIncomeForm((prev) => ({ ...prev, name: "", amount: "" }));
  };

  const handleDeleteExpense = (id: string) => setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  const handleDeleteIncome = (id: string) => setIncomes((prev) => prev.filter((income) => income.id !== id));

  if (status === "loading") return <main className="auth-shell"><div className="auth-card"><h1>Checking session...</h1></div></main>;
  if (!session?.user) return <main className="auth-shell"><div className="auth-card"><h1>Authentication required</h1><p>Please sign in or create an account to continue.</p><a className="button button-primary" href="/sign-in">Sign in</a><a className="button button-secondary" href="/sign-up">Sign up</a></div></main>;

  return (
    <main className="app-shell">
      <header className="top-bar">
        <span>{currentUserName}</span>
        <button className="row-action" type="button" onClick={() => signOut({ callbackUrl: "/sign-in" })}>Sign out</button>
      </header>

      <section className="scope-bar card">
        <p className="section-label">{TXT.scopeTitle}</p>
        <div className="scope-grid">
          <label>
            <span>{TXT.activeScope}</span>
            <select value={activeScopeKey} onChange={(event) => setActiveScopeKey(event.target.value)}>
              {scopeOptions.map((scope) => <option key={scope.key} value={scope.key}>{scope.label}</option>)}
            </select>
          </label>
          <p className="summary-pill"><strong>{activeScopeLabel}</strong></p>
        </div>
      </section>

      <nav className="tab-nav" aria-label="Primary">
        <button className={`tab-btn ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")} type="button">{TXT.tabHome}</button>
        <button className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`} onClick={() => setActiveTab("expenses")} type="button">{TXT.tabExpenses}</button>
        <button className={`tab-btn ${activeTab === "income" ? "active" : ""}`} onClick={() => setActiveTab("income")} type="button">{TXT.tabIncome}</button>
        <button className={`tab-btn ${activeTab === "room" ? "active" : ""}`} onClick={() => setActiveTab("room")} type="button">{TXT.tabRoom}</button>
      </nav>

      {activeTab === "home" ? (
        <section className="tab-page">
          <article className="card">
            <p className="section-label">{TXT.balance}</p>
            <div className="balance-grid">
              <div className="balance-item"><span>{TXT.totalBalance}</span><strong>{formatCurrency(totalBalance)}</strong></div>
              <div className="balance-item"><span>{TXT.cashBalance}</span><strong>{formatCurrency(cashBalance)}</strong></div>
              <div className="balance-item"><span>{TXT.cardBalance}</span><strong>{formatCurrency(cardBalance)}</strong></div>
            </div>
          </article>

          <article className="card">
            <p className="section-label">{TXT.addExpense}</p>
            <h2>{TXT.quickEntry}</h2>
            <form className="expense-form" onSubmit={handleAddExpense}>
              <label>{TXT.name}<input type="text" placeholder={TXT.namePlaceholder} value={expenseForm.name} onChange={(event) => setExpenseForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.category}<select value={expenseForm.category} onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value as CategoryId }))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>{TXT.expenseSource}<select value={expenseForm.source} onChange={(event) => setExpenseForm((prev) => ({ ...prev, source: event.target.value as ExpenseSourceId }))}>{expenseSources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
              <label>{TXT.amount}<input type="number" min="1" step="1" placeholder="0" value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
              <label>{TXT.date}<input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))} required /></label>
              <button className="button button-primary" type="submit">{TXT.save}</button>
            </form>
          </article>
        </section>
      ) : null}

      {activeTab === "expenses" ? (
        <section className="tab-page">
          <article className="card">
            <p className="section-label">{TXT.expensesTitle}</p>
            <div className="filters-card">
              <p className="section-label">{TXT.filters}</p>
              <div className="filters-grid">
                <label>{TXT.category}<select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value as FilterCategoryId }))}><option value="all">{TXT.allCategories}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
                <label>{TXT.dateFrom}<input type="date" value={filters.dateFrom} onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))} /></label>
                <label>{TXT.dateTo}<input type="date" value={filters.dateTo} onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))} /></label>
              </div>
              <div className="filters-footer"><p className="summary-pill">{TXT.periodSummary}: <strong>{formatCurrency(totalSpentFiltered)}</strong> ({filteredExpenses.length} {TXT.records})</p><button className="text-button" type="button" onClick={() => setFilters(defaultFilters())}>{TXT.clearFilters}</button></div>
            </div>

            {filteredExpenses.length === 0 ? <p className="empty-line">{expenses.length === 0 ? TXT.noExpenses : TXT.noFilteredExpenses}</p> : (
              <div className="expense-table">
                {filteredExpenses.map((expense) => (
                  <div className="expense-row" key={expense.id}>
                    <div><strong>{expense.name}</strong><p>{categoryLabelMap[expense.category]} | {TXT.expenseSource}: {expense.source === "cash" ? "Готівка" : "Картка"} | {TXT.author}: {expense.createdByName || TXT.unknownUser}</p></div>
                    <span>{mounted ? formatDate(expense.date) : expense.date}</span>
                    <strong>-{formatCurrency(expense.amount)}</strong>
                    <button className="row-action row-action-danger" type="button" onClick={() => handleDeleteExpense(expense.id)}>{TXT.delete}</button>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="card">
            <p className="section-label">{TXT.categoryLimits}</p>
            <div className="budget-list">
              {limitsByCategory.map((budget) => (
                <div className="budget-card" key={budget.category}>
                  <div className="budget-copy"><strong>{categoryLabelMap[budget.category]}</strong><span>{formatPlain(budget.spent)} / {formatPlain(budget.limit)} {TXT.uah}</span></div>
                  <div className="budget-bar"><div style={{ width: `${budget.progress}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "income" ? (
        <section className="tab-page">
          <article className="card">
            <p className="section-label">{TXT.addIncome}</p>
            <h2>{TXT.incomeTitle}</h2>
            <form className="income-form" onSubmit={handleAddIncome}>
              <label>{TXT.name}<input type="text" placeholder={TXT.incomeNamePlaceholder} value={incomeForm.name} onChange={(event) => setIncomeForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.incomeType}<select value={incomeForm.type} onChange={(event) => setIncomeForm((prev) => ({ ...prev, type: event.target.value as IncomeTypeId }))}>{incomeTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
              <label>{TXT.incomeCategory}<select value={incomeForm.category} onChange={(event) => setIncomeForm((prev) => ({ ...prev, category: event.target.value as IncomeCategoryId }))}>{incomeCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>{TXT.amount}<input type="number" min="1" step="1" placeholder="0" value={incomeForm.amount} onChange={(event) => setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
              <label>{TXT.date}<input type="date" value={incomeForm.date} onChange={(event) => setIncomeForm((prev) => ({ ...prev, date: event.target.value }))} required /></label>
              <button className="button button-primary" type="submit">{TXT.save}</button>
            </form>
          </article>

          <article className="card">
            <p className="section-label">{TXT.totalIncome}</p>
            <p className="summary-pill"><strong>{formatCurrency(totalIncomeAll)}</strong></p>
            {incomes.length === 0 ? <p className="empty-line">{TXT.noIncomes}</p> : (
              <div className="income-table">
                {incomes.map((income) => (
                  <div className="income-row" key={income.id}>
                    <div><strong>{income.name}</strong><p>{incomeTypeLabelMap[income.type]} | {incomeCategoryLabelMap[income.category]} | {TXT.author}: {income.createdByName || TXT.unknownUser}</p></div>
                    <span>{mounted ? formatDate(income.date) : income.date}</span>
                    <strong>+{formatCurrency(income.amount)}</strong>
                    <button className="row-action row-action-danger" type="button" onClick={() => handleDeleteIncome(income.id)}>{TXT.delete}</button>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}

      {activeTab === "room" ? (
        <section className="tab-page single">
          <HouseholdMembersPanel />
        </section>
      ) : null}
    </main>
  );
}