"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { HouseholdMembersPanel } from "./components/household-members-panel";
import {
  Bus,
  Car,
  CircleHelp,
  CreditCard,
  Dumbbell,
  Gift,
  HandCoins,
  HeartPulse,
  House,
  Lightbulb,
  Popcorn,
  Repeat,
  Shirt,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type CategoryId =
  | "groceries"
  | "transport"
  | "entertainment"
  | "subscriptions"
  | "utilities"
  | "auto"
  | "sport"
  | "medicine"
  | "gifts_guests"
  | "home_goods"
  | "clothes_shoes"
  | "debts"
  | "other";
type FilterCategoryId = CategoryId | "all";
type AppTab = "home" | "expenses" | "income" | "room";

type IncomeTypeId = "cash" | "card";
type IncomeCategoryId = "salary" | "part_time" | "rent" | "sale" | "fop" | "other";
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

type FinancePayload = {
  expenses: Expense[];
  incomes: Income[];
  limits: Array<{ category: string; limit: number }>;
};

const TXT = {
  tabHome: "\u041e\u0441\u043d\u043e\u0432\u043d\u0430",
  tabExpenses: "\u0412\u0438\u0442\u0440\u0430\u0442\u0438",
  tabIncome: "\u0414\u043e\u0445\u0456\u0434",
  tabRoom: "\u041a\u0456\u043c\u043d\u0430\u0442\u0430",
  balance: "\u0411\u0430\u043b\u0430\u043d\u0441",
  totalBalance: "\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0438\u0439 \u0431\u0430\u043b\u0430\u043d\u0441",
  incomeThisMonth: "\u0446\u044c\u043e\u0433\u043e \u043c\u0456\u0441\u044f\u0446\u044f",
  cashBalance: "\u0413\u043e\u0442\u0456\u0432\u043a\u0430",
  cardBalance: "\u041a\u0430\u0440\u0442\u043a\u0430",
  addExpense: "\u0414\u043e\u0434\u0430\u0442\u0438 \u0432\u0438\u0442\u0440\u0430\u0442\u0443",
  quickEntry: "\u0428\u0432\u0438\u0434\u043a\u0438\u0439 \u0437\u0430\u043f\u0438\u0441",
  name: "\u041d\u0430\u0437\u0432\u0430",
  namePlaceholder: "\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434, \u0410\u0422\u0411",
  incomeNamePlaceholder: "\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434, \u0410\u0432\u0430\u043d\u0441",
  category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f",
  expenseSource: "\u0421\u043f\u043e\u0441\u0456\u0431 \u043e\u043f\u043b\u0430\u0442\u0438",
  amount: "\u0421\u0443\u043c\u0430",
  date: "\u0414\u0430\u0442\u0430",
  save: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438",
  expensesTitle: "\u0423\u0441\u0456 \u0432\u0438\u0442\u0440\u0430\u0442\u0438",
  filters: "\u0424\u0456\u043b\u044c\u0442\u0440\u0438",
  periodSummary: "\u041f\u0456\u0434\u0441\u0443\u043c\u043e\u043a \u0437\u0430 \u043f\u0435\u0440\u0456\u043e\u0434",
  records: "\u0437\u0430\u043f\u0438\u0441\u0456\u0432",
  allCategories: "\u0423\u0441\u0456 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457",
  dateFrom: "\u0412\u0456\u0434",
  dateTo: "\u0414\u043e",
  clearFilters: "\u0421\u043a\u0438\u043d\u0443\u0442\u0438 \u0444\u0456\u043b\u044c\u0442\u0440\u0438",
  categoryLimits: "\u041b\u0456\u043c\u0456\u0442\u0438 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0439",
  limit: "\u041b\u0456\u043c\u0456\u0442",
  delete: "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438",
  author: "\u0410\u0432\u0442\u043e\u0440",
  unknownUser: "\u041d\u0435\u0432\u0456\u0434\u043e\u043c\u0438\u0439 \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447",
  incomeTitle: "\u0414\u043e\u0445\u043e\u0434\u0438",
  addIncome: "\u0414\u043e\u0434\u0430\u0442\u0438 \u0434\u043e\u0445\u0456\u0434",
  incomeType: "\u0422\u0438\u043f \u0434\u043e\u0445\u043e\u0434\u0443",
  incomeCategory: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f \u0434\u043e\u0445\u043e\u0434\u0443",
  totalIncome: "\u0421\u0443\u043a\u0443\u043f\u043d\u0438\u0439 \u0434\u043e\u0445\u0456\u0434",
  noExpenses: "\u041f\u043e\u043a\u0438 \u0449\u043e \u043d\u0435\u043c\u0430\u0454 \u0432\u0438\u0442\u0440\u0430\u0442.",
  noIncomes: "\u041f\u043e\u043a\u0438 \u0449\u043e \u043d\u0435\u043c\u0430\u0454 \u0434\u043e\u0445\u043e\u0434\u0456\u0432.",
  noFilteredExpenses: "\u0417\u0430 \u043e\u0431\u0440\u0430\u043d\u0438\u043c\u0438 \u0444\u0456\u043b\u044c\u0442\u0440\u0430\u043c\u0438 \u0432\u0438\u0442\u0440\u0430\u0442 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e.",
  uah: "\u0433\u0440\u043d",
  scopeTitle: "\u041e\u0431\u043b\u0456\u043a",
  personalScope: "\u041e\u0441\u043e\u0431\u0438\u0441\u0442\u0438\u0439",
  roomScopePrefix: "\u041a\u0456\u043c\u043d\u0430\u0442\u0430",
  roomBalances: "\u0411\u0430\u043b\u0430\u043d\u0441\u0438 \u043a\u0456\u043c\u043d\u0430\u0442",
  noRoomsYet: "\u0412\u0438 \u0449\u0435 \u043d\u0435 \u0454 \u0443\u0447\u0430\u0441\u043d\u0438\u043a\u043e\u043c \u0436\u043e\u0434\u043d\u043e\u0457 \u043a\u0456\u043c\u043d\u0430\u0442\u0438.",
  activeScope: "\u0410\u043a\u0442\u0438\u0432\u043d\u0438\u0439 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442",
};

const categories: Array<{ id: CategoryId; label: string }> = [
  { id: "groceries", label: "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438" },
  { id: "transport", label: "\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442" },
  { id: "entertainment", label: "\u0420\u043e\u0437\u0432\u0430\u0433\u0438 \u0442\u0430 \u043a\u0430\u0444\u0435" },
  { id: "subscriptions", label: "\u041f\u0456\u0434\u043f\u0438\u0441\u043a\u0438" },
  { id: "utilities", label: "\u041a\u043e\u043c\u0443\u043d\u0430\u043b\u044c\u043d\u0456" },
  { id: "auto", label: "\u0410\u0432\u0442\u043e" },
  { id: "sport", label: "\u0421\u043f\u043e\u0440\u0442" },
  { id: "medicine", label: "\u041c\u0435\u0434\u0438\u0446\u0438\u043d\u0430" },
  { id: "gifts_guests", label: "\u041f\u043e\u0434\u0430\u0440\u0443\u043d\u043a\u0438 \u0456 \u0433\u043e\u0441\u0442\u0456" },
  { id: "home_goods", label: "\u0422\u043e\u0432\u0430\u0440\u0438 \u0434\u043b\u044f \u0434\u043e\u043c\u0443" },
  { id: "clothes_shoes", label: "\u041e\u0434\u044f\u0433 \u0442\u0430 \u0432\u0437\u0443\u0442\u0442\u044f" },
  { id: "debts", label: "\u0411\u043e\u0440\u0433\u0438" },
  { id: "other", label: "\u0406\u043d\u0448\u0456" },
];

const expenseSources: Array<{ id: ExpenseSourceId; label: string }> = [
  { id: "cash", label: "\u0413\u043e\u0442\u0456\u0432\u043a\u0430" },
  { id: "card", label: "\u0411\u0430\u043d\u043a\u0456\u0432\u0441\u044c\u043a\u0430 \u043a\u0430\u0440\u0442\u043a\u0430" },
];

const incomeTypes: Array<{ id: IncomeTypeId; label: string }> = [
  { id: "cash", label: "\u0413\u043e\u0442\u0456\u0432\u043a\u0430" },
  { id: "card", label: "\u0411\u0430\u043d\u043a\u0456\u0432\u0441\u044c\u043a\u0430 \u043a\u0430\u0440\u0442\u043a\u0430" },
];

const incomeCategories: Array<{ id: IncomeCategoryId; label: string }> = [
  { id: "salary", label: "\u0417\u0430\u0440\u043f\u043b\u0430\u0442\u0430" },
  { id: "part_time", label: "\u041f\u0456\u0434\u0440\u043e\u0431\u0456\u0442\u043e\u043a" },
  { id: "rent", label: "\u041e\u0440\u0435\u043d\u0434\u0430" },
  { id: "sale", label: "\u041f\u0440\u043e\u0434\u0430\u0436" },
  { id: "fop", label: "\u0424\u041e\u041f" },
  { id: "other", label: "\u0406\u043d\u0448\u0456 \u0434\u043e\u0445\u043e\u0434\u0438" },
];

const categoryLabelMap: Record<CategoryId, string> = {
  groceries: "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438",
  transport: "\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442",
  entertainment: "\u0420\u043e\u0437\u0432\u0430\u0433\u0438 \u0442\u0430 \u043a\u0430\u0444\u0435",
  subscriptions: "\u041f\u0456\u0434\u043f\u0438\u0441\u043a\u0438",
  utilities: "\u041a\u043e\u043c\u0443\u043d\u0430\u043b\u044c\u043d\u0456",
  auto: "\u0410\u0432\u0442\u043e",
  sport: "\u0421\u043f\u043e\u0440\u0442",
  medicine: "\u041c\u0435\u0434\u0438\u0446\u0438\u043d\u0430",
  gifts_guests: "\u041f\u043e\u0434\u0430\u0440\u0443\u043d\u043a\u0438 \u0456 \u0433\u043e\u0441\u0442\u0456",
  home_goods: "\u0422\u043e\u0432\u0430\u0440\u0438 \u0434\u043b\u044f \u0434\u043e\u043c\u0443",
  clothes_shoes: "\u041e\u0434\u044f\u0433 \u0442\u0430 \u0432\u0437\u0443\u0442\u0442\u044f",
  debts: "\u0411\u043e\u0440\u0433\u0438",
  other: "\u0406\u043d\u0448\u0456",
};

const categoryVisualMap: Record<CategoryId, { color: string; icon: LucideIcon }> = {
  groceries: { color: "var(--cat-groceries)", icon: ShoppingCart },
  transport: { color: "var(--cat-transport)", icon: Bus },
  entertainment: { color: "var(--cat-entertainment)", icon: Popcorn },
  subscriptions: { color: "#38BDF8", icon: Repeat },
  utilities: { color: "var(--cat-utilities)", icon: Lightbulb },
  auto: { color: "#60A5FA", icon: Car },
  sport: { color: "#A78BFA", icon: Dumbbell },
  medicine: { color: "var(--cat-health)", icon: HeartPulse },
  gifts_guests: { color: "var(--cat-shopping)", icon: Gift },
  home_goods: { color: "var(--cat-home)", icon: House },
  clothes_shoes: { color: "#F472B6", icon: Shirt },
  debts: { color: "#F87171", icon: HandCoins },
  other: { color: "#9CA3AF", icon: CircleHelp },
};
const incomeTypeLabelMap: Record<IncomeTypeId, string> = {
  cash: "\u0413\u043e\u0442\u0456\u0432\u043a\u0430",
  card: "\u0411\u0430\u043d\u043a\u0456\u0432\u0441\u044c\u043a\u0430 \u043a\u0430\u0440\u0442\u043a\u0430",
};

const incomeCategoryLabelMap: Record<IncomeCategoryId, string> = {
  salary: "\u0417\u0430\u0440\u043f\u043b\u0430\u0442\u0430",
  part_time: "\u041f\u0456\u0434\u0440\u043e\u0431\u0456\u0442\u043e\u043a",
  rent: "\u041e\u0440\u0435\u043d\u0434\u0430",
  sale: "\u041f\u0440\u043e\u0434\u0430\u0436",
  fop: "\u0424\u041e\u041f",
  other: "\u0406\u043d\u0448\u0456 \u0434\u043e\u0445\u043e\u0434\u0438",
};

const defaultCategoryLimits: Record<CategoryId, number> = {
  groceries: 10000,
  transport: 3000,
  entertainment: 2500,
  subscriptions: 800,
  utilities: 2500,
  auto: 4000,
  sport: 2000,
  medicine: 3000,
  gifts_guests: 2000,
  home_goods: 3000,
  clothes_shoes: 3000,
  debts: 5000,
  other: 1500,
};

const initialExpenses: Expense[] = [];

const initialIncomes: Income[] = [];

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

const formatPlain = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [mounted, setMounted] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(defaultExpenseForm);
  const [incomeForm, setIncomeForm] = useState<IncomeForm>(defaultIncomeForm);
  const [filters, setFilters] = useState<ExpenseFilters>(defaultFilters);
  const [categoryLimits, setCategoryLimits] = useState<Record<CategoryId, number>>(defaultCategoryLimits);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeScopeKey, setActiveScopeKey] = useState("personal");
  const expenseAmountRef = useRef<HTMLInputElement | null>(null);
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
    if (!mounted || !session?.user) return;

    const loadFinance = async () => {
      const response = await fetch(`/api/finance?scopeKey=${encodeURIComponent(activeScopeKey)}`, { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as FinancePayload;
      const nextExpenses = Array.isArray(data.expenses) ? data.expenses : [];
      const nextIncomes = Array.isArray(data.incomes) ? data.incomes : [];
      const nextLimits = Array.isArray(data.limits) ? data.limits : [];

      setExpenses(nextExpenses);
      setIncomes(nextIncomes);
      setCategoryLimits((prev) => {
        const merged = { ...defaultCategoryLimits, ...prev };
        for (const item of nextLimits) {
          const key = item.category as CategoryId;
          if (key in merged) merged[key] = Number(item.limit) || 0;
        }
        return merged;
      });
    };

    void loadFinance();
  }, [mounted, activeScopeKey, session?.user?.id]);

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
  const totalIncomeCurrentMonth = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    return incomes.filter((income) => income.date.startsWith(currentMonthKey)).reduce((sum, income) => sum + income.amount, 0);
  }, [incomes]);
  const cashIncome = useMemo(() => incomes.filter((income) => income.type === "cash").reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const cardIncome = useMemo(() => incomes.filter((income) => income.type === "card").reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const cashSpent = useMemo(() => expenses.filter((expense) => expense.source === "cash").reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const cardSpent = useMemo(() => expenses.filter((expense) => expense.source === "card").reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const cashBalance = cashIncome - cashSpent;
  const cardBalance = cardIncome - cardSpent;
  const totalBalance = totalIncomeAll - totalSpentAll;
  const totalBalanceText = formatCurrency(totalBalance);
  const balanceAmountChars = totalBalanceText.replace(/\s+/g, "").length;
  const balanceAmountSizeClass =
    balanceAmountChars <= 7
      ? "balance-hero-amount-xl"
      : balanceAmountChars <= 10
        ? "balance-hero-amount-lg"
        : balanceAmountChars <= 13
          ? "balance-hero-amount-md"
          : "balance-hero-amount-sm";

  const limitsByCategory = useMemo(() => {
    const emptyTotals = categories.reduce((acc, category) => {
      acc[category.id] = 0;
      return acc;
    }, {} as Record<CategoryId, number>);

    const totals = filteredExpenses.reduce<Record<CategoryId, number>>(
      (acc, expense) => {
        acc[expense.category] += expense.amount;
        return acc;
      },
      emptyTotals,
    );

    return (Object.keys(categoryLimits) as CategoryId[]).map((category) => {
      const limit = categoryLimits[category];
      const spent = totals[category];
      const progress = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      return { category, spent, limit, progress };
    }).sort((a, b) => {
      if (b.spent !== a.spent) return b.spent - a.spent;
      return categoryLabelMap[a.category].localeCompare(categoryLabelMap[b.category], "uk");
    });
  }, [filteredExpenses, categoryLimits]);

  const handleAddExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(expenseForm.amount);
    if (!expenseForm.name.trim() || !expenseForm.date || !amountValue || amountValue <= 0) return;

    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "expense",
        scopeKey: activeScopeKey,
        name: expenseForm.name.trim(),
        category: expenseForm.category,
        source: expenseForm.source,
        amount: amountValue,
        date: expenseForm.date,
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { item?: Expense };
    if (data.item) {
      setExpenses((prev) => [data.item as Expense, ...prev]);
      setExpenseForm((prev) => ({ ...prev, name: "", amount: "" }));
    }
  };

  const handleAddIncome = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(incomeForm.amount);
    if (!incomeForm.name.trim() || !incomeForm.date || !amountValue || amountValue <= 0) return;

    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "income",
        scopeKey: activeScopeKey,
        name: incomeForm.name.trim(),
        type: incomeForm.type,
        category: incomeForm.category,
        amount: amountValue,
        date: incomeForm.date,
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { item?: Income };
    if (data.item) {
      setIncomes((prev) => [data.item as Income, ...prev]);
      setIncomeForm((prev) => ({ ...prev, name: "", amount: "" }));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const response = await fetch(`/api/finance?kind=expense&id=${encodeURIComponent(id)}&scopeKey=${encodeURIComponent(activeScopeKey)}`, {
      method: "DELETE",
    });
    if (!response.ok) return;
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  const handleDeleteIncome = async (id: string) => {
    const response = await fetch(`/api/finance?kind=income&id=${encodeURIComponent(id)}&scopeKey=${encodeURIComponent(activeScopeKey)}`, {
      method: "DELETE",
    });
    if (!response.ok) return;
    setIncomes((prev) => prev.filter((income) => income.id !== id));
  };

  const handleCategoryLimitChange = (category: CategoryId, rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^\d]/g, "");
    const nextValue = digitsOnly === "" ? 0 : Number(digitsOnly);
    setCategoryLimits((prev) => ({ ...prev, [category]: nextValue }));

    void fetch("/api/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scopeKey: activeScopeKey,
        category,
        limit: nextValue,
      }),
    });
  };

  const handleFabClick = () => {
    setActiveTab("home");
    requestAnimationFrame(() => {
      expenseAmountRef.current?.focus();
      expenseAmountRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  if (status === "loading") return <main className="auth-shell"><div className="auth-card"><h1>{"\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u043a\u0430 \u0441\u0435\u0441\u0456\u0457..."}</h1></div></main>;
  if (!session?.user) return <main className="auth-shell"><div className="auth-card"><h1>{"\u041f\u043e\u0442\u0440\u0456\u0431\u0435\u043d \u0432\u0445\u0456\u0434"}</h1><p>{"\u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044c \u0430\u0431\u043e \u0441\u0442\u0432\u043e\u0440\u0456\u0442\u044c \u0430\u043a\u0430\u0443\u043d\u0442, \u0449\u043e\u0431 \u043f\u0440\u043e\u0434\u043e\u0432\u0436\u0438\u0442\u0438."}</p><a className="button button-primary" href="/sign-in">{"\u0423\u0432\u0456\u0439\u0442\u0438"}</a><a className="button button-secondary" href="/sign-up">{"\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f"}</a></div></main>;

  return (
    <main className="app-shell">
      <section className="header-shell">
        <div className="top-controls">
          <section className="scope-card card">
            <div className="scope-inline">
              <p className="section-label">{TXT.scopeTitle}</p>
              <select value={activeScopeKey} onChange={(event) => setActiveScopeKey(event.target.value)}>
                {scopeOptions.map((scope) => <option key={scope.key} value={scope.key}>{scope.label}</option>)}
              </select>
            </div>
          </section>

          <header className="top-bar">
            <span>{currentUserName}</span>
            <button className="row-action top-signout" type="button" onClick={() => signOut({ callbackUrl: "/sign-in" })}>{"\u0412\u0438\u0439\u0442\u0438"}</button>
          </header>
        </div>

        <nav className="tab-nav" aria-label="Primary">
          <button className={`tab-btn ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")} type="button">{TXT.tabHome}</button>
          <button className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`} onClick={() => setActiveTab("expenses")} type="button">{TXT.tabExpenses}</button>
          <button className={`tab-btn ${activeTab === "income" ? "active" : ""}`} onClick={() => setActiveTab("income")} type="button">{TXT.tabIncome}</button>
          <button className={`tab-btn ${activeTab === "room" ? "active" : ""}`} onClick={() => setActiveTab("room")} type="button">{TXT.tabRoom}</button>
        </nav>
      </section>
      {activeTab === "home" ? (
        <section className="tab-page">
          <article className="card">
            <p className="section-label">{TXT.balance}</p>
            <div className="balance-grid">
              <div className="balance-item balance-hero"><strong className={`balance-hero-amount ${balanceAmountSizeClass}`}>{totalBalanceText}</strong><p className="balance-hero-meta"><span className="balance-hero-meta-strong"><span className="balance-hero-arrow">↗</span> +{formatCurrency(totalIncomeCurrentMonth)}</span> {TXT.incomeThisMonth}</p></div>
              <div className="balance-item"><span className="balance-item-label"><Wallet size={16} /> {TXT.cashBalance}</span><strong>{formatCurrency(cashBalance)}</strong></div>
              <div className="balance-item"><span className="balance-item-label"><CreditCard size={16} /> {TXT.cardBalance}</span><strong>{formatCurrency(cardBalance)}</strong></div>
            </div>
          </article>

          <article className="card">
            <h2>{TXT.addExpense}</h2>
            <form className="expense-form" onSubmit={handleAddExpense}>
              <label>{TXT.name}<input type="text" placeholder={TXT.namePlaceholder} value={expenseForm.name} onChange={(event) => setExpenseForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.category}<select value={expenseForm.category} onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value as CategoryId }))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>{TXT.expenseSource}<select value={expenseForm.source} onChange={(event) => setExpenseForm((prev) => ({ ...prev, source: event.target.value as ExpenseSourceId }))}>{expenseSources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
              <label>{TXT.amount}<input ref={expenseAmountRef} type="number" min="1" step="1" placeholder="0" value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
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
            {filteredExpenses.length === 0 ? <p className="empty-line">{expenses.length === 0 ? TXT.noExpenses : TXT.noFilteredExpenses}</p> : (
              <div className="expense-table expense-table-scroll">
                {filteredExpenses.map((expense) => (
                  <div className="expense-row" key={expense.id}>
                    <div><strong>{expense.name}</strong><p>{categoryLabelMap[expense.category]} | {TXT.expenseSource}: {expense.source === "cash" ? "\u0413\u043e\u0442\u0456\u0432\u043a\u0430" : "\u041a\u0430\u0440\u0442\u043a\u0430"} | {TXT.author}: {expense.createdByName || TXT.unknownUser}</p></div>
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
                  <div className="budget-copy"><strong className="budget-category-name">{(() => { const Icon = categoryVisualMap[budget.category].icon; return <Icon size={16} color={categoryVisualMap[budget.category].color} />; })()}<span>{categoryLabelMap[budget.category]}</span></strong><span>{formatPlain(budget.spent)} / {formatPlain(budget.limit)} {TXT.uah}</span></div>
                  <label className="budget-input">
                    <span>{TXT.limit}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={categoryLimits[budget.category]}
                      onChange={(event) => handleCategoryLimitChange(budget.category, event.target.value)}
                    />
                  </label>
                  <div className="budget-bar"><div style={{ width: `${budget.progress}%`, background: categoryVisualMap[budget.category].color }} /></div>
                </div>
              ))}
            </div>

            <div className="filters-card">
              <p className="section-label">{TXT.filters}</p>
              <div className="filters-grid">
                <label>{TXT.category}<select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value as FilterCategoryId }))}><option value="all">{TXT.allCategories}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
                <label>{TXT.dateFrom}<input type="date" value={filters.dateFrom} onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))} /></label>
                <label>{TXT.dateTo}<input type="date" value={filters.dateTo} onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))} /></label>
              </div>
              <div className="filters-footer"><p className="summary-pill">{TXT.periodSummary}: <strong>{formatCurrency(totalSpentFiltered)}</strong> ({filteredExpenses.length} {TXT.records})</p><button className="text-button" type="button" onClick={() => setFilters(defaultFilters())}>{TXT.clearFilters}</button></div>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "income" ? (
        <section className="tab-page">
          <article className="card">
            <h2>{TXT.addIncome}</h2>
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

      <button className="fab-action" type="button" aria-label={TXT.addExpense} title={TXT.addExpense} onClick={handleFabClick}>
        +
      </button>
    </main>
  );
}


