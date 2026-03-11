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
};

const roleLabel = (role: Member["role"] | Household["role"]) => {
  if (role === "OWNER") return TXT.role_OWNER;
  if (role === "ADMIN") return TXT.role_ADMIN;
  return TXT.role_MEMBER;
};

export function HouseholdMembersPanel() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [membersByHousehold, setMembersByHousehold] = useState<Record<string, Member[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const householdsResponse = await fetch("/api/households", { cache: "no-store" });
    if (!householdsResponse.ok) throw new Error("Failed to load households");

    const householdsData = (await householdsResponse.json()) as { households: Household[] };
    const list = Array.isArray(householdsData.households) ? householdsData.households : [];
    setHouseholds(list);

    const entries = await Promise.all(
      list.map(async (household) => {
        const response = await fetch(`/api/households/${household.id}/members`, { cache: "no-store" });
        if (!response.ok) return [household.id, [] as Member[]] as const;

        const data = (await response.json()) as { members: Member[] };
        return [household.id, Array.isArray(data.members) ? data.members : []] as const;
      }),
    );

    setMembersByHousehold(Object.fromEntries(entries));
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
        {error ? <p className="auth-error">{error}</p> : null}
      </div>

      {loading ? <p className="empty-line">{TXT.loading}</p> : null}

      {!loading && households.length === 0 ? <p className="empty-line">{TXT.emptyHouseholds}</p> : null}

      {!loading && households.length > 0 ? (
        <div className="household-list">
          {households.map((household) => {
            const members = membersByHousehold[household.id] ?? [];
            return (
              <section key={household.id} className="household-card">
                <div className="household-head">
                  <strong>{household.name}</strong>
                  <span>{TXT.myRole}: {roleLabel(household.role)}</span>
                </div>

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
