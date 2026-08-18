import api from "../services/api";

export async function translateArabicToEnglish(text: string): Promise<string> {
  const source = String(text || "").trim();
  if (!source) {
    throw new Error("empty");
  }

  try {
    const res = await api.post("/translate", { text: source });
    const translated = String(res.data?.text || "").trim();
    if (res.data?.success && translated) {
      return translated;
    }
  } catch {
    // fallback below
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(source)}&langpair=ar|en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("translate-failed");
  }

  const data = await response.json();
  const translated = String(data?.responseData?.translatedText || "").trim();
  if (!translated) {
    throw new Error("translate-empty");
  }

  return translated;
}
