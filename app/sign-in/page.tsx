"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const T = {
  title: "\u0412\u0445\u0456\u0434",
  password: "\u041f\u0430\u0440\u043e\u043b\u044c",
  invalid: "\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 email \u0430\u0431\u043e \u043f\u0430\u0440\u043e\u043b\u044c.",
  loading: "\u0412\u0445\u043e\u0434\u0438\u043c\u043e...",
  submit: "\u0423\u0432\u0456\u0439\u0442\u0438",
  noAccount: "\u041d\u0435\u043c\u0430\u0454 \u0430\u043a\u0430\u0443\u043d\u0442\u0430?",
  signUp: "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f",
};

export default function SignInPage() {
  const router = useRouter();
  const callbackUrl = "/";

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
      setError(T.invalid);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{T.title}</h1>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          {T.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? T.loading : T.submit}
        </button>

        <p>
          {T.noAccount} <a href="/sign-up">{T.signUp}</a>
        </p>
      </form>
    </main>
  );
}
