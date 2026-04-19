import http from "http";
import { URL } from "url";

const SUPPORTED_LANGUAGES = ["ar", "en"];

const translations = {
  ar: {
    language: {
      select: "اختر اللغة",
      ar: "العربية",
      en: "الإنجليزية",
    },
    common: {
      save: "حفظ",
      cancel: "إلغاء",
      close: "إغلاق",
      confirm: "تأكيد",
      logout: "تسجيل خروج",
      notifications: "الإشعارات",
    },
    header: {
      language: "اللغة",
      arabic: "العربية",
      english: "English",
      lightMode: "الوضع المضيء",
      darkMode: "الوضع الليلي",
      chats: "المحادثات",
      notifications: "الإشعارات",
    },
    orders: {
      title: "الطلبات",
      pending: "قيد الانتظار",
      confirmed: "قيد المعالجة",
      processing: "قيد التحضير",
      ready: "جاهز",
      delivering: "قيد التوصيل",
      completed: "مكتمل",
      cancelled: "ملغي",
      cancelOrder: "إلغاء الطلب",
      cancelReason: "سبب الإلغاء",
      cancelReasonPlaceholder: "اكتب سبب الإلغاء...",
      confirmCancel: "تأكيد الإلغاء",
      cancelReasonRequired: "اكتب سبب الإلغاء",
    },
    permissions: {
      title: "صلاحيات المستخدمين",
      add: "إضافة صلاحية",
      edit: "تعديل",
      remove: "حذف",
    },
  },
  en: {
    language: {
      select: "Select language",
      ar: "Arabic",
      en: "English",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      confirm: "Confirm",
      logout: "Log out",
      notifications: "Notifications",
    },
    header: {
      language: "Language",
      arabic: "Arabic",
      english: "English",
      lightMode: "Light mode",
      darkMode: "Dark mode",
      chats: "Chats",
      notifications: "Notifications",
    },
    orders: {
      title: "Orders",
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      ready: "Ready",
      delivering: "Delivering",
      completed: "Completed",
      cancelled: "Cancelled",
      cancelOrder: "Cancel order",
      cancelReason: "Cancellation reason",
      cancelReasonPlaceholder: "Write the cancellation reason...",
      confirmCancel: "Confirm cancellation",
      cancelReasonRequired: "Write the cancellation reason",
    },
    permissions: {
      title: "User Permissions",
      add: "Add Permission",
      edit: "Edit",
      remove: "Delete",
    },
  },
};

function resolveLanguage(input) {
  const value = String(input || "").trim().toLowerCase();
  const lang = value.startsWith("en") ? "en" : "ar";
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : "ar";
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept-Language",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendJson(res, 400, { success: false, message: "Bad request" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept-Language",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { success: true, service: "i18n-server" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/languages") {
    sendJson(res, 200, {
      success: true,
      languages: [
        { code: "ar", name: "العربية", direction: "rtl" },
        { code: "en", name: "English", direction: "ltr" },
      ],
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/i18n") {
    const lang = resolveLanguage(
      url.searchParams.get("lang") || req.headers["accept-language"]
    );

    sendJson(res, 200, {
      success: true,
      lang,
      direction: lang === "ar" ? "rtl" : "ltr",
      translation: translations[lang],
    });
    return;
  }

  const match = url.pathname.match(/^\/api\/i18n\/(ar|en)$/i);
  if (req.method === "GET" && match) {
    const lang = resolveLanguage(match[1]);

    sendJson(res, 200, {
      success: true,
      lang,
      direction: lang === "ar" ? "rtl" : "ltr",
      translation: translations[lang],
    });
    return;
  }

  sendJson(res, 404, {
    success: false,
    message: "Not found",
    endpoints: [
      "GET /health",
      "GET /api/languages",
      "GET /api/i18n?lang=ar|en",
      "GET /api/i18n/ar",
      "GET /api/i18n/en",
    ],
  });
});

const PORT = Number(process.env.PORT) || 4000;

server.listen(PORT, () => {
  console.log(`i18n server running on http://localhost:${PORT}`);
});
