"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { HouseholdMembersPanel } from "./components/household-members-panel";
import {
  Bus,
  Car,
  CircleHelp,
  CreditCard,
  DollarSign,
  Dumbbell,
  Gift,
  HandCoins,
  HeartPulse,
  House,
  Lightbulb,
  Moon,
  Popcorn,
  Repeat,
  Shirt,
  ShoppingCart,
  Sun,
  UserCircle2,
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
type CurrencyCode = "USD" | "EUR" | "GBP" | "CHF" | "PLN";

type Expense = {
  id: string;
  name: string;
  category: CategoryId;
  source: ExpenseSourceId;
  amount: number;
  date: string;
  createdById?: string;
  createdByName?: string;
};

type Income = {
  id: string;
  name: string;
  type: IncomeTypeId;
  category: IncomeCategoryId;
  amount: number;
  date: string;
  createdById?: string;
  createdByName?: string;
};

type CurrencyIncome = {
  id: string;
  name: string;
  currency: CurrencyCode;
  amount: number;
  date: string;
  createdById?: string;
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

type CurrencyIncomeForm = {
  name: string;
  currency: CurrencyCode;
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
  currencyIncomes: CurrencyIncome[];
  limits: Array<{ category: string; limit: number }>;
};

type ThemeMode = "dark" | "light";

const TXT = {
  tabHome: "\u0411\u0430\u043b\u0430\u043d\u0441",
  tabExpenses: "\u0412\u0438\u0442\u0440\u0430\u0442\u0438",
  tabIncome: "\u0414\u043e\u0445\u0456\u0434",
  tabRoom: "\u041a\u0456\u043c\u043d\u0430\u0442\u0438",
  balance: "\u0411\u0430\u043b\u0430\u043d\u0441",
  totalBalance: "\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0438\u0439 \u0431\u0430\u043b\u0430\u043d\u0441",
  incomeThisMonth: "\u0446\u044c\u043e\u0433\u043e \u043c\u0456\u0441\u044f\u0446\u044f",
  expensesThisMonth: "\u0432\u0438\u0442\u0440\u0430\u0442\u0438 \u0446\u044c\u043e\u0433\u043e \u043c\u0456\u0441\u044f\u0446\u044f",
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
  currencyRecordsTitle: "\u0412\u0430\u043b\u044e\u0442\u043d\u0456 \u0437\u0430\u043f\u0438\u0441\u0438",
  filters: "\u0424\u0456\u043b\u044c\u0442\u0440\u0438",
  periodSummary: "\u041f\u0456\u0434\u0441\u0443\u043c\u043e\u043a \u0437\u0430 \u043f\u0435\u0440\u0456\u043e\u0434",
  records: "\u0437\u0430\u043f\u0438\u0441\u0456\u0432",
  allCategories: "\u0423\u0441\u0456 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457",
  dateFrom: "\u0412\u0456\u0434",
  dateTo: "\u0414\u043e",
  clearFilters: "\u0421\u043a\u0438\u043d\u0443\u0442\u0438 \u0444\u0456\u043b\u044c\u0442\u0440\u0438",
  categoryLimits: "\u041b\u0456\u043c\u0456\u0442\u0438 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0439",
  limit: "\u041b\u0456\u043c\u0456\u0442",
  edit: "\u0417\u043c\u0456\u043d\u0438\u0442\u0438",
  delete: "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438",
  author: "\u0410\u0432\u0442\u043e\u0440",
  unknownUser: "\u041d\u0435\u0432\u0456\u0434\u043e\u043c\u0438\u0439 \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447",
  incomeTitle: "\u0414\u043e\u0445\u043e\u0434\u0438",
  addIncome: "\u0414\u043e\u0434\u0430\u0442\u0438 \u0434\u043e\u0445\u0456\u0434",
  incomeType: "\u0422\u0438\u043f \u0434\u043e\u0445\u043e\u0434\u0443",
  incomeCategory: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f \u0434\u043e\u0445\u043e\u0434\u0443",
  totalIncome: "\u0421\u0443\u043a\u0443\u043f\u043d\u0438\u0439 \u0434\u043e\u0445\u0456\u0434",
  currencyBalance: "\u0412\u0430\u043b\u044e\u0442\u043d\u0438\u0439 \u0431\u0430\u043b\u0430\u043d\u0441",
  addCurrency: "\u0414\u043e\u0434\u0430\u0442\u0438 \u0432\u0430\u043b\u044e\u0442\u0443",
  spendCurrency: "\u0421\u043f\u0438\u0441\u0430\u0442\u0438 \u0432\u0430\u043b\u044e\u0442\u0443",
  notEnoughCurrency: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043d\u044c\u043e \u0432\u0430\u043b\u044e\u0442\u0438 \u043d\u0430 \u0440\u0430\u0445\u0443\u043d\u043a\u0443.",
  currencyExpenseSaved: "\u0412\u0438\u0442\u0440\u0430\u0442\u0443 \u0432\u0430\u043b\u044e\u0442\u0438 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e.",
  currency: "\u0412\u0430\u043b\u044e\u0442\u0430",
  noCurrencyYet: "\u0412\u0430\u043b\u044e\u0442\u043d\u0438\u0445 \u043d\u0430\u0434\u0445\u043e\u0434\u0436\u0435\u043d\u044c \u043f\u043e\u043a\u0438 \u0449\u043e \u043d\u0435\u043c\u0430\u0454.",
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
  settings: "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f",
  theme: "\u0422\u0435\u043c\u0430",
  darkTheme: "\u0422\u0435\u043c\u043d\u0430",
  lightTheme: "\u0421\u0432\u0456\u0442\u043b\u0430",
  defaultScope: "\u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442 \u0437\u0430 \u043c\u043e\u0432\u0447\u0430\u043d\u043d\u044f\u043c",
  account: "\u0410\u043a\u0430\u0443\u043d\u0442",
  signOut: "\u0412\u0438\u0439\u0442\u0438",
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

const currencyOptions: Array<{ id: CurrencyCode; label: string }> = [
  { id: "USD", label: "\u0414\u043e\u043b\u0430\u0440 (USD)" },
  { id: "EUR", label: "\u0404\u0432\u0440\u043e (EUR)" },
  { id: "GBP", label: "\u0411\u0440\u0438\u0442\u0430\u043d\u0441\u044c\u043a\u0438\u0439 \u0444\u0443\u043d\u0442 (GBP)" },
  { id: "CHF", label: "\u0428\u0432\u0435\u0439\u0446\u0430\u0440\u0441\u044c\u043a\u0438\u0439 \u0444\u0440\u0430\u043d\u043a (CHF)" },
  { id: "PLN", label: "\u041f\u043e\u043b\u044c\u0441\u044c\u043a\u0438\u0439 \u0437\u043b\u043e\u0442\u0438\u0439 (PLN)" },
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
const initialCurrencyIncomes: CurrencyIncome[] = [];

const defaultExpenseForm = (): ExpenseForm => ({ name: "", category: categories[0].id, source: expenseSources[0].id, amount: "", date: "" });
const defaultIncomeForm = (): IncomeForm => ({ name: "", type: incomeTypes[0].id, category: incomeCategories[0].id, amount: "", date: "" });
const defaultCurrencyIncomeForm = (): CurrencyIncomeForm => ({ name: "", currency: currencyOptions[0].id, amount: "", date: "" });
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
  const [currencyIncomes, setCurrencyIncomes] = useState<CurrencyIncome[]>(initialCurrencyIncomes);
  const [mounted, setMounted] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(defaultExpenseForm);
  const [incomeForm, setIncomeForm] = useState<IncomeForm>(defaultIncomeForm);
  const [currencyIncomeForm, setCurrencyIncomeForm] = useState<CurrencyIncomeForm>(defaultCurrencyIncomeForm);
  const [filters, setFilters] = useState<ExpenseFilters>(defaultFilters);
  const [categoryLimits, setCategoryLimits] = useState<Record<CategoryId, number>>(defaultCategoryLimits);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeScopeKey, setActiveScopeKey] = useState("personal");
  const [defaultScopeKey, setDefaultScopeKey] = useState("personal");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCurrencyIncomeModalOpen, setIsCurrencyIncomeModalOpen] = useState(false);
  const [currencyFabOpen, setCurrencyFabOpen] = useState(false);
  const [currencyModalMode, setCurrencyModalMode] = useState<"income" | "expense">("income");
  const [flashMessage, setFlashMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingCurrencyIncomeId, setEditingCurrencyIncomeId] = useState<string | null>(null);
  const [editingCurrencyMode, setEditingCurrencyMode] = useState<"income" | "expense">("income");
  const [editExpenseForm, setEditExpenseForm] = useState<ExpenseForm>(defaultExpenseForm);
  const [editIncomeForm, setEditIncomeForm] = useState<IncomeForm>(defaultIncomeForm);
  const [editCurrencyIncomeForm, setEditCurrencyIncomeForm] = useState<CurrencyIncomeForm>(defaultCurrencyIncomeForm);
  const [householdsLoaded, setHouseholdsLoaded] = useState(false);
  const [currencyAccordionOpen, setCurrencyAccordionOpen] = useState(false);
  const expenseAmountRef = useRef<HTMLInputElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const currencyFabRef = useRef<HTMLDivElement | null>(null);
  const settingsBootstrappedRef = useRef(false);
  const { data: session, status } = useSession();
  const currentUserName = (session?.user?.name || session?.user?.email || TXT.unknownUser).trim();
  const currentUserId = session?.user?.id || "";

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
    setCurrencyIncomeForm((prev) => ({ ...prev, date: prev.date || today }));

    const storedTheme = window.localStorage.getItem("cash:theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setThemeMode(storedTheme);
    }

        setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.body.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("cash:theme", themeMode);
  }, [mounted, themeMode]);

  useEffect(() => {
    if (activeTab !== "expenses") setCurrencyFabOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!currencyFabOpen) return;

    const handleCurrencyOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (currencyFabRef.current?.contains(event.target as Node)) return;
      setCurrencyFabOpen(false);
    };

    document.addEventListener("mousedown", handleCurrencyOutsideClick);
    document.addEventListener("touchstart", handleCurrencyOutsideClick, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleCurrencyOutsideClick);
      document.removeEventListener("touchstart", handleCurrencyOutsideClick);
    };
  }, [currencyFabOpen]);

  useEffect(() => {
    if (!mounted || !householdsLoaded) return;

    const hasActiveScope = scopeOptions.some((scope) => scope.key === activeScopeKey);
    if (!hasActiveScope) setActiveScopeKey("personal");

    const hasDefaultScope = scopeOptions.some((scope) => scope.key === defaultScopeKey);
    if (!hasDefaultScope) {
      setDefaultScopeKey("personal");
      if (session?.user) {
        void fetch("/api/user-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultScopeKey: "personal" }),
        });
      }
    }
  }, [mounted, householdsLoaded, scopeOptions, activeScopeKey, defaultScopeKey, session?.user]);

  useEffect(() => {
    if (!settingsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [settingsOpen]);

  useEffect(() => {
    const isAnyModalOpen =
      isExpenseModalOpen ||
      isCurrencyIncomeModalOpen ||
      Boolean(editingExpenseId) ||
      Boolean(editingIncomeId) ||
      Boolean(editingCurrencyIncomeId);
    if (!isAnyModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsExpenseModalOpen(false);
      setIsCurrencyIncomeModalOpen(false);
      setEditingExpenseId(null);
      setEditingIncomeId(null);
      setEditingCurrencyIncomeId(null);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isExpenseModalOpen, isCurrencyIncomeModalOpen, editingExpenseId, editingIncomeId, editingCurrencyIncomeId]);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = window.setTimeout(() => setFlashMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  useEffect(() => {
    if (!session?.user) return;

    settingsBootstrappedRef.current = false;
    setHouseholdsLoaded(false);

    const loadHouseholds = async () => {
      try {
        const response = await fetch("/api/households", { cache: "no-store" });
        if (!response.ok) {
          setHouseholds([]);
          return;
        }

        const data = (await response.json()) as { households: Household[] };
        const list = Array.isArray(data.households) ? data.households : [];
        setHouseholds(list);
      } finally {
        setHouseholdsLoaded(true);
      }
    };

    void loadHouseholds();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!mounted || !session?.user || !householdsLoaded || settingsBootstrappedRef.current) return;

    settingsBootstrappedRef.current = true;

    const loadUserSettings = async () => {
      try {
        const response = await fetch("/api/user-settings", { cache: "no-store" });
        if (!response.ok) {
          setDefaultScopeKey("personal");
          setActiveScopeKey("personal");
          return;
        }

        const data = (await response.json()) as { defaultScopeKey?: string };
        const requested = typeof data.defaultScopeKey === "string" && data.defaultScopeKey ? data.defaultScopeKey : "personal";
        const nextScope = scopeOptions.some((scope) => scope.key === requested) ? requested : "personal";

        setDefaultScopeKey(nextScope);
        setActiveScopeKey(nextScope);

        if (nextScope !== requested) {
          await fetch("/api/user-settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ defaultScopeKey: nextScope }),
          });
        }
      } catch {
        setDefaultScopeKey("personal");
        setActiveScopeKey("personal");
      }
    };

    void loadUserSettings();
  }, [mounted, householdsLoaded, session?.user, scopeOptions]);

  useEffect(() => {
    if (!mounted || !session?.user) return;

    const loadFinance = async () => {
      const response = await fetch(`/api/finance?scopeKey=${encodeURIComponent(activeScopeKey)}`, { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as FinancePayload;
      const nextExpenses = Array.isArray(data.expenses)
        ? data.expenses.map((item) => ({
            ...item,
            name: typeof item.name === "string" ? item.name : "",
          }))
        : [];
      const nextIncomes = Array.isArray(data.incomes)
        ? data.incomes.map((item) => ({
            ...item,
            name: typeof item.name === "string" ? item.name : "",
          }))
        : [];
      const nextCurrencyIncomes = Array.isArray(data.currencyIncomes)
        ? data.currencyIncomes.map((item) => ({
            ...item,
            name: typeof item.name === "string" && item.name.trim() ? item.name : item.currency,
          }))
        : [];
      const nextLimits = Array.isArray(data.limits) ? data.limits : [];

      setExpenses(nextExpenses);
      setIncomes(nextIncomes);
      setCurrencyIncomes(nextCurrencyIncomes);
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

  const formatByCode = (value: number, code: CurrencyCode) => {
    const output = mounted
      ? new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(value)
      : value.toFixed(2);
    return `${output} ${code}`;
  };

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
  const totalSpentCurrentMonth = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    return expenses.filter((expense) => expense.date.startsWith(currentMonthKey)).reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);
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

  const currencyTotals = useMemo(() => {
    const totals: Partial<Record<CurrencyCode, number>> = {};
    for (const item of currencyIncomes) {
      totals[item.currency] = (totals[item.currency] || 0) + Number(item.amount || 0);
    }
    return currencyOptions
      .map((option) => ({ currency: option.id, label: option.label, amount: totals[option.id] || 0 }))
      .filter((item) => item.amount > 0);
  }, [currencyIncomes]);

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
      setIsExpenseModalOpen(false);
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

  const openExpenseEditModal = (expense: Expense) => {
    if (!currentUserId || expense.createdById !== currentUserId) return;
    setEditingExpenseId(expense.id);
    setEditExpenseForm({
      name: expense.name,
      category: expense.category,
      source: expense.source,
      amount: String(expense.amount),
      date: expense.date,
    });
  };

  const openIncomeEditModal = (income: Income) => {
    if (!currentUserId || income.createdById !== currentUserId) return;
    setEditingIncomeId(income.id);
    setEditIncomeForm({
      name: income.name,
      type: income.type,
      category: income.category,
      amount: String(income.amount),
      date: income.date,
    });
  };

  const handleUpdateExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingExpenseId) return;

    const amountValue = Number(editExpenseForm.amount);
    if (!editExpenseForm.name.trim() || !editExpenseForm.date || !amountValue || amountValue <= 0) return;

    const response = await fetch("/api/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "expense",
        id: editingExpenseId,
        scopeKey: activeScopeKey,
        name: editExpenseForm.name.trim(),
        category: editExpenseForm.category,
        source: editExpenseForm.source,
        amount: amountValue,
        date: editExpenseForm.date,
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { item?: Expense };
    if (data.item) {
      setExpenses((prev) => prev.map((expense) => (expense.id === data.item?.id ? (data.item as Expense) : expense)));
      setEditingExpenseId(null);
    }
  };

  const handleUpdateIncome = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingIncomeId) return;

    const amountValue = Number(editIncomeForm.amount);
    if (!editIncomeForm.name.trim() || !editIncomeForm.date || !amountValue || amountValue <= 0) return;

    const response = await fetch("/api/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "income",
        id: editingIncomeId,
        scopeKey: activeScopeKey,
        name: editIncomeForm.name.trim(),
        type: editIncomeForm.type,
        category: editIncomeForm.category,
        amount: amountValue,
        date: editIncomeForm.date,
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { item?: Income };
    if (data.item) {
      setIncomes((prev) => prev.map((income) => (income.id === data.item?.id ? (data.item as Income) : income)));
      setEditingIncomeId(null);
    }
  };


  const openCurrencyIncomeEditModal = (item: CurrencyIncome) => {
    if (!currentUserId || item.createdById !== currentUserId) return;
    setEditingCurrencyIncomeId(item.id);
    setEditingCurrencyMode(item.amount < 0 ? "expense" : "income");
    setEditCurrencyIncomeForm({
      name: item.name || item.currency,
      currency: item.currency,
      amount: String(Math.abs(item.amount)),
      date: item.date,
    });
  };

  const handleUpdateCurrencyIncome = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCurrencyIncomeId) return;

    const amountValue = Number(editCurrencyIncomeForm.amount);
    if (!editCurrencyIncomeForm.name.trim() || !editCurrencyIncomeForm.currency || !editCurrencyIncomeForm.date || !amountValue || amountValue <= 0) return;

    const response = await fetch("/api/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: editingCurrencyMode === "expense" ? "currency_expense" : "currency_income",
        id: editingCurrencyIncomeId,
        scopeKey: activeScopeKey,
        name: editCurrencyIncomeForm.name.trim(),
        currency: editCurrencyIncomeForm.currency,
        amount: amountValue,
        date: editCurrencyIncomeForm.date,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFlashMessage({
        type: "error",
        text: payload.error || TXT.notEnoughCurrency,
      });
      return;
    }

    const data = (await response.json()) as { item?: CurrencyIncome };
    if (data.item) {
      setCurrencyIncomes((prev) => prev.map((row) => (row.id === data.item?.id ? (data.item as CurrencyIncome) : row)));
      setEditingCurrencyIncomeId(null);
    }
  };

  const handleDeleteCurrencyIncome = async (id: string) => {
    const response = await fetch(`/api/finance?kind=currency_income&id=${encodeURIComponent(id)}&scopeKey=${encodeURIComponent(activeScopeKey)}`, {
      method: "DELETE",
    });
    if (!response.ok) return;
    setCurrencyIncomes((prev) => prev.filter((item) => item.id !== id));
  };
  const handleAddCurrencyIncome = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(currencyIncomeForm.amount);
    if (!currencyIncomeForm.name.trim() || !currencyIncomeForm.currency || !currencyIncomeForm.date || !amountValue || amountValue <= 0) return;

    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "currency_income",
        scopeKey: activeScopeKey,
        name: currencyIncomeForm.name.trim(),
        currency: currencyIncomeForm.currency,
        amount: amountValue,
        date: currencyIncomeForm.date,
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { item?: CurrencyIncome };
    if (data.item) {
      setCurrencyIncomes((prev) => [data.item as CurrencyIncome, ...prev]);
      setCurrencyIncomeForm((prev) => ({ ...prev, name: "", amount: "" }));
      setIsCurrencyIncomeModalOpen(false);
    }
  };

  const handleAddCurrencyExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number(currencyIncomeForm.amount);
    if (!currencyIncomeForm.name.trim() || !currencyIncomeForm.currency || !currencyIncomeForm.date || !amountValue || amountValue <= 0) return;

    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "currency_expense",
        scopeKey: activeScopeKey,
        name: currencyIncomeForm.name.trim(),
        currency: currencyIncomeForm.currency,
        amount: amountValue,
        date: currencyIncomeForm.date,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFlashMessage({
        type: "error",
        text: payload.error || TXT.notEnoughCurrency,
      });
      return;
    }

    const data = (await response.json()) as { item?: CurrencyIncome };
    if (data.item) {
      setCurrencyIncomes((prev) => [data.item as CurrencyIncome, ...prev]);
      setCurrencyIncomeForm((prev) => ({ ...prev, name: "", amount: "" }));
      setIsCurrencyIncomeModalOpen(false);
      setFlashMessage({ type: "success", text: TXT.currencyExpenseSaved });
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
    setIsExpenseModalOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        expenseAmountRef.current?.focus();
      });
    });
  };

  const handleCurrencyFabToggle = () => {
    setCurrencyFabOpen((prev) => !prev);
  };

  const openCurrencyQuickModal = (mode: "income" | "expense") => {
    setCurrencyModalMode(mode);
    setIsCurrencyIncomeModalOpen(true);
    setCurrencyFabOpen(false);
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
            <div className="settings-wrap" ref={settingsRef}>
              <button
                className="profile-toggle"
                type="button"
                aria-label={TXT.settings}
                onClick={() => setSettingsOpen((prev) => !prev)}
              >
                <UserCircle2 size={22} />
              </button>
              {settingsOpen ? (
                <div className="settings-popover">
                  <p className="settings-title">{TXT.settings}</p>

                  <div className="settings-group">
                    <p className="settings-label">{TXT.account}</p>
                    <p className="settings-value">{currentUserName}</p>
                  </div>

                  <div className="settings-group">
                    <p className="settings-label">{TXT.theme}</p>
                    <div className="theme-switch">
                      <button
                        type="button"
                        className={`theme-btn ${themeMode === "dark" ? "active" : ""}`}
                        onClick={() => setThemeMode("dark")}
                      >
                        <Moon size={14} /> {TXT.darkTheme}
                      </button>
                      <button
                        type="button"
                        className={`theme-btn ${themeMode === "light" ? "active" : ""}`}
                        onClick={() => setThemeMode("light")}
                      >
                        <Sun size={14} /> {TXT.lightTheme}
                      </button>
                    </div>
                  </div>

                  <div className="settings-group">
                    <label className="settings-label" htmlFor="default-scope-select">{TXT.defaultScope}</label>
                    <select
                      id="default-scope-select"
                      value={defaultScopeKey}
                      onChange={(event) => {
                        const nextScopeKey = event.target.value;
                        setDefaultScopeKey(nextScopeKey);
                        void fetch("/api/user-settings", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ defaultScopeKey: nextScopeKey }),
                        });
                      }}
                    >
                      {scopeOptions.map((scope) => <option key={scope.key} value={scope.key}>{scope.label}</option>)}
                    </select>
                  </div>

                  <button className="row-action row-action-danger settings-signout" type="button" onClick={() => signOut({ callbackUrl: "/sign-in" })}>{TXT.signOut}</button>
                </div>
              ) : null}
            </div>
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
              <div className="balance-item balance-hero">
                <strong className={`balance-hero-amount ${balanceAmountSizeClass}`}>{totalBalanceText}</strong>
                <p className="balance-hero-meta"><span className="balance-hero-meta-strong"><span className="balance-hero-arrow">↗</span> +{formatCurrency(totalIncomeCurrentMonth)}</span> {TXT.incomeThisMonth}</p>
                <p className="balance-hero-meta balance-hero-meta-expense"><span className="balance-hero-meta-strong-expense"><span className="balance-hero-arrow-down">↘</span> -{formatCurrency(totalSpentCurrentMonth)}</span> {TXT.expensesThisMonth}</p>
              </div>
              <div className="balance-item"><span className="balance-item-label"><Wallet size={16} /> {TXT.cashBalance}</span><strong>{formatCurrency(cashBalance)}</strong></div>
              <div className="balance-item"><span className="balance-item-label"><CreditCard size={16} /> {TXT.cardBalance}</span><strong>{formatCurrency(cardBalance)}</strong></div>
            </div>
          </article>

          <article className="card currency-card">
            <button className="accordion-toggle" type="button" onClick={() => setCurrencyAccordionOpen((prev) => !prev)}>
              <span>{TXT.currencyBalance}</span>
              <span>{currencyAccordionOpen ? "−" : "+"}</span>
            </button>
            {currencyAccordionOpen ? (
              <div className="accordion-content">
                {currencyTotals.length === 0 ? (
                  <p className="empty-line">{TXT.noCurrencyYet}</p>
                ) : (
                  <div className="currency-list">
                    {currencyTotals.map((item) => (
                      <div className="currency-row" key={item.currency}>
                        <strong>{item.label}</strong>
                        <span>{formatByCode(item.amount, item.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
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
                    <div className="entry-top"><strong className={`entry-title ${expense.name.trim().length > 18 ? "entry-title-marquee" : ""}`}><span>{expense.name}</span></strong><span className="entry-date">{mounted ? formatDate(expense.date) : expense.date}</span></div><p className="entry-meta">{categoryLabelMap[expense.category]} | {TXT.expenseSource}: {expense.source === "cash" ? "\u0413\u043e\u0442\u0456\u0432\u043a\u0430" : "\u041a\u0430\u0440\u0442\u043a\u0430"} | {TXT.author}: {expense.createdByName || TXT.unknownUser}</p><div className="entry-bottom"><strong className="entry-amount">-{formatCurrency(expense.amount)}</strong><div className="entry-actions">{expense.createdById === currentUserId ? <button className="row-action row-action-warning row-action-compact" type="button" onClick={() => openExpenseEditModal(expense)}>{TXT.edit}</button> : null}<button className="row-action row-action-danger row-action-compact" type="button" onClick={() => handleDeleteExpense(expense.id)}>{TXT.delete}</button></div></div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="card">
            <p className="section-label">{TXT.currencyRecordsTitle}</p>
            {currencyIncomes.length === 0 ? <p className="empty-line">{TXT.noCurrencyYet}</p> : (
              <div className="income-table expense-table-scroll">
                {currencyIncomes.map((item) => (
                  <div className="income-row" key={item.id}>
                    <div className="entry-top"><strong className={`entry-title ${item.name.trim().length > 18 ? "entry-title-marquee" : ""}`}><span>{item.name}</span></strong><span className="entry-date">{mounted ? formatDate(item.date) : item.date}</span></div><p className="entry-meta">{item.currency} | {TXT.author}: {item.createdByName || TXT.unknownUser}</p><div className="entry-bottom"><strong className={`entry-amount ${item.amount >= 0 ? "entry-amount-income" : ""}`}>{item.amount >= 0 ? "+" : "-"}{formatByCode(Math.abs(item.amount), item.currency)}</strong><div className="entry-actions">{item.createdById === currentUserId ? <button className="row-action row-action-warning row-action-compact" type="button" onClick={() => openCurrencyIncomeEditModal(item)}>{TXT.edit}</button> : null}{item.createdById === currentUserId ? <button className="row-action row-action-danger row-action-compact" type="button" onClick={() => handleDeleteCurrencyIncome(item.id)}>{TXT.delete}</button> : null}</div></div>
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
              <div className="income-table expense-table-scroll">
                {incomes.map((income) => (
                  <div className="income-row" key={income.id}>
                    <div className="entry-top"><strong className={`entry-title ${income.name.trim().length > 18 ? "entry-title-marquee" : ""}`}><span>{income.name}</span></strong><span className="entry-date">{mounted ? formatDate(income.date) : income.date}</span></div><p className="entry-meta">{incomeTypeLabelMap[income.type]} | {incomeCategoryLabelMap[income.category]} | {TXT.author}: {income.createdByName || TXT.unknownUser}</p><div className="entry-bottom"><strong className="entry-amount entry-amount-income">+{formatCurrency(income.amount)}</strong><div className="entry-actions">{income.createdById === currentUserId ? <button className="row-action row-action-warning row-action-compact" type="button" onClick={() => openIncomeEditModal(income)}>{TXT.edit}</button> : null}<button className="row-action row-action-danger row-action-compact" type="button" onClick={() => handleDeleteIncome(income.id)}>{TXT.delete}</button></div></div>
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

      {isExpenseModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsExpenseModalOpen(false)}>
          <article className="card modal-card" role="dialog" aria-modal="true" aria-label={TXT.addExpense} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{TXT.addExpense}</h2>
              <button className="modal-close" type="button" aria-label="Закрити" onClick={() => setIsExpenseModalOpen(false)}>×</button>
            </div>
            <form className="expense-form" onSubmit={handleAddExpense}>
              <label>{TXT.name}<input type="text" placeholder={TXT.namePlaceholder} value={expenseForm.name} onChange={(event) => setExpenseForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.category}<select value={expenseForm.category} onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value as CategoryId }))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>{TXT.expenseSource}<select value={expenseForm.source} onChange={(event) => setExpenseForm((prev) => ({ ...prev, source: event.target.value as ExpenseSourceId }))}>{expenseSources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
              <label>{TXT.amount}<input ref={expenseAmountRef} type="number" min="1" step="1" placeholder="0" value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
              <label>{TXT.date}<input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))} required /></label>
              <button className="button button-primary" type="submit">{TXT.save}</button>
            </form>
          </article>
        </div>
      ) : null}

      {isCurrencyIncomeModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCurrencyIncomeModalOpen(false)}>
          <article className="card modal-card" role="dialog" aria-modal="true" aria-label={currencyModalMode === "income" ? TXT.addCurrency : TXT.spendCurrency} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{currencyModalMode === "income" ? TXT.addCurrency : TXT.spendCurrency}</h2>
              <button className="modal-close" type="button" aria-label="\u0417\u0430\u043a\u0440\u0438\u0442\u0438" onClick={() => setIsCurrencyIncomeModalOpen(false)}>{"\u00d7"}</button>
            </div>
            <form className="income-form" onSubmit={currencyModalMode === "income" ? handleAddCurrencyIncome : handleAddCurrencyExpense}>
              <label>{TXT.name}<input type="text" placeholder={TXT.incomeNamePlaceholder} value={currencyIncomeForm.name} onChange={(event) => setCurrencyIncomeForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.currency}<select value={currencyIncomeForm.currency} onChange={(event) => setCurrencyIncomeForm((prev) => ({ ...prev, currency: event.target.value as CurrencyCode }))}>{currencyOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label>{TXT.amount}<input type="number" min="0.01" step="0.01" placeholder="0" value={currencyIncomeForm.amount} onChange={(event) => setCurrencyIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
              <label>{TXT.date}<input type="date" value={currencyIncomeForm.date} onChange={(event) => setCurrencyIncomeForm((prev) => ({ ...prev, date: event.target.value }))} required /></label>
              <button className="button button-primary" type="submit">{TXT.save}</button>
            </form>
          </article>
        </div>
      ) : null}

      {editingExpenseId ? (
        <div className="modal-backdrop" onClick={() => setEditingExpenseId(null)}>
          <article className="card modal-card" role="dialog" aria-modal="true" aria-label={TXT.edit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{TXT.edit}</h2>
              <button className="modal-close" type="button" aria-label="Закрити" onClick={() => setEditingExpenseId(null)}>×</button>
            </div>
            <form className="expense-form" onSubmit={handleUpdateExpense}>
              <label>{TXT.name}<input type="text" placeholder={TXT.namePlaceholder} value={editExpenseForm.name} onChange={(event) => setEditExpenseForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.category}<select value={editExpenseForm.category} onChange={(event) => setEditExpenseForm((prev) => ({ ...prev, category: event.target.value as CategoryId }))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>{TXT.expenseSource}<select value={editExpenseForm.source} onChange={(event) => setEditExpenseForm((prev) => ({ ...prev, source: event.target.value as ExpenseSourceId }))}>{expenseSources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
              <label>{TXT.amount}<input type="number" min="1" step="1" placeholder="0" value={editExpenseForm.amount} onChange={(event) => setEditExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
              <label>{TXT.date}<input type="date" value={editExpenseForm.date} onChange={(event) => setEditExpenseForm((prev) => ({ ...prev, date: event.target.value }))} required /></label>
              <button className="button button-primary" type="submit">{TXT.save}</button>
            </form>
          </article>
        </div>
      ) : null}

      {editingCurrencyIncomeId ? (
        <div className="modal-backdrop" onClick={() => setEditingCurrencyIncomeId(null)}>
          <article className="card modal-card" role="dialog" aria-modal="true" aria-label={TXT.edit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{TXT.edit}</h2>
              <button className="modal-close" type="button" aria-label="Закрити" onClick={() => setEditingCurrencyIncomeId(null)}>×</button>
            </div>
            <form className="income-form" onSubmit={handleUpdateCurrencyIncome}>
              <label>{TXT.name}<input type="text" placeholder={TXT.incomeNamePlaceholder} value={editCurrencyIncomeForm.name} onChange={(event) => setEditCurrencyIncomeForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.currency}<select value={editCurrencyIncomeForm.currency} onChange={(event) => setEditCurrencyIncomeForm((prev) => ({ ...prev, currency: event.target.value as CurrencyCode }))}>{currencyOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label>{TXT.amount}<input type="number" min="0.01" step="0.01" placeholder="0" value={editCurrencyIncomeForm.amount} onChange={(event) => setEditCurrencyIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
              <label>{TXT.date}<input type="date" value={editCurrencyIncomeForm.date} onChange={(event) => setEditCurrencyIncomeForm((prev) => ({ ...prev, date: event.target.value }))} required /></label>
              <button className="button button-primary" type="submit">{TXT.save}</button>
            </form>
          </article>
        </div>
      ) : null}
      {editingIncomeId ? (
        <div className="modal-backdrop" onClick={() => setEditingIncomeId(null)}>
          <article className="card modal-card" role="dialog" aria-modal="true" aria-label={TXT.edit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{TXT.edit}</h2>
              <button className="modal-close" type="button" aria-label="Закрити" onClick={() => setEditingIncomeId(null)}>×</button>
            </div>
            <form className="income-form" onSubmit={handleUpdateIncome}>
              <label>{TXT.name}<input type="text" placeholder={TXT.incomeNamePlaceholder} value={editIncomeForm.name} onChange={(event) => setEditIncomeForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>{TXT.incomeType}<select value={editIncomeForm.type} onChange={(event) => setEditIncomeForm((prev) => ({ ...prev, type: event.target.value as IncomeTypeId }))}>{incomeTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
              <label>{TXT.incomeCategory}<select value={editIncomeForm.category} onChange={(event) => setEditIncomeForm((prev) => ({ ...prev, category: event.target.value as IncomeCategoryId }))}>{incomeCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>{TXT.amount}<input type="number" min="1" step="1" placeholder="0" value={editIncomeForm.amount} onChange={(event) => setEditIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label>
              <label>{TXT.date}<input type="date" value={editIncomeForm.date} onChange={(event) => setEditIncomeForm((prev) => ({ ...prev, date: event.target.value }))} required /></label>
              <button className="button button-primary" type="submit">{TXT.save}</button>
            </form>
          </article>
        </div>
      ) : null}

      <div ref={currencyFabRef} className={`currency-fab-stack ${currencyFabOpen ? "open" : ""}`}>
        <button
          className="currency-fab-option"
          type="button"
          onClick={() => openCurrencyQuickModal("income")}
        >
          {TXT.addCurrency}
        </button>
        <button
          className="currency-fab-option"
          type="button"
          onClick={() => openCurrencyQuickModal("expense")}
        >
          {TXT.spendCurrency}
        </button>
        <button
          className="currency-fab-trigger"
          type="button"
          aria-label={TXT.currency}
          aria-expanded={currencyFabOpen}
          onClick={handleCurrencyFabToggle}
        >
          <DollarSign size={24} />
        </button>
      </div>

      {flashMessage ? (
        <div className={`flash-toast flash-${flashMessage.type}`}>{flashMessage.text}</div>
      ) : null}

      <button className="fab-action" type="button" aria-label={TXT.addExpense} title={TXT.addExpense} onClick={handleFabClick}>
        <span className="fab-plus" aria-hidden="true">+</span>
        <span>{TXT.addExpense}</span>
      </button>
    </main>
  );
}
