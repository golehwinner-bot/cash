"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, householdName, email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Registration failed." }));
      setError(body.error || "Registration failed.");
      setLoading(false);
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);

    if (login?.error) {
      setError("��������� ������, ��� �� ������� ����� �����������.");
      return;
    }

    router.push("/");
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>���������</h1>

        <label>
          ��'�
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          ����� �������� �������
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="���������, ������ ������"
          />
        </label>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          ������ (����� 6 �������)
          <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? "���������..." : "�������� ������"}
        </button>

        <p>
          ��� � ������? <a href="/sign-in">�����</a>
        </p>
      </form>
    </main>
  );
}
