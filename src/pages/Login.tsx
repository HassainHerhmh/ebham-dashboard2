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

      if (!res.data.success) {
        setError(res.data.message);
        return;
      }

      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/");
    } catch {
      setError("فشل الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-xl shadow-lg p-8"
      >
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          تسجيل الدخول
        </h1>

        <div className="mb-5">
          <label className="block text-right mb-2 text-gray-700 font-medium">
            البريد الإلكتروني أو رقم الجوال
          </label>
          <input
            className="w-full border rounded-lg px-4 py-3 text-right focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="05XXXXXXXX أو example@mail.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-right mb-2 text-gray-700 font-medium">
            كلمة المرور
          </label>
          <input
            type="password"
            className="w-full border rounded-lg px-4 py-3 text-right focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="أدخل كلمة المرور"
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg transition disabled:opacity-60"
        >
          {loading ? "جاري..." : "تسجيل الدخول"}
        </button>

        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 جميع الحقوق محفوظة
        </p>
      </form>
    </div>
  );
};

export default Login;
