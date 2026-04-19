import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  exchangeGoogleCallback,
  extractAuthResult,
  getPostLoginPath,
  saveAuthSession,
} from "../utils/auth";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const merged: Record<string, string> = {};

        searchParams.forEach((value, key) => {
          merged[key] = value;
        });

        hashParams.forEach((value, key) => {
          merged[key] = value;
        });

        if (merged.error) {
          throw new Error(merged.error_description || merged.error);
        }

        let rawPayload: unknown = merged;

        if (!merged.token && !merged.access_token && !merged.user) {
          rawPayload = await exchangeGoogleCallback(window.location.search);
        }

        const result = extractAuthResult(rawPayload);

        if (!result.success || !result.user) {
          throw new Error(result.message);
        }

        saveAuthSession(result);
        navigate(getPostLoginPath(result), { replace: true });
      } catch (err: any) {
        setError(err?.message || "فشل تسجيل الدخول عبر جوجل.");
      }
    };

    void run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          جاري إكمال تسجيل الدخول
        </h1>
        <p className="text-gray-500 mb-4">
          نتحقق الآن من بيانات حساب جوجل الخاص بك.
        </p>

        {error ? (
          <>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
            >
              العودة إلى تسجيل الدخول
            </button>
          </>
        ) : (
          <div className="w-10 h-10 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
