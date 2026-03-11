"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const T = {
  title: "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f",
  name: "\u0406\u043c'\u044f",
  household: "\u041d\u0430\u0437\u0432\u0430 \u0441\u0456\u043c\u0435\u0439\u043d\u043e\u0433\u043e \u0431\u044e\u0434\u0436\u0435\u0442\u0443",
  householdPlaceholder: "\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434, \u0411\u044e\u0434\u0436\u0435\u0442 \u0440\u043e\u0434\u0438\u043d\u0438",
  password: "\u041f\u0430\u0440\u043e\u043b\u044c (\u043c\u0456\u043d\u0456\u043c\u0443\u043c 6 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432)",
  creating: "\u0421\u0442\u0432\u043e\u0440\u044e\u0454\u043c\u043e...",
  submit: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u0430\u043a\u0430\u0443\u043d\u0442",
  already: "\u0412\u0436\u0435 \u0454 \u0430\u043a\u0430\u0443\u043d\u0442?",
  signIn: "\u0423\u0432\u0456\u0439\u0442\u0438",
  autoSignInFailed: "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f \u0443\u0441\u043f\u0456\u0448\u043d\u0430, \u0430\u043b\u0435 \u043d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0443\u0432\u0456\u0439\u0442\u0438 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e.",
};

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
      setError(T.autoSignInFailed);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{T.title}</h1>

        <label>
          {T.name}
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          {T.household}
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder={T.householdPlaceholder}
          />
        </label>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          {T.password}
          <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? T.creating : T.submit}
        </button>

        <p>
          {T.already} <a href="/sign-in">{T.signIn}</a>
        </p>
      </form>
    </main>
  );
}
