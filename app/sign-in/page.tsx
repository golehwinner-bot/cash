"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("������� email ��� ������.");
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>����</h1>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          ������
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? "�������..." : "�����"}
        </button>

        <p>
          ���� �������? <a href="/sign-up">���������</a>
        </p>
      </form>
    </main>
  );
}
