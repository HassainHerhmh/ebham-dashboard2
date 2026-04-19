import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  completeProfile,
  extractAuthResult,
  saveAuthSession,
} from "../utils/auth";

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      };

      const res = await completeProfile(payload);
      const result = extractAuthResult(res);

      if (!result.success || !result.user) {
        throw new Error(result.message || "تعذر حفظ بياناتك.");
      }

      saveAuthSession(result);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "تعذر حفظ بياناتك.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            إكمال البيانات
          </h1>
          <p className="text-center text-gray-500 mb-6">
            أكمل بياناتك مرة واحدة فقط ثم سندخلك إلى النظام.
          </p>

          <div className="mb-4">
            <label className="block text-right text-sm mb-2 text-gray-600">
              الاسم
            </label>
            <input
              className="w-full border rounded-lg px-4 py-3 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-right text-sm mb-2 text-gray-600">
              رقم الجوال
            </label>
            <input
              className="w-full border rounded-lg px-4 py-3 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-right text-sm mb-2 text-gray-600">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              className="w-full border rounded-lg px-4 py-3 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-center mb-4">{error}</p>}

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-semibold transition disabled:opacity-60"
          >
            {loading ? "جاري الحفظ..." : "حفظ ومتابعة"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
