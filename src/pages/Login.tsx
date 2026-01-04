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
      const res = await api.post("/login", {
        identifier,
        password,
      });

      const data = res.data;

      if (!data.success) {
        setError(data.message || "بيانات الدخول غير صحيحة");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch {
      setError("فشل الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100" dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8"
      >
        {/* العنوان */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          تسجيل الدخول
        </h1>

        {/* البريد / الجوال */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            البريد الإلكتروني أو رقم الجوال
          </label>
          <input
            type="text"
            placeholder="05XXXXXXXX أو example@mail.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* كلمة المرور */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            كلمة المرور
          </label>
          <input
            type="password"
            placeholder="أدخل كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* رسالة خطأ */}
        {error && (
          <p className="mb-4 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        {/* زر الدخول */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white
                     font-semibold py-3 rounded-lg transition disabled:opacity-60"
        >
          {loading ? "جاري الدخول..." : "تسجيل الدخول"}
        </button>

        {/* الفوتر */}
        <p className="mt-6 text-center text-sm text-gray-500">
          © 2026 جميع الحقوق محفوظة
        </p>
      </form>
    </div>
  );
};

export default Login;
