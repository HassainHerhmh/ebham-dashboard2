import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  User,
  LogOut,
  Sun,
  Moon,
  MessageSquare,
  Send,
  X,
  Check,
  CheckCheck,
  Languages,
  ChevronDown,
  Clock3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api, { API_ORIGIN } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { getRoleLabel } from "../config/permissions";
import { normalizeRole } from "../utils/permissions";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim();
const chatSocket = SOCKET_URL
  ? io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
    })
  : null;

const UI_TEXT = {
  ar: {
    language: "اللغة",
    arabic: "العربية",
    english: "English",
    lightMode: "الوضع المضيء",
    darkMode: "الوضع الليلي",
    chats: "المحادثات",
    notifications: "الإشعارات",
    notificationsLog: "سجل إشعارات الطلبات والدردشة",
    markAllRead: "تعليم الكل كمقروء",
    noNotifications: "لا توجد إشعارات حتى الآن",
    newMessages: "رسائل جديدة",
    closed: "مغلقة",
    open: "مفتوحة",
    noMessageYet: "لا توجد رسالة بعد",
    newMessagesCount: "الرسائل الجديدة",
    loadingChats: "جاري تحميل المحادثات...",
    noChats: "لا توجد محادثات حاليًا",
    selectChat: "اختر محادثة لعرض التفاصيل",
    noChatMessages: "لا توجد رسائل في هذه المحادثة",
    replyPlaceholder: "اكتب ردًا على العميل...",
    userFallback: "مستخدم",
    customerFallback: "عميل",
    lastHandler: "آخر متابع",
    checkOut: "انصرف",
    attendanceStartedAt: "وقت الدخول",
    attendanceNotStarted: "لم يبدأ الدوام",
    autoLogoutMessage: "تم تسجيل الخروج تلقائيًا بسبب الخمول",
    accountDisabledMessage: "تم تعطيل حسابك",
  },
  en: {
    language: "Language",
    arabic: "Arabic",
    english: "English",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    chats: "Chats",
    notifications: "Notifications",
    notificationsLog: "Orders and chat notifications",
    markAllRead: "Mark all as read",
    noNotifications: "No notifications yet",
    newMessages: "New messages",
    closed: "Closed",
    open: "Open",
    noMessageYet: "No messages yet",
    newMessagesCount: "New messages",
    loadingChats: "Loading chats...",
    noChats: "No active chats",
    selectChat: "Select a chat to view details",
    noChatMessages: "No messages in this chat",
    replyPlaceholder: "Type your reply to customer...",
    userFallback: "User",
    customerFallback: "Customer",
    lastHandler: "Last handled by",
    checkOut: "Check out",
    attendanceStartedAt: "Started at",
    attendanceNotStarted: "No active session",
    autoLogoutMessage: "You were logged out due to inactivity",
    accountDisabledMessage: "Your account has been disabled",
  },
} as const;

interface HeaderProps {
}

interface Branch {
  id: number;
  name: string;
}

interface ChatMessage {
  id: number;
  sender_type: "customer" | "admin";
  message: string;
  created_at: string;
  status?: "sent" | "delivered" | "read";
  is_read?: boolean | number;
}

interface ChatConversation {
  id: number;
  customer_name: string;
  customer_phone: string;
  status: "pending" | "open" | "closed";
  pending_count?: number;
  unread_count?: number;
  last_message?: string;
  updated_at?: string;
  handled_by_name?: string;
  messages?: ChatMessage[];
}

interface OpenSupportChatDetail {
  chatId?: number;
  customerName?: string;
  customerPhone?: string;
}

interface AttendanceSession {
  id: number;
  login_time: string;
  logout_time?: string | null;
}

