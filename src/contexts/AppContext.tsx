import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import { usePolling } from "../hooks/usePolling";

/* ======================
      Interfaces
====================== */
interface Notification {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  timestamp: Date;
  isVisible: boolean;
  isRead: boolean;
}

interface Stats {
  totalOrders: number;
  activeCustomers: number;
  availableCaptains: number;
  totalSales: number;
  averageDeliveryTime: number;
  dailyTarget: number;
}

interface AppState {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  notifications: Notification[];
  user: any | null;
  realTimeUpdates: boolean;
}

interface AppActions {
  loadStats: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addNotification: (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => void;
  hideNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleRealTimeUpdates: () => void;
}

interface AppContextType {
  state: AppState;
  actions: AppActions;
}

/* ======================
    Context Export ✅
====================== */
// إضافة كلمة export هنا هي المفتاح لحل خطأ "AppContext is not exported"
export const AppContext = createContext<AppContextType | undefined>(undefined);

type Action =
  | { type: "SET_STATS"; payload: Stats }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "HIDE_NOTIFICATION"; payload: string }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "TOGGLE_REAL_TIME_UPDATES" }
  | { type: "SET_USER"; payload: any | null };

const initialState: AppState = {
  stats: null,
  loading: false,
  error: null,
  notifications: [],
  user: null,
  realTimeUpdates: true,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STATS":
      return { ...state, stats: action.payload, loading: false, error: null };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [...state.notifications, action.payload].slice(-100),
      };
    case "HIDE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, isVisible: false } : n
        ),
      };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, isRead: true, isVisible: false } : n
        ),
      };
    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          isVisible: false,
        })),
      };
    case "TOGGLE_REAL_TIME_UPDATES":
      return { ...state, realTimeUpdates: !state.realTimeUpdates };
    case "SET_USER":
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

/* ======================
      Provider
====================== */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const savedNotifications = localStorage.getItem("dashboard_notifications");
    if (!savedNotifications) return;

    try {
      const parsed = JSON.parse(savedNotifications);
      if (!Array.isArray(parsed)) return;

      parsed.forEach((notification) => {
        dispatch({
          type: "ADD_NOTIFICATION",
          payload: {
            ...notification,
            timestamp: new Date(notification.timestamp),
            isVisible: false,
          },
        });
      });
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "dashboard_notifications",
      JSON.stringify(state.notifications)
    );
  }, [state.notifications]);

  const actions: AppActions = {
    loadStats: async () => {
      try {
        const api = await import("../services/api");
        const hasGetStats = Boolean((api.default as any)?.admin?.getStatistics);

        if (hasGetStats) {
          const response = await (api.default as any).admin.getStatistics();
          if (response.success && response.stats) {
            dispatch({ type: "SET_STATS", payload: response.stats });
            return;
          }
        }

        const mockStats: Stats = {
          totalOrders: 0,
          activeCustomers: 0,
          availableCaptains: 0,
          totalSales: 0,
          averageDeliveryTime: 28,
          dailyTarget: 200,
        };
        dispatch({ type: "SET_STATS", payload: mockStats });
      } catch (error) {
        console.error("Error loading stats:", error);
        const mockStats: Stats = {
          totalOrders: 0,
          activeCustomers: 0,
          availableCaptains: 0,
          totalSales: 0,
          averageDeliveryTime: 28,
          dailyTarget: 200,
        };
        dispatch({ type: "SET_STATS", payload: mockStats });
      }
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: "SET_LOADING", payload: loading });
    },

    setError: (error: string | null) => {
      dispatch({ type: "SET_ERROR", payload: error });
    },

    addNotification: (
      message: string,
      type: "success" | "error" | "warning" | "info"
    ) => {
      const notification: Notification = {
        id: Date.now().toString(),
        message,
        type,
        timestamp: new Date(),
        isVisible: true,
        isRead: false,
      };
      dispatch({ type: "ADD_NOTIFICATION", payload: notification });
      setTimeout(() => {
        dispatch({ type: "HIDE_NOTIFICATION", payload: notification.id });
      }, 5000);
    },

    hideNotification: (id: string) => {
      dispatch({ type: "HIDE_NOTIFICATION", payload: id });
    },

    markNotificationRead: (id: string) => {
      dispatch({ type: "MARK_NOTIFICATION_READ", payload: id });
    },

    markAllNotificationsRead: () => {
      dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
    },

    toggleRealTimeUpdates: () => {
      dispatch({ type: "TOGGLE_REAL_TIME_UPDATES" });
    },
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch({ type: "SET_USER", payload: user });
      } catch {
        dispatch({ type: "SET_USER", payload: null });
      }
    }
    actions.loadStats();
  }, []);

  usePolling(
    () => {
      if (state.realTimeUpdates) {
        actions.loadStats();
      }
    },
    { interval: 10000, enabled: state.realTimeUpdates }
  );

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
};

/* ======================
      Hook
====================== */
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
