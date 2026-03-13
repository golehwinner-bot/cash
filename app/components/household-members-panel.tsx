"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Household = {
  id: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type JoinRole = "ADMIN" | "MEMBER";

type JoinCodeState = {
  code: string;
  role: JoinRole;
  expiresAt: string;
};

type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: "ROOM_DELETED";
  createdAt: string;
  readAt: string | null;
};

const TXT = {
  section: "\u041a\u0456\u043c\u043d\u0430\u0442\u0438",
  createTitle: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u043d\u043e\u0432\u0443 \u043a\u0456\u043c\u043d\u0430\u0442\u0443",
  roomName: "\u041d\u0430\u0437\u0432\u0430 \u043a\u0456\u043c\u043d\u0430\u0442\u0438",
  roomNamePlaceholder: "\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434, \u0411\u044e\u0434\u0436\u0435\u0442 \u0440\u043e\u0434\u0438\u043d\u0438",
  create: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438",
  creating: "\u0421\u0442\u0432\u043e\u0440\u044e\u0454\u043c\u043e...",
  loading: "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f...",
  emptyHouseholds: "\u0423 \u0432\u0430\u0441 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u043a\u0456\u043c\u043d\u0430\u0442. \u0421\u0442\u0432\u043e\u0440\u0456\u0442\u044c \u043f\u0435\u0440\u0448\u0443 \u043a\u0456\u043c\u043d\u0430\u0442\u0443 \u0432\u0438\u0449\u0435.",
  emptyMembers: "\u0423 \u0446\u0456\u0439 \u043a\u0456\u043c\u043d\u0430\u0442\u0456 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0443\u0447\u0430\u0441\u043d\u0438\u043a\u0456\u0432.",
  membersTitle: "\u0423\u0447\u0430\u0441\u043d\u0438\u043a\u0438",
  role_OWNER: "\u0412\u043b\u0430\u0441\u043d\u0438\u043a",
  role_ADMIN: "\u0410\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440",
  role_MEMBER: "\u0423\u0447\u0430\u0441\u043d\u0438\u043a",
  myRole: "\u041c\u043e\u044f \u0440\u043e\u043b\u044c",
  createError: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u043a\u0456\u043c\u043d\u0430\u0442\u0443.",
  inviteTitle: "\u041a\u043e\u0434 \u0437\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u043d\u044f",
  inviteRole: "\u0420\u043e\u043b\u044c \u0434\u043b\u044f \u043d\u043e\u0432\u043e\u0433\u043e \u0443\u0447\u0430\u0441\u043d\u0438\u043a\u0430",
  generateCode: "\u0417\u0433\u0435\u043d\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434",
  generatingCode: "\u0413\u0435\u043d\u0435\u0440\u0443\u0454\u043c\u043e...",
  clearCode: "\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434",
  clearingCode: "\u0421\u043a\u0430\u0441\u043e\u0432\u0443\u0454\u043c\u043e...",
  code: "\u041a\u043e\u0434",
  expiresAt: "\u0414\u0456\u0439\u0441\u043d\u0438\u0439 \u0434\u043e",
  joinTitle: "\u041f\u0440\u0438\u0454\u0434\u043d\u0430\u0442\u0438\u0441\u044c \u043f\u043e \u043a\u043e\u0434\u0443",
  joinCodeLabel: "6-\u0437\u043d\u0430\u0447\u043d\u0438\u0439 \u043a\u043e\u0434",
  joinCodePlaceholder: "123456",
  join: "\u041f\u0440\u0438\u0454\u0434\u043d\u0430\u0442\u0438\u0441\u044c",
  joining: "\u041f\u0440\u0438\u0454\u0434\u043d\u0443\u0454\u043c\u043e\u0441\u044c...",
  joinSuccess: "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u043f\u0440\u0438\u0454\u0434\u043d\u0430\u043d\u043e \u0434\u043e \u043a\u0456\u043c\u043d\u0430\u0442\u0438.",
  joinError: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043f\u0440\u0438\u0454\u0434\u043d\u0430\u0442\u0438\u0441\u044c \u043f\u043e \u043a\u043e\u0434\u0443.",
  notifications: "\u0421\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u043d\u044f",
  noNotifications: "\u041f\u043e\u043a\u0438 \u0449\u043e \u043d\u0435\u043c\u0430\u0454 \u0441\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u044c.",
  markAllRead: "\u041f\u043e\u0437\u043d\u0430\u0447\u0438\u0442\u0438 \u0432\u0441\u0456 \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u0438\u043c\u0438",
  rename: "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u043d\u0430\u0437\u0432\u0443",
  saveName: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u043d\u0430\u0437\u0432\u0443",
  cancel: "\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438",
  deleteRoom: "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u043a\u0456\u043c\u043d\u0430\u0442\u0443",
  deletingRoom: "\u0412\u0438\u0434\u0430\u043b\u044f\u0454\u043c\u043e...",
  deleteConfirm: "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u043a\u0456\u043c\u043d\u0430\u0442\u0443? \u0423\u0447\u0430\u0441\u043d\u0438\u043a\u0438 \u043e\u0442\u0440\u0438\u043c\u0430\u044e\u0442\u044c \u0441\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u043d\u044f.",
  ownerOnly: "\u041b\u0438\u0448\u0435 \u0432\u043b\u0430\u0441\u043d\u0438\u043a \u043c\u043e\u0436\u0435 \u0440\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0430\u0431\u043e \u0432\u0438\u0434\u0430\u043b\u044f\u0442\u0438 \u043a\u0456\u043c\u043d\u0430\u0442\u0443.",
  renameError: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u043c\u0456\u043d\u0438\u0442\u0438 \u043d\u0430\u0437\u0432\u0443 \u043a\u0456\u043c\u043d\u0430\u0442\u0438.",
  deleteError: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u043a\u0456\u043c\u043d\u0430\u0442\u0443.",
  removeMember: "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438",
  leaveRoom: "\u0412\u0438\u0439\u0442\u0438",
  removingMember: "\u0412\u0438\u0434\u0430\u043b\u044f\u0454\u043c\u043e...",
  removeMemberError: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0443\u0447\u0430\u0441\u043d\u0438\u043a\u0430.",
  leaveRoomConfirm: "\u0412\u0438\u0439\u0442\u0438 \u0437 \u043a\u0456\u043c\u043d\u0430\u0442\u0438?",
};