const Header: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      return localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")!)
        : null;
    } catch {
      return null;
    }
  });
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"ar" | "en">(
    localStorage.getItem("app_lang") === "en" ? "en" : "ar"
  );
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(
    null
  );
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const logoutInProgressRef = useRef(false);

  // --- ظ…ظ†ط·ظ‚ ط§ظ„ظˆط¶ط¹ ط§ظ„ظ„ظٹظ„ظٹ ---
  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem("theme") === "dark"
  );
  const t = UI_TEXT[currentLanguage];

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);
  // -----------------------

  useEffect(() => {
    const syncUserSession = () => {
      try {
        setCurrentUser(
          localStorage.getItem("user")
            ? JSON.parse(localStorage.getItem("user")!)
            : null
        );
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener("storage", syncUserSession);
    window.addEventListener("user-session-updated", syncUserSession as EventListener);

    return () => {
      window.removeEventListener("storage", syncUserSession);
      window.removeEventListener("user-session-updated", syncUserSession as EventListener);
    };
  }, []);

  const user = currentUser;

  const isAdminGeneral = Boolean(user?.is_admin_branch);
  const roleLabel = isAdminGeneral
    ? "مدير النظام"
    : getRoleLabel(normalizeRole(user?.role));

  const userImageUrl = user?.image_url
    ? /^https?:\/\//i.test(user.image_url)
      ? user.image_url
      : `${API_ORIGIN}${String(user.image_url).startsWith("/") ? user.image_url : `/${user.image_url}`}`
    : "";

  const formatAttendanceTime = (dateString?: string | null) => {
    if (!dateString) return "--:--";

    return new Date(dateString).toLocaleTimeString(
      currentLanguage === "ar" ? "ar-SA" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const getChatHandlers = () => {
    try {
      return JSON.parse(localStorage.getItem("support_chat_handlers") || "{}");
    } catch {
      return {};
    }
  };

  const saveChatHandler = (chatId: number, handlerName?: string) => {
    if (!handlerName) return;

    const handlers = getChatHandlers();
    handlers[String(chatId)] = handlerName;
    localStorage.setItem("support_chat_handlers", JSON.stringify(handlers));
  };

  const attachHandlerName = (chat: ChatConversation) => {
    const handlers = getChatHandlers();
    return {
      ...chat,
      handled_by_name:
        chat.handled_by_name || handlers[String(chat.id)] || undefined,
    };
  };

  const clearLocalSessionAndRedirect = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("token");
    sessionStorage.removeItem("wassel_form_draft");
    window.dispatchEvent(new Event("storage"));
    navigate("/login", { replace: true });
  };

  const forceDisabledLogout = (message?: string) => {
    actions.addNotification(message || t.accountDisabledMessage, "error");
    window.setTimeout(() => {
      clearLocalSessionAndRedirect();
    }, 900);
  };

  const handleLogout = async (options?: { reason?: "manual" | "idle" }) => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;

    if (selectedChatId) {
      await releaseChat(selectedChatId);
    }

    try {
      await api.post("/user-attendance/check-out");
    } catch (error) {
      console.error("User attendance check-out on logout error:", error);
    }

    if (options?.reason === "idle") {
      try {
        window.alert(t.autoLogoutMessage);
      } catch {
        // ignore alert failures
      }
    }

    clearLocalSessionAndRedirect();
  };

  const loadAttendanceStatus = async () => {
    try {
      const res = await api.get("/user-attendance/status");
      setAttendanceSession(res.data?.session || null);

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.current_session_start = res.data?.session?.login_time || null;
        localStorage.setItem("user", JSON.stringify(parsedUser));
      }
    } catch (error) {
      console.error("Load attendance status error:", error);
      const status = (error as any)?.response?.status;
      const message = String((error as any)?.response?.data?.message || "");
      if (status === 403 && message.includes("معطل")) {
        forceDisabledLogout(t.accountDisabledMessage);
        return;
      }
      setAttendanceSession(null);
    }
  };

  const handleAttendanceAction = async () => {
    try {
      setAttendanceLoading(true);
      await handleLogout({ reason: "manual" });
    } catch (error) {
      console.error("Attendance action error:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const applyLanguage = async (lang: "ar" | "en") => {
    setCurrentLanguage(lang);
    localStorage.setItem("app_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    window.dispatchEvent(new Event("app-language-change"));
    try {
      await api.put("/language/my-language", { language: lang });
    } catch (err) {
      console.error("Failed to persist user language:", err);
    }
    setLanguageMenuOpen(false);
  };

  useEffect(() => {
    const syncLanguageFromServer = async () => {
      try {
        const res = await api.get("/language/my-language");
        const serverLang = res?.data?.language === "en" ? "en" : "ar";
        setCurrentLanguage(serverLang);
        localStorage.setItem("app_lang", serverLang);
        document.documentElement.lang = serverLang;
        document.documentElement.dir = serverLang === "ar" ? "rtl" : "ltr";
        window.dispatchEvent(new Event("app-language-change"));
      } catch {
        const localLang = localStorage.getItem("app_lang") === "en" ? "en" : "ar";
        setCurrentLanguage(localLang);
      }
    };

    void syncLanguageFromServer();
  }, []);

  const fetchBranches = async () => {
    try {
      if (!isAdminGeneral) {
        if (user?.branch_id) {
          setCurrentBranch(user.branch_id);
          localStorage.setItem("branch_id", String(user.branch_id));
        }
        setBranches([]);
        return;
      }

      const res = await api.get("/branches");
      const list = Array.isArray(res.data?.branches) ? res.data.branches : [];
      setBranches(list);

      const saved = localStorage.getItem("branch_id");
      if (saved) {
        setCurrentBranch(Number(saved));
      } else if (user?.branch_id) {
        setCurrentBranch(user.branch_id);
        localStorage.setItem("branch_id", String(user.branch_id));
      }
    } catch (err) {
      console.error("ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ظپط±ظˆط¹:", err);
      setBranches([]);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    void loadAttendanceStatus();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const timer = window.setInterval(() => {
      void loadAttendanceStatus();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [user?.id]);

  useEffect(() => {
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = window.setTimeout(() => {
        void handleLogout({ reason: "idle" });
      }, INACTIVITY_LIMIT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });

      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [selectedChatId, t.autoLogoutMessage]);

  const handleChangeBranch = (id: number) => {
    setCurrentBranch(id);
    localStorage.setItem("branch_id", String(id));
    window.location.reload();
  };

  const fetchChats = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setChatLoading(true);
      }
      const res = await api.get("/support/chats");
      const list = Array.isArray(res.data?.chats)
        ? res.data.chats.map(attachHandlerName)
        : [];
      setChats((prev) =>
        list.map((chat) => {
          const existing = prev.find((item) => item.id === chat.id);
          if (!existing) return chat;

          return {
            ...existing,
            ...chat,
            messages:
              Array.isArray(chat.messages) && chat.messages.length > 0
                ? chat.messages
                : existing.messages,
          };
        })
      );

      if (selectedChatId && !list.some((chat) => chat.id === selectedChatId)) {
        setSelectedChatId(null);
        setSelectedChat(null);
      }

      return list;
    } catch (err) {
      console.error("ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ:", err);
      if (!options?.silent) {
        setChats([]);
      }
      return [];
    } finally {
      if (!options?.silent) {
        setChatLoading(false);
      }
    }
  };

  const fetchChatDetails = async (chatId: number, _options?: { silent?: boolean }) => {
    try {
      const res = await api.get(`/support/chats/${chatId}`);
      const details = res.data?.chat;
      if (!details) return;

      const normalizedChat = attachHandlerName({
        ...details,
        messages: Array.isArray(details.messages) ? details.messages : [],
      });

      setSelectedChat(normalizedChat);
      setChats((prev) => {
        const exists = prev.some((chat) => chat.id === chatId);
        if (!exists) {
          return [...prev, normalizedChat];
        }

        return prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                ...normalizedChat,
              }
            : chat
        );
      });
    } catch (err) {
      console.error("ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ طھظپط§طµظٹظ„ ط§ظ„ظ…ط­ط§ط¯ط«ط©:", err);
    }
  };

  const releaseChat = async (chatId: number) => {
    try {
      await api.post(`/support/chats/${chatId}/release`);
    } catch (err) {
      console.error("ط®ط·ط£ ظپظٹ طھط­ط±ظٹط± ط§ظ„ظ…ط­ط§ط¯ط«ط©:", err);
    }
  };

  const markChatAsRead = async (chatId: number) => {
    try {
      await api.patch(`/support/chats/${chatId}/read`);
    } catch (err) {
      console.error("Mark chat as read error:", err);
    }
  };

  const markChatAsOpenLocally = (chatId: number) => {
    saveChatHandler(chatId, user?.name);

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              status: "open",
              unread_count: 0,
              pending_count: 0,
              handled_by_name: user?.name || chat.handled_by_name,
            }
          : chat
      )
    );

    setSelectedChat((prev) =>
      prev && prev.id === chatId
        ? {
            ...prev,
            status: "open",
            unread_count: 0,
            pending_count: 0,
            handled_by_name: user?.name || prev.handled_by_name,
          }
        : prev
    );
  };

  const handleOpenChat = async () => {
    setChatOpen(true);
    await fetchChats();
  };

  const handleSelectChat = async (chatId: number) => {
    if (selectedChatId && selectedChatId !== chatId) {
      await releaseChat(selectedChatId);
    }

    setSelectedChatId(chatId);
    markChatAsOpenLocally(chatId);
    await markChatAsRead(chatId);
    await fetchChatDetails(chatId);
  };

  const handleCloseChat = async () => {
    if (selectedChatId) {
      await releaseChat(selectedChatId);
    }

    setChatOpen(false);
    setSelectedChatId(null);
    setSelectedChat(null);
    setMessageText("");
    await fetchChats({ silent: true });
  };

  const findChatByCustomer = (detail?: OpenSupportChatDetail | null) => {
    if (!detail) return null;

    const normalize = (value?: string | number | null) =>
      String(value || "")
        .replace(/\s+/g, "")
        .trim()
        .toLowerCase();

    const targetPhone = normalize(detail.customerPhone);
    const targetName = normalize(detail.customerName);

    return (
      chats.find((chat) => {
        const chatPhone = normalize(chat.customer_phone);
        const chatName = normalize(chat.customer_name);

        return Boolean(
          (targetPhone && chatPhone && (chatPhone.includes(targetPhone) || targetPhone.includes(chatPhone))) ||
            (targetName && chatName === targetName)
        );
      }) || null
    );
  };

  const handleSendMessage = async () => {
    if (!selectedChatId || !messageText.trim()) return;

    try {
      setSendingMessage(true);
      await api.post(`/support/chats/${selectedChatId}/messages`, {
        message: messageText.trim(),
      });
      setMessageText("");
      markChatAsOpenLocally(selectedChatId);
      await fetchChatDetails(selectedChatId, { silent: true });
      await fetchChats({ silent: true });
    } catch (err) {
      console.error("ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط©:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    void fetchChats();
  }, []);

  useEffect(() => {
    if (chatOpen && selectedChatId) {
      void fetchChatDetails(selectedChatId, { silent: true });
    }
  }, [chatOpen, selectedChatId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!languageMenuRef.current) return;

      if (!languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    if (languageMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [languageMenuOpen]);

  useEffect(() => {
    const handleOpenSupportChat = async (event: Event) => {
      const customEvent = event as CustomEvent<OpenSupportChatDetail>;
      const detail = customEvent.detail;

      setChatOpen(true);
      const latestChats = await fetchChats({ silent: true });

      const matchedChat =
        (detail?.chatId
          ? latestChats.find((chat) => chat.id === detail.chatId) || null
          : null) ||
        latestChats.find((chat) => {
          const normalize = (value?: string | number | null) =>
            String(value || "")
              .replace(/\s+/g, "")
              .trim()
              .toLowerCase();

          const targetPhone = normalize(detail?.customerPhone);
          const targetName = normalize(detail?.customerName);
          const chatPhone = normalize(chat.customer_phone);
          const chatName = normalize(chat.customer_name);

          return Boolean(
            (targetPhone &&
              chatPhone &&
              (chatPhone.includes(targetPhone) || targetPhone.includes(chatPhone))) ||
              (targetName && chatName === targetName)
          );
        }) ||
        findChatByCustomer(detail);

      if (matchedChat) {
        await handleSelectChat(matchedChat.id);
      }
    };

    window.addEventListener("open-support-chat", handleOpenSupportChat as EventListener);

    return () => {
      window.removeEventListener("open-support-chat", handleOpenSupportChat as EventListener);
    };
  }, [chats, selectedChatId]);

  useEffect(() => {
    if (!chatSocket) return;

    if (user?.id) {
      chatSocket.emit("join_user", user.id);
    }

    const refreshChatState = async (payload?: any) => {
      const incomingChatId =
        payload?.chat_id ?? payload?.chatId ?? payload?.conversation_id;

      await fetchChats({ silent: true });

      if (
        selectedChatId &&
        (!incomingChatId || Number(incomingChatId) === selectedChatId)
      ) {
        await fetchChatDetails(selectedChatId, { silent: true });
      }
    };

    const handleAdminNotification = async (payload: any) => {
      const type = payload?.type;

      if (type === "support_chat_message" && payload?.sender_type === "customer") {
        const customerName =
          payload?.customer_name ||
          chats.find((chat) => chat.id === Number(payload?.chat_id))?.customer_name ||
          "ط¹ظ…ظٹظ„";
        const notificationText =
          payload?.notification_message ||
          `ط§ظ„ط¹ظ…ظٹظ„ ${customerName} ط£ط±ط³ظ„ ظ„ظƒ ط±ط³ط§ظ„ط© ط¬ط¯ظٹط¯ط©`;
        const body = payload?.message ? `: ${payload.message}` : "";

        actions.addNotification(`${notificationText}${body}`, "info");
      }

      if (type === "support_chat_created" && payload?.sender_type === "customer") {
        const customerName =
          payload?.customer_name ||
          chats.find((chat) => chat.id === Number(payload?.chat_id))?.customer_name ||
          "ط¹ظ…ظٹظ„";
        const notificationText =
          payload?.notification_message ||
          `ط§ظ„ط¹ظ…ظٹظ„ ${customerName} ط¨ط¯ط£ ظ…ط­ط§ط¯ط«ط© ط¬ط¯ظٹط¯ط©`;
        const body = payload?.message ? `: ${payload.message}` : "";

        actions.addNotification(`${notificationText}${body}`, "info");
      }

      if (
        type === "support_chat_created" ||
        type === "support_chat_message" ||
        type === "support_chat_updated" ||
        type === "chat_message" ||
        type === "chat_created"
      ) {
        await refreshChatState(payload);
      }
    };

    const handleDirectChatEvent = async (payload: any) => {
      await refreshChatState(payload);
    };

    const handleUserDisabled = (payload: any) => {
      const targetId = Number(payload?.user_id || 0);
      if (targetId && Number(user?.id) !== targetId) return;
      forceDisabledLogout(payload?.message || t.accountDisabledMessage);
    };

    chatSocket.on("admin_notification", handleAdminNotification);
    chatSocket.on("support_chat_created", handleDirectChatEvent);
    chatSocket.on("support_chat_message", handleDirectChatEvent);
    chatSocket.on("support_chat_updated", handleDirectChatEvent);
    chatSocket.on("chat_message", handleDirectChatEvent);
    chatSocket.on("chat_created", handleDirectChatEvent);
    chatSocket.on("user_disabled", handleUserDisabled);

    return () => {
      chatSocket.off("admin_notification", handleAdminNotification);
      chatSocket.off("support_chat_created", handleDirectChatEvent);
      chatSocket.off("support_chat_message", handleDirectChatEvent);
      chatSocket.off("support_chat_updated", handleDirectChatEvent);
      chatSocket.off("chat_message", handleDirectChatEvent);
      chatSocket.off("chat_created", handleDirectChatEvent);
      chatSocket.off("user_disabled", handleUserDisabled);
    };
  }, [selectedChatId, user?.id, t.accountDisabledMessage]);

  const pendingChatsCount = chats.filter(
    (chat) => (chat.unread_count ?? chat.pending_count ?? 0) > 0
  ).length;
  const unreadNotificationsCount = state.notifications.filter(
    (notification) => !notification.isRead
  ).length;

  useEffect(() => {
    if (!selectedChatId) {
      setSelectedChat(null);
      return;
    }

    const chat = chats.find((item) => item.id === selectedChatId) || null;
    if (!chat) {
      setSelectedChat(null);
      return;
    }

    setSelectedChat((prev) => {
      if (!prev || prev.id !== chat.id) {
        return chat;
      }

      return {
        ...prev,
        ...chat,
        messages:
          Array.isArray(chat.messages) && chat.messages.length > 0
            ? chat.messages
            : prev.messages,
      };
    });
  }, [chats, selectedChatId]);

  const formatMessageTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString(
      currentLanguage === "ar" ? "ar-SA" : "en-US",
      {
      hour: "2-digit",
      minute: "2-digit",
      }
    );

  const formatDateDivider = (dateString: string) =>
    new Date(dateString).toLocaleDateString(
      currentLanguage === "ar" ? "ar-SA" : "en-US",
      {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      }
    );

  const getMessageStatusIcon = (message: ChatMessage) => {
    const isRead = message.status === "read" || Boolean(message.is_read);
    const isDelivered = isRead || message.status === "delivered";

    if (isRead) {
      return <CheckCheck size={14} className="text-sky-400" />;
    }

    if (isDelivered) {
      return <CheckCheck size={14} className="text-white/80" />;
    }

    return <Check size={14} className="text-white/80" />;
  };

  useEffect(() => {
    if (!selectedChat?.messages?.length) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [selectedChat?.id, selectedChat?.messages?.length]);

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-md px-6 py-4 flex items-center justify-between relative transition-colors duration-300">
      <div className="flex items-center gap-3">
        {attendanceSession?.login_time && !attendanceSession?.logout_time && (
          <button
            onClick={() => void handleAttendanceAction()}
            disabled={attendanceLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <LogOut size={16} />
            <span>{attendanceLoading ? "..." : t.checkOut}</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Clock3 size={16} className="text-blue-500" />
          <span className="text-slate-500 dark:text-slate-400">{t.attendanceStartedAt}:</span>
          <span>
            {attendanceSession?.login_time
              ? formatAttendanceTime(attendanceSession.login_time)
              : user?.current_session_start
              ? formatAttendanceTime(user.current_session_start)
              : t.attendanceNotStarted}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={languageMenuRef}>
          <button
            onClick={() => setLanguageMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title={t.language}
          >
            <Languages size={20} className="text-gray-600 dark:text-gray-300" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {currentLanguage === "ar" ? t.arabic : t.english}
            </span>
            <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
          </button>

          {languageMenuOpen && (
            <div className="absolute left-0 mt-2 w-36 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => void applyLanguage("ar")}
                className={`w-full px-3 py-2 text-sm text-right transition-colors ${
                  currentLanguage === "ar"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {t.arabic}
              </button>
              <button
                onClick={() => void applyLanguage("en")}
                className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                  currentLanguage === "en"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {t.english}
              </button>
            </div>
          )}
        </div>

        {/* ط²ط± ط§ظ„طھط¨ط¯ظٹظ„ ط¨ظٹظ† ط§ظ„ظˆط¶ط¹ ط§ظ„ظ„ظٹظ„ظٹ ظˆط§ظ„ظ…ط¶ظٹط، */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title={darkMode ? t.lightMode : t.darkMode}
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>

        {/* ط§ط®طھظٹط§ط± ط§ظ„ظپط±ط¹ ط£ظˆ ط¹ط±ط¶ظ‡ */}
        {isAdminGeneral ? (
          branches.length > 0 && (
            <select
              value={currentBranch ?? ""}
              onChange={(e) => handleChangeBranch(Number(e.target.value))}
              className="border rounded px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )
        ) : (
          user?.branch_name && (
            <div className="px-3 py-1 text-sm border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
              {user.branch_name}
            </div>
          )
        )}

        <button
          onClick={handleOpenChat}
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title={t.chats}
        >
          <MessageSquare
            size={20}
            className="text-gray-600 dark:text-gray-300"
          />
          {pendingChatsCount > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center font-bold">
              {pendingChatsCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationOpen((prev) => !prev)}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title={t.notifications}
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center font-bold">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute left-0 mt-3 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
                <div className="text-right">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {t.notifications}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.notificationsLog}
                  </p>
                </div>

                <button
                  onClick={() => actions.markAllNotificationsRead()}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {t.markAllRead}
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {state.notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t.noNotifications}
                  </div>
                ) : (
                  [...state.notifications]
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                    )
                    .map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => actions.markNotificationRead(notification.id)}
                        className={`w-full text-right px-4 py-3 border-b dark:border-gray-700 transition ${
                          notification.isRead
                            ? "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                            : "bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100/60 dark:hover:bg-amber-900/20"
                        }`}
                      >
                        <div className="text-sm text-gray-900 dark:text-white whitespace-pre-line leading-6">
                          {notification.message}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-400">
                          {new Date(notification.timestamp).toLocaleString("ar-SA")}
                          {new Date(notification.timestamp).toLocaleString(
                            currentLanguage === "ar" ? "ar-SA" : "en-US"
                          )}
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 select-none">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
            {user?.name || t.userFallback}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
            {roleLabel}
            </p>
          </div>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
            {userImageUrl ? (
              <img
                src={userImageUrl}
                alt={user?.name || t.userFallback}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} className="text-white" />
            )}
          </div>
        </div>
      </div>
      </header>

      {chatOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              void handleCloseChat();
            }}
          />

          <div className="absolute top-0 left-0 h-full w-full max-w-5xl bg-white dark:bg-gray-900 shadow-2xl flex">
            <div className="w-full md:w-[340px] border-l border-gray-200 dark:border-gray-800 flex flex-col">
              <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="text-right">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {t.chats}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.newMessagesCount}: {pendingChatsCount}
                  </p>
                </div>

                <button
                  onClick={() => {
                    void handleCloseChat();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X size={18} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {chatLoading ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      {t.loadingChats}
                    </div>
                ) : chats.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      {t.noChats}
                    </div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectChat(chat.id)}
                      className={`w-full text-right px-4 py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        selectedChatId === chat.id
                          ? "bg-blue-50 dark:bg-gray-800"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-right min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {chat.customer_name || t.customerFallback}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {chat.customer_phone || "-"}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                            {chat.last_message || t.noMessageYet}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[11px] px-2 py-1 rounded-full ${
                              (chat.unread_count ?? chat.pending_count ?? 0) > 0
                                ? "bg-red-100 text-red-600"
                                : chat.status === "closed"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {(chat.unread_count ?? chat.pending_count ?? 0) > 0
                              ? t.newMessages
                              : chat.status === "closed"
                              ? t.closed
                              : t.open}
                          </span>

                          {chat.handled_by_name && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {chat.handled_by_name}
                            </span>
                          )}

                          {(chat.unread_count ?? chat.pending_count ?? 0) > 0 && (
                            <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                              {chat.unread_count ?? chat.pending_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="hidden md:flex flex-1 flex-col">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                {selectedChat ? (
                  <div className="text-right">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {selectedChat.customer_name || t.customerFallback}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedChat.customer_phone || ""}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {selectedChat.status === "closed" ? t.closed : t.open}
                      {selectedChat.handled_by_name
                        ? ` • ${t.lastHandler}: ${selectedChat.handled_by_name}`
                        : ""}
                    </p>
                  </div>
                ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      {t.selectChat}
                    </div>
                )}
              </div>

              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 space-y-3"
              >
                {!selectedChatId || !selectedChat ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    {t.selectChat}
                  </div>
                ) : selectedChat?.messages?.length ? (
                  selectedChat.messages.map((message, index) => {
                    const previousMessage = selectedChat.messages?.[index - 1];
                    const currentDate = new Date(message.created_at).toDateString();
                    const previousDate = previousMessage
                      ? new Date(previousMessage.created_at).toDateString()
                      : null;
                    const showDateDivider = currentDate !== previousDate;

                    return (
                      <React.Fragment key={message.id}>
                        {showDateDivider && (
                          <div className="flex justify-center py-2">
                            <div className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 text-xs px-4 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                              {formatDateDivider(message.created_at)}
                            </div>
                          </div>
                        )}

                        <div
                          className={`flex ${
                            message.sender_type === "admin"
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                              message.sender_type === "admin"
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            }`}
                          >
                            <p className="text-sm leading-6">{message.message}</p>
                            <div
                              className={`text-[11px] mt-2 flex items-center gap-1 ${
                                message.sender_type === "admin"
                                  ? "text-blue-100"
                                  : "text-gray-400"
                              }`}
                            >
                              <span>{formatMessageTime(message.created_at)}</span>
                              {message.sender_type === "admin" && getMessageStatusIcon(message)}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                ) : selectedChatId && selectedChat ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    {t.noChatMessages}
                  </div>
                ) : null}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSendMessage}
                    disabled={!selectedChatId || sendingMessage || !messageText.trim()}
                    className="px-4 py-3 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                  >
                    <Send size={16} />
                  </button>

                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleSendMessage();
                      }
                    }}
                    placeholder={t.replyPlaceholder}
                    className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 text-right text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
