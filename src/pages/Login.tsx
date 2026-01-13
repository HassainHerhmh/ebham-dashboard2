import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        identifier,
        password,
      });

      if (!res.data?.success) {
        setError(res.data?.message || "فشل تسجيل الدخول");
        return;
      }

      const user = res.data.user;

      // حفظ المستخدم + التوكن بالشكل الصحيح
      localStorage.setItem("user", JSON.stringify(user));
      if (user?.token) {
        localStorage.setItem("token", user.token);
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800">
            لوحة تحكم شركة <span className="text-blue-600">إبهام</span>
          </h1>
          <p className="text-gray-500 mt-2">
            نظام إدارة الطلبات والتوصيل
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-700">
            تسجيل الدخول
          </h2>

          <div className="mb-4">
            <label className="block text-right text-sm mb-2 text-gray-600">
              البريد الإلكتروني أو رقم الجوال
            </label>
            <input
              className="w-full border rounded-lg px-4 py-3 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="admin@ebham.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-right text-sm mb-2 text-gray-600">
              كلمة المرور
            </label>
            <input
              type="password"
              className="w-full border rounded-lg px-4 py-3 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-center mb-4">{error}</p>
          )}

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-semibold transition disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>

          <p className="text-center text-gray-400 text-sm mt-6">
            © 2026 شركة إبهام
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