const roleLabel = (role: Member["role"] | Household["role"] | JoinRole) => {
  if (role === "OWNER") return TXT.role_OWNER;
  if (role === "ADMIN") return TXT.role_ADMIN;
  return TXT.role_MEMBER;
};

const formatStamp = (iso: string) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function HouseholdMembersPanel() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "";

  const [households, setHouseholds] = useState<Household[]>([]);
  const [membersByHousehold, setMembersByHousehold] = useState<Record<string, Member[]>>({});
  const [joinCodes, setJoinCodes] = useState<Record<string, JoinCodeState | null>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [busyHouseholdId, setBusyHouseholdId] = useState<string | null>(null);
  const [roleByHousehold, setRoleByHousehold] = useState<Record<string, JoinRole>>({});
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingHouseholdId, setDeletingHouseholdId] = useState<string | null>(null);
  const [expandedHouseholdId, setExpandedHouseholdId] = useState<string | null>(null);
  const [removingMemberKey, setRemovingMemberKey] = useState<string | null>(null);

  const loadNotifications = async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { notifications: AppNotification[] };
    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
  };

  const loadHouseholds = async () => {
    const householdsResponse = await fetch("/api/households", { cache: "no-store" });
    if (!householdsResponse.ok) throw new Error("Failed to load households");

    const householdsData = (await householdsResponse.json()) as { households: Household[] };
    const list = Array.isArray(householdsData.households) ? householdsData.households : [];
    setHouseholds(list);

    setExpandedHouseholdId((prev) => {
      if (list.length === 0) return null;
      if (prev && list.some((item) => item.id === prev)) return prev;
      return null;
    });

    setRoleByHousehold((prev) => {
      const next = { ...prev };
      for (const household of list) {
        if (!next[household.id]) next[household.id] = "MEMBER";
      }
      return next;
    });

    const memberEntries = await Promise.all(
      list.map(async (household) => {
        const response = await fetch(`/api/households/${household.id}/members`, { cache: "no-store" });
        if (!response.ok) return [household.id, [] as Member[]] as const;

        const data = (await response.json()) as { members: Member[] };
        return [household.id, Array.isArray(data.members) ? data.members : []] as const;
      }),
    );

    setMembersByHousehold(Object.fromEntries(memberEntries));

    const codeEntries = await Promise.all(
      list
        .filter((household) => household.role === "OWNER" || household.role === "ADMIN")
        .map(async (household) => {
          const response = await fetch(`/api/households/${household.id}/join-code`, { cache: "no-store" });
          if (!response.ok) return [household.id, null] as const;

          const data = (await response.json()) as {
            code: string | null;
            role: JoinRole | null;
            expiresAt: string | null;
          };

          if (!data.code || !data.role || !data.expiresAt) return [household.id, null] as const;

          return [household.id, { code: data.code, role: data.role, expiresAt: data.expiresAt }] as const;
        }),
    );

    setJoinCodes((prev) => ({ ...prev, ...Object.fromEntries(codeEntries) }));
  };

  const load = async () => {
    await Promise.all([loadHouseholds(), loadNotifications()]);
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await load();
      } catch {
        if (!active) return;
        setHouseholds([]);
        setMembersByHousehold({});
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const handleCreateHousehold = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomName.trim()) return;

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: TXT.createError }));
        setError(body.error || TXT.createError);
        return;
      }

      setRoomName("");
      await load();
    } catch {
      setError(TXT.createError);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateCode = async (householdId: string) => {
    const selectedRole = roleByHousehold[householdId] || "MEMBER";

    setBusyHouseholdId(householdId);
    setError("");

    try {
      const response = await fetch(`/api/households/${householdId}/join-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u0433\u0435\u043d\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434." }));
        setError(body.error || "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u0433\u0435\u043d\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434.");
        return;
      }

      const data = (await response.json()) as JoinCodeState;
      setJoinCodes((prev) => ({ ...prev, [householdId]: data }));
    } catch {
      setError("\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u0433\u0435\u043d\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434.");
    } finally {
      setBusyHouseholdId(null);
    }
  };

  const handleClearCode = async (householdId: string) => {
    setBusyHouseholdId(householdId);
    setError("");

    try {
      const response = await fetch(`/api/households/${householdId}/join-code`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434." }));
        setError(body.error || "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434.");
        return;
      }

      setJoinCodes((prev) => ({ ...prev, [householdId]: null }));
    } catch {
      setError("\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043a\u043e\u0434.");
    } finally {
      setBusyHouseholdId(null);
    }
  };

  const handleJoinByCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setJoinError("");
    setJoinSuccess("");

    if (!/^\d{6}$/.test(joinCodeInput.trim())) {
      setJoinError("\u041a\u043e\u0434 \u043c\u0430\u0454 \u043c\u0456\u0441\u0442\u0438\u0442\u0438 6 \u0446\u0438\u0444\u0440.");
      return;
    }

    setJoining(true);

    try {
      const response = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCodeInput.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: TXT.joinError }));
        setJoinError(body.error || TXT.joinError);
        return;
      }

      setJoinCodeInput("");
      setJoinSuccess(TXT.joinSuccess);
      await load();
    } catch {
      setJoinError(TXT.joinError);
    } finally {
      setJoining(false);
    }
  };
  const handleRenameRoom = async (householdId: string) => {
    if (!editingName.trim()) return;

    setError("");
    setBusyHouseholdId(householdId);

    try {
      const response = await fetch(`/api/households/${householdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: TXT.renameError }));
        setError(body.error || TXT.renameError);
        return;
      }

      setEditingHouseholdId(null);
      setEditingName("");
      await loadHouseholds();
    } catch {
      setError(TXT.renameError);
    } finally {
      setBusyHouseholdId(null);
    }
  };

  const handleDeleteRoom = async (householdId: string) => {
    if (!confirm(TXT.deleteConfirm)) return;

    setError("");
    setDeletingHouseholdId(householdId);

    try {
      const response = await fetch(`/api/households/${householdId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: TXT.deleteError }));
        setError(body.error || TXT.deleteError);
        return;
      }

      await load();
    } catch {
      setError(TXT.deleteError);
    } finally {
      setDeletingHouseholdId(null);
    }
  };

  const handleRemoveMember = async (household: Household, member: Member) => {
    const isSelf = member.userId === currentUserId;
    if (isSelf && !confirm(TXT.leaveRoomConfirm)) return;

    const key = `${household.id}:${member.userId}`;
    setRemovingMemberKey(key);
    setError("");

    try {
      const response = await fetch(`/api/households/${household.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.userId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: TXT.removeMemberError }));
        setError(body.error || TXT.removeMemberError);
        return;
      }

      await load();
    } catch {
      setError(TXT.removeMemberError);
    } finally {
      setRemovingMemberKey(null);
    }
  };

  const markAllNotificationsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);

    await loadNotifications();
  };

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <article className="card">
      <p className="section-label">{TXT.section}</p>

      <div className="filters-card">
        <p className="section-label">{TXT.createTitle}</p>
        <form className="expense-form" onSubmit={handleCreateHousehold}>
          <label>
            {TXT.roomName}
            <input
              type="text"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder={TXT.roomNamePlaceholder}
              required
            />
          </label>

          <button className="button button-primary" type="submit" disabled={creating}>
            {creating ? TXT.creating : TXT.create}
          </button>
        </form>
      </div>

      <div className="filters-card">
        <p className="section-label">{TXT.joinTitle}</p>
        <form className="expense-form" onSubmit={handleJoinByCode}>
          <label>
            {TXT.joinCodeLabel}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={joinCodeInput}
              onChange={(event) => setJoinCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={TXT.joinCodePlaceholder}
              required
            />
          </label>

          <button className="button button-primary" type="submit" disabled={joining}>
            {joining ? TXT.joining : TXT.join}
          </button>
        </form>
        {joinError ? <p className="auth-error">{joinError}</p> : null}
        {joinSuccess ? <p className="summary-pill">{joinSuccess}</p> : null}
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
      {loading ? <p className="empty-line">{TXT.loading}</p> : null}
      {!loading && households.length === 0 ? <p className="empty-line">{TXT.emptyHouseholds}</p> : null}

      {!loading && households.length > 0 ? (
        <div className="household-list room-accordion-list">
          {households.map((household) => {
            const members = membersByHousehold[household.id] ?? [];
            const canManageCodes = household.role === "OWNER" || household.role === "ADMIN";
            const canManageMembers = household.role === "OWNER" || household.role === "ADMIN";
            const isOwner = household.role === "OWNER";
            const canLeaveRoom = household.role !== "OWNER";
            const codeInfo = joinCodes[household.id] ?? null;
            const isBusy = busyHouseholdId === household.id;
            const isDeleting = deletingHouseholdId === household.id;
            const isEditing = editingHouseholdId === household.id;
            const expanded = expandedHouseholdId === household.id;

            return (
              <section key={household.id} className="household-card room-accordion-card">
                <button
                  className="accordion-toggle room-accordion-toggle"
                  type="button"
                  onClick={() => setExpandedHouseholdId((prev) => (prev === household.id ? null : household.id))}
                >
                  <span className="room-accordion-title">
                    <strong>{household.name}</strong>
                    <small>{TXT.myRole}: {roleLabel(household.role)}</small>
                  </span>
                  <span>{expanded ? "\u2212" : "+"}</span>
                </button>

                {expanded ? (
                  <div className="accordion-content room-accordion-content">
                    {isEditing ? (
                      <div className="invite-controls">
                        <label>
                          {TXT.roomName}
                          <input
                            type="text"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            required
                          />
                        </label>
                        <div className="invite-actions">
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => handleRenameRoom(household.id)}
                            disabled={isBusy}
                          >
                            {TXT.saveName}
                          </button>
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => {
                              setEditingHouseholdId(null);
                              setEditingName("");
                            }}
                          >
                            {TXT.cancel}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {isOwner ? (
                      <div className="invite-actions">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => {
                            setEditingHouseholdId(household.id);
                            setEditingName(household.name);
                          }}
                        >
                          {TXT.rename}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => handleDeleteRoom(household.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? TXT.deletingRoom : TXT.deleteRoom}
                        </button>
                      </div>
                    ) : (
                      <p className="empty-line">{TXT.ownerOnly}</p>
                    )}

                    {canManageCodes ? (
                      <div className="invite-controls">
                        <label>
                          {TXT.inviteRole}
                          <select
                            value={roleByHousehold[household.id] || "MEMBER"}
                            onChange={(event) =>
                              setRoleByHousehold((prev) => ({
                                ...prev,
                                [household.id]: event.target.value as JoinRole,
                              }))
                            }
                          >
                            <option value="MEMBER">{TXT.role_MEMBER}</option>
                            <option value="ADMIN">{TXT.role_ADMIN}</option>
                          </select>
                        </label>

                        <div className="invite-actions">
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => handleGenerateCode(household.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? TXT.generatingCode : TXT.generateCode}
                          </button>

                          {codeInfo ? (
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => handleClearCode(household.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? TXT.clearingCode : TXT.clearCode}
                            </button>
                          ) : null}
                        </div>

                        {codeInfo ? (
                          <p className="summary-pill">
                            {TXT.code}: <strong>{codeInfo.code}</strong> | {TXT.inviteRole}: {roleLabel(codeInfo.role)} | {TXT.expiresAt}: {new Date(codeInfo.expiresAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {canLeaveRoom ? (
                      <div className="invite-actions">
                        <button
                          className="row-action row-action-danger"
                          type="button"
                          onClick={() => {
                            const selfMember = members.find((item) => item.userId === currentUserId);
                            if (selfMember) void handleRemoveMember(household, selfMember);
                          }}
                          disabled={removingMemberKey === `${household.id}:${currentUserId}`}
                        >
                          {removingMemberKey === `${household.id}:${currentUserId}` ? TXT.removingMember : TXT.leaveRoom}
                        </button>
                      </div>
                    ) : null}

                    <p className="section-label">{TXT.membersTitle}</p>
                    {members.length === 0 ? (
                      <p className="empty-line">{TXT.emptyMembers}</p>
                    ) : (
                      <div className="household-members">
                        {members.map((member) => {
                          const isSelf = member.userId === currentUserId;
                          const canRemoveTarget =
                            canManageMembers && member.role !== "OWNER" && !isSelf;
                          const rowBusy = removingMemberKey === `${household.id}:${member.userId}`;

                          return (
                            <div className="household-member-row" key={member.id}>
                              <div>
                                <strong>{member.name?.trim() || "\u041d\u0435\u0432\u0456\u0434\u043e\u043c\u0438\u0439 \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447"}</strong>
                              </div>
                              <div className="member-row-actions">
                                <span>{roleLabel(member.role)}</span>
                                {canRemoveTarget ? (
                                  <button
                                    className="row-action row-action-danger row-action-compact"
                                    type="button"
                                    onClick={() => void handleRemoveMember(household, member)}
                                    disabled={rowBusy}
                                  >
                                    {rowBusy ? TXT.removingMember : (isSelf ? TXT.leaveRoom : TXT.removeMember)}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

