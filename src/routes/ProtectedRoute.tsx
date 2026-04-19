import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { hasPermission } from "../utils/permissions";

interface Props {
  children: ReactNode;
  section?: string;
}

const ProtectedRoute = ({ children, section }: Props) => {
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    // ✅ تحقق منطقي وصحيح
    if (!user?.id || user?.status !== "active") {
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }

    if (section && !hasPermission(user, section, "view")) {
      return <Navigate to="/unauthorized" replace />;
    }

  } catch {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
