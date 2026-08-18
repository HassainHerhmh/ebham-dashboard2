import { useState } from "react";
import { Languages } from "lucide-react";
import { translateArabicToEnglish } from "../utils/translate";

type EnglishFieldWithTranslateProps = {
  arabicText: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
};

export default function EnglishFieldWithTranslate({
  arabicText,
  value,
  onChange,
  placeholder = "English",
  multiline = false,
  rows = 3,
  className = "",
  inputClassName = "w-full border p-2",
}: EnglishFieldWithTranslateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    const source = String(arabicText || "").trim();
    if (!source) {
      setError("أدخل النص العربي أولاً");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const translated = await translateArabicToEnglish(source);
      onChange(translated);
    } catch {
      setError("فشلت الترجمة، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${inputClassName} flex-1`}
            rows={rows}
            dir="ltr"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${inputClassName} flex-1`}
            dir="ltr"
          />
        )}

        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading}
          title="ترجم من العربي إلى الإنجليزي"
          className="flex shrink-0 items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Languages size={16} />
          {loading ? "..." : "ترجم"}
        </button>
      </div>

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
