"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = { mode: "login" | "register" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const result = isRegister
        ? await authClient.signUp.email({
            name: String(form.get("name") ?? "").trim(),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(
          result.error.message ||
            "We could not complete that request. Please try again.",
        );
        return;
      }

      router.replace(isRegister ? "/entities" : "/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the service. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <div className="auth-aside-top">
          <Link className="brand" href="/">
            <span className="brand-mark">CI</span>
            <span>Civic India</span>
          </Link>
          <Link className="button button-quiet" href="/institutions">
            Institutions
          </Link>
        </div>
        <div className="auth-aside-copy">
          <p className="eyebrow">A MORE USEFUL PUBLIC RECORD</p>
          <h1>Follow what matters. Go straight to the source.</h1>
          <p>
            Build a personal view of official updates from the institutions you
            care about.
          </p>
        </div>
        <p className="auth-aside-foot">Civic India · v0.1 prototype</p>
      </aside>

      <main className="auth-main">
        <div className="auth-box">
          <div className="auth-mobile-nav">
            <Link className="brand auth-mobile-brand" href="/">
              <span className="brand-mark">CI</span>
              <span>Civic India</span>
            </Link>
            <Link className="button button-quiet" href="/institutions">
              Institutions
            </Link>
          </div>
          <p className="eyebrow">
            {isRegister ? "GET STARTED" : "WELCOME BACK"}
          </p>
          <h2>
            {isRegister ? "Create your account" : "Log in to Civic India"}
          </h2>
          <p className="auth-subtitle">
            {isRegister
              ? "A personal feed of updates from the public institutions you follow."
              : "Pick up where you left off and see what changed."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={
                  isRegister ? "At least 8 characters" : "Your password"
                }
                required
                minLength={isRegister ? 8 : 1}
              />
            </div>
            {error && (
              <p className="form-message" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-dark auth-submit"
              type="submit"
              disabled={pending}
            >
              {pending
                ? "Please wait…"
                : isRegister
                  ? "Create account"
                  : "Log in"}
              {!pending && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account? " : "New to Civic India? "}
            <Link
              className="inline-link"
              href={isRegister ? "/login" : "/register"}
            >
              {isRegister ? "Log in" : "Create an account"}
            </Link>
          </p>
          <p className="auth-terms">
            Your account is used to save the institutions you follow and deliver
            in-app updates.
          </p>
        </div>
      </main>
    </div>
  );
}
