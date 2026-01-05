import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    // تحقق بسيط
    if (!user?.id || user?.is_active !== 1) {
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }

  } catch {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
