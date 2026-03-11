"use client";

import { useEffect, useState } from "react";

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
  section: "Учасники кімнати",
  loading: "Завантаження...",
  emptyHouseholds: "Поки що немає кімнат.",
  emptyMembers: "У цій кімнаті поки немає учасників.",
  role_OWNER: "Власник",
  role_ADMIN: "Адміністратор",
  role_MEMBER: "Учасник",
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

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const householdsResponse = await fetch("/api/households", { cache: "no-store" });
        if (!householdsResponse.ok) throw new Error("Failed to load households");

        const householdsData = (await householdsResponse.json()) as { households: Household[] };
        const list = Array.isArray(householdsData.households) ? householdsData.households : [];

        if (!active) return;
        setHouseholds(list);

        const entries = await Promise.all(
          list.map(async (household) => {
            const response = await fetch(`/api/households/${household.id}/members`, { cache: "no-store" });
            if (!response.ok) return [household.id, [] as Member[]] as const;

            const data = (await response.json()) as { members: Member[] };
            return [household.id, Array.isArray(data.members) ? data.members : []] as const;
          }),
        );

        if (!active) return;
        setMembersByHousehold(Object.fromEntries(entries));
      } catch {
        if (!active) return;
        setHouseholds([]);
        setMembersByHousehold({});
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <article className="card">
      <p className="section-label">{TXT.section}</p>

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
                  <span>Моя роль: {roleLabel(household.role)}</span>
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
