"use client";

import { FormEvent, useEffect, useState } from "react";

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
  section: "Кімната",
  createTitle: "Створити нову кімнату",
  roomName: "Назва кімнати",
  roomNamePlaceholder: "Наприклад, Бюджет родини",
  create: "Створити",
  creating: "Створюємо...",
  loading: "Завантаження...",
  emptyHouseholds: "У вас поки немає кімнат. Створіть першу кімнату вище.",
  emptyMembers: "У цій кімнаті поки немає учасників.",
  role_OWNER: "Власник",
  role_ADMIN: "Адміністратор",
  role_MEMBER: "Учасник",
  myRole: "Моя роль",
  createError: "Не вдалося створити кімнату.",
  inviteTitle: "Код запрошення",
  inviteRole: "Роль для нового учасника",
  generateCode: "Згенерувати код",
  generatingCode: "Генеруємо...",
  clearCode: "Скасувати код",
  clearingCode: "Скасовуємо...",
  code: "Код",
  expiresAt: "Дійсний до",
  joinTitle: "Приєднатись по коду",
  joinCodeLabel: "6-значний код",
  joinCodePlaceholder: "123456",
  join: "Приєднатись",
  joining: "Приєднуємось...",
  joinSuccess: "Успішно приєднано до кімнати.",
  joinError: "Не вдалося приєднатись по коду.",
  notifications: "Сповіщення",
  noNotifications: "Поки що немає сповіщень.",
  markAllRead: "Позначити всі прочитаними",
  rename: "Редагувати назву",
  saveName: "Зберегти назву",
  cancel: "Скасувати",
  deleteRoom: "Видалити кімнату",
  deletingRoom: "Видаляємо...",
  deleteConfirm: "Видалити кімнату? Учасники отримають сповіщення.",
  ownerOnly: "Лише власник може редагувати або видаляти кімнату.",
  renameError: "Не вдалося змінити назву кімнати.",
  deleteError: "Не вдалося видалити кімнату.",
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
        const body = await response.json().catch(() => ({ error: "Не вдалося згенерувати код." }));
        setError(body.error || "Не вдалося згенерувати код.");
        return;
      }

      const data = (await response.json()) as JoinCodeState;
      setJoinCodes((prev) => ({ ...prev, [householdId]: data }));
    } catch {
      setError("Не вдалося згенерувати код.");
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
        const body = await response.json().catch(() => ({ error: "Не вдалося скасувати код." }));
        setError(body.error || "Не вдалося скасувати код.");
        return;
      }

      setJoinCodes((prev) => ({ ...prev, [householdId]: null }));
    } catch {
      setError("Не вдалося скасувати код.");
    } finally {
      setBusyHouseholdId(null);
    }
  };

  const handleJoinByCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setJoinError("");
    setJoinSuccess("");

    if (!/^\d{6}$/.test(joinCodeInput.trim())) {
      setJoinError("Код має містити 6 цифр.");
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
        <p className="section-label">{TXT.notifications}</p>
        {notifications.length === 0 ? (
          <p className="empty-line">{TXT.noNotifications}</p>
        ) : (
          <>
            <div className="invite-actions">
              <p className="summary-pill">Непрочитані: <strong>{unreadCount}</strong></p>
              <button className="button button-secondary" type="button" onClick={markAllNotificationsRead}>
                {TXT.markAllRead}
              </button>
            </div>
            <div className="household-members">
              {notifications.map((item) => (
                <div className="household-member-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                  <span>{formatStamp(item.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
        <div className="household-list">
          {households.map((household) => {
            const members = membersByHousehold[household.id] ?? [];
            const canManageCodes = household.role === "OWNER" || household.role === "ADMIN";
            const isOwner = household.role === "OWNER";
            const codeInfo = joinCodes[household.id] ?? null;
            const isBusy = busyHouseholdId === household.id;
            const isDeleting = deletingHouseholdId === household.id;
            const isEditing = editingHouseholdId === household.id;

            return (
              <section key={household.id} className="household-card">
                <div className="household-head">
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
                  ) : (
                    <>
                      <strong>{household.name}</strong>
                      <span>{TXT.myRole}: {roleLabel(household.role)}</span>
                    </>
                  )}
                </div>

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

                {members.length === 0 ? (
                  <p className="empty-line">{TXT.emptyMembers}</p>
                ) : (
                  <div className="household-members">
                    {members.map((member) => (
                      <div className="household-member-row" key={member.id}>
                        <div>
                          <strong>{member.name?.trim() || member.email}</strong>
                          <p>{member.email}</p>
                        </div>
                        <span>{roleLabel(member.role)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
