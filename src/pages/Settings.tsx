import React from "react";
import { useLocation, Navigate } from "react-router-dom";

import PaymentSettings from "./PaymentSettings";
import CurrencySettings from "./CurrencySettings";
import BranchesSettings from "./BranchesSettings";

type Tab = "payment" | "currency" | "branches";

const Settings: React.FC = () => {
  const location = useLocation();
  const currentTab = location.pathname.split("/")[2] as Tab | undefined;

  if (!currentTab || !["payment", "currency", "branches"].includes(currentTab)) {
    return <Navigate to="/settings/payment" replace />;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {currentTab === "payment" && <PaymentSettings />}
      {currentTab === "currency" && <CurrencySettings />}
      {currentTab === "branches" && <BranchesSettings />}
    </div>
  );
};

export default Settings;
