import { Outlet, Navigate } from "react-router-dom";

const Reports = () => {
  return (
    <div className="space-y-4">
      <Navigate to="account-statement" replace />
      <Outlet />
    </div>
  );
};

export default Reports;
