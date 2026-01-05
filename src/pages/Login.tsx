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

      if (!res.data?.success || !res.data?.user) {
        setError(res.data?.message || "فشل تسجيل الدخول");
        return;
      }

      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "فشل الاتصال بالسيرفر"
      );
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
        <h1 className="text-3xl font-bold text-center mb-6">
          تسجيل الدخول
        </h1>

        <input
          className="w-full border rounded-lg px-4 py-3 mb-4 text-right"
          placeholder="admin@ebham.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <input
          type="password"
          className="w-full border rounded-lg px-4 py-3 mb-4 text-right"
          placeholder="123456"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          {loading ? "جاري..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
};

export default Login;
