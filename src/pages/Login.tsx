import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  extractAuthResult,
  getGoogleLoginUrl,
  getPostLoginPath,
  saveAuthSession,
} from "../utils/auth";

const INVALID_LOGIN_MESSAGE = "بيانات الدخول غير صحيحة";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (website.trim()) {
      setPassword("");
      setError(INVALID_LOGIN_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        identifier,
        password,
      });

      if (!res.data?.success) {
        setError(INVALID_LOGIN_MESSAGE);
        return;
      }

      const result = extractAuthResult(res.data);

      if (!result.user) {
        setError(INVALID_LOGIN_MESSAGE);
        return;
      }

      saveAuthSession(result);
      navigate(getPostLoginPath(result), { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.status === 500
          ? "تعذر الاتصال بالسيرفر"
          : INVALID_LOGIN_MESSAGE
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError("");
    setGoogleLoading(true);
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">
            لوحة تحكم شركة <span className="text-blue-600">إبهام</span>
          </h1>
          <p className="mt-2 text-gray-500">نظام إدارة الطلبات والتوصيل</p>
        </div>

        <form onSubmit={handleSubmit} className="relative rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-700 dark:text-white">
            تسجيل الدخول
          </h2>

          <div
            aria-hidden="true"
            className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-right text-sm text-gray-600 dark:text-slate-300">
              البريد الإلكتروني أو رقم الجوال
            </label>
            <input
              className="w-full rounded-lg border px-4 py-3 text-right outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              placeholder="admin@ebham.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-right text-sm text-gray-600 dark:text-slate-300">
              كلمة المرور
            </label>
            <input
              type="password"
              className="w-full rounded-lg border px-4 py-3 text-right outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="mb-4 text-center text-red-600 dark:text-red-400">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
            <span className="text-sm text-gray-400">أو</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full rounded-lg border border-gray-300 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {googleLoading ? "جاري التحويل إلى جوجل..." : "الدخول عبر Google"}
          </button>

          <p className="mt-6 text-center text-sm text-gray-400 dark:text-slate-500">
            © 2026 شركة إبهام
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
