"use client";

import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

function getFriendlyErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string" && error.message.trim()) {
      if (error.message.toLowerCase().includes("unauthorized")) {
        return "Invalid credentials";
      }

      return error.message;
    }
  }

  return "Unable to sign in";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => getSafeRedirectPath(searchParams.get("next")), [searchParams]);
  const reason = searchParams.get("reason");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    reason === "session-expired" ? "Your session expired. Sign in again." : null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setErrorMessage("Enter your email or username and password");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (normalizedIdentifier.includes("@")) {
        await authClient.signIn.email(
          {
            email: normalizedIdentifier,
            password,
            rememberMe: true,
          },
          {
            throw: true,
          }
        );
      } else {
        await authClient.signIn.username(
          {
            username: normalizedIdentifier,
            password,
            rememberMe: true,
          },
          {
            throw: true,
          }
        );
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "#1a1d23" }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #C28437 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-4 w-full max-w-[420px]">
        <div
          className="rounded-2xl border border-white/[0.08] p-8 md:p-10"
          style={{ background: "rgba(30, 33, 39, 0.95)", backdropFilter: "blur(20px)" }}
        >
          <div className="mb-8 flex flex-col items-center">
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <span className="text-2xl font-semibold text-white/90">BU</span>
            </div>
            <h1 className="text-2xl font-bold tracking-wide text-white">BU Bus Editor</h1>
            <p className="mt-1 text-sm text-white/40">Sign in with email or username</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium tracking-wide text-white/50">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="name@example.com or admin"
                  className="w-full rounded-xl border border-white/[0.08] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:ring-2 focus:ring-[#C28437]/50"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium tracking-wide text-white/50">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/[0.08] py-3 pl-11 pr-11 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:ring-2 focus:ring-[#C28437]/50"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #C28437 0%, #8a7344 50%, #C28437 100%)",
                boxShadow: "0 4px 20px rgba(194, 132, 55, 0.3)",
              }}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
