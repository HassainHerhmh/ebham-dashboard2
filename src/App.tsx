import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import NotificationSystem from "./components/NotificationSystem";

import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import CompleteProfile from "./pages/CompleteProfile";
import Unauthorized from "./pages/Unauthorized";

// الصفحات العامة
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Types from "./pages/Types";
import Customers from "./pages/Customers";
import Restaurants from "./pages/Restaurants";
import Captains from "./pages/Captains";
import CaptainGroups from "./pages/CaptainGroups";
import Marketing from "./pages/Marketing";
import Reports from "./pages/Reports";
import Categories from "./pages/Categories";
import Units from "./pages/Units";
import Products from "./pages/Products";
import Users from "./pages/Users";
import UserPermissions from "./pages/UserPermissions";
import DeliveryFeesSettings from "./pages/DeliveryFeesSettings";
import Neighborhoods from "./pages/Neighborhoods";
import PaymentsElectronic from "./pages/PaymentsElectronic";
import PaymentsBanks from "./pages/PaymentsBanks";
import PaymentsWallet from "./pages/PaymentsWallet";
import CommissionReport from "./pages/CommissionReport";
import AgentReports from "./pages/AgentReports";
import CaptainReports from "./pages/CaptainReports";

import WasselOrders from "./pages/WasselOrders";
import MapPage from "./pages/MapPage";
import ManualOrders from "./pages/ManualOrders";


// الوكلاء
import Agents from "./pages/Agents";
import AgentGroups from "./pages/AgentGroups";
import AgentInfo from "./pages/AgentInfo";

// الحسابات
import Accounting from "./pages/Accounting";
import Currencies from "./pages/Setup/Currencies";
import Accounts from "./pages/Setup/Accounts";
import AccountGroups from "./pages/Setup/AccountGroups";
import AccountCeiling from "./pages/Setup/AccountCeiling";
import Banks from "./pages/Setup/Banks";
import BankGroups from "./pages/Setup/BankGroups";
import CashBoxes from "./pages/Setup/CashBoxes";
import CashBoxGroups from "./pages/Setup/CashBoxGroups";
import ReceiptTypes from "./pages/Setup/ReceiptTypes";
import PaymentTypes from "./pages/Setup/PaymentTypes";
import JournalTypes from "./pages/Setup/JournalTypes";
import TransitAccountsSettings from "./pages/Setup/TransitAccountsSettings";
import Loyalty from "./pages/Loyalty";

// العمليات
import Operations from "./pages/Operations";
import ReceiptVoucher from "./pages/Operations/ReceiptVoucher";
import PaymentVoucher from "./pages/Operations/PaymentVoucher";
import JournalEntry from "./pages/Operations/JournalEntry";
import CurrencyExchange from "./pages/Operations/CurrencyExchange";

// تقارير الحسابات
import AccountReports from "./pages/Reports/AccountReports";
import AccountStatement from "./pages/Reports/AccountStatement";

// الإعدادات
import Settings from "./pages/Settings";

// الحماية
import ProtectedRoute from "./routes/ProtectedRoute";

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"ar" | "en">(
    localStorage.getItem("app_lang") === "en" ? "en" : "ar"
  );

  useEffect(() => {
    const syncLanguage = () => {
      const lang = localStorage.getItem("app_lang") === "en" ? "en" : "ar";
      setCurrentLanguage(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    };

    syncLanguage();
    window.addEventListener("app-language-change", syncLanguage);

    return () => {
      window.removeEventListener("app-language-change", syncLanguage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      localStorage.getItem("theme") === "dark"
    );
  }, []);

  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300"
      dir={currentLanguage === "ar" ? "rtl" : "ltr"}
    >
      <NotificationSystem />
      <Routes>
        {/* ===== Login بدون Layout ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />

        {/* ===== Layout ===== */}
        <Route
          path="/*"
          element={
            <div className="flex min-h-screen">
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />

              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto p-6">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute section="dashboard">
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/orders" element={<ProtectedRoute section="orders"><Orders /></ProtectedRoute>} />
                    
<Route
  path="/orders/wassel"
  element={
    <ProtectedRoute section="wassel_orders">
      <WasselOrders />
    </ProtectedRoute>
  }
/>

                    <Route path="/orders/manual" element={<ProtectedRoute section="manual_orders"><ManualOrders /></ProtectedRoute>} />
                    <Route path="/map-picker" element={<MapPage />} />

                    <Route path="/types" element={<ProtectedRoute section="types"><Types /></ProtectedRoute>} />
                    <Route path="/customers" element={<ProtectedRoute section="customers"><Customers /></ProtectedRoute>} />
                    <Route path="/restaurants" element={<ProtectedRoute section="restaurants"><Restaurants /></ProtectedRoute>} />
                    <Route path="/products" element={<ProtectedRoute section="products"><Products /></ProtectedRoute>} />
                    <Route path="/categories" element={<ProtectedRoute section="categories"><Categories /></ProtectedRoute>} />
                    <Route path="/units" element={<ProtectedRoute section="units"><Units /></ProtectedRoute>} />
                    <Route path="/captains" element={<ProtectedRoute section="captains"><Captains /></ProtectedRoute>} />
                     <Route path="/CaptainGroups" element={<ProtectedRoute section="captains"><CaptainGroups /></ProtectedRoute>} />
                    <Route path="/marketing" element={<ProtectedRoute section="marketing"><Marketing /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute section="reports"><Reports /></ProtectedRoute>} />
                    <Route path="/neighborhoods" element={<ProtectedRoute section="neighborhoods"><Neighborhoods /></ProtectedRoute>} />
                    <Route path="/users" element={<ProtectedRoute section="users"><Users /></ProtectedRoute>} />             
                    <Route path="/users/permissions" element={<ProtectedRoute section="users"><UserPermissions /></ProtectedRoute>} />
                   <Route path="/payments/electronic"element={<ProtectedRoute section="payments"><PaymentsElectronic /></ProtectedRoute>}/>
                   <Route path="/payments/banks"element={<ProtectedRoute section="payments"><PaymentsBanks /></ProtectedRoute>}/>
                  <Route path="/payments/wallet"element={<ProtectedRoute section="payments"><PaymentsWallet /></ProtectedRoute>}/>
                    <Route path="/reports/commissions" element={<ProtectedRoute section="commission_reports"><CommissionReport /></ProtectedRoute>} />
                    <Route path="/reports/agents" element={<ProtectedRoute section="agent_reports"><AgentReports /></ProtectedRoute>} />
                    <Route path="/reports/captains" element={<ProtectedRoute section="captain_reports"><CaptainReports /></ProtectedRoute>} />
<Route
  path="/loyalty"
  element={
    <ProtectedRoute section="loyalty">
      <Loyalty />
    </ProtectedRoute>
  }
/>



                    {/* الحسابات */}
                    <Route
                      path="/accounts"
                      element={<ProtectedRoute section="accounts"><Accounting /></ProtectedRoute>}
                    >
                      {/* التهيئة */}
                      <Route path="setup/accounts" element={<Accounts />} />
                      <Route path="setup/currencies" element={<Currencies />} />
                      <Route path="setup/account-groups" element={<AccountGroups />} />
                      <Route path="setup/account-ceiling" element={<AccountCeiling />} />
                      <Route path="setup/banks" element={<Banks />} />
                      <Route path="setup/bank-groups" element={<BankGroups />} />
                      <Route path="setup/cash-boxes" element={<CashBoxes />} />
                      <Route path="setup/cash-box-groups" element={<CashBoxGroups />} />
                      <Route path="setup/receipt-types" element={<ReceiptTypes />} />
                      <Route path="setup/payment-types" element={<PaymentTypes />} />
                      <Route path="setup/journal-types" element={<JournalTypes />} />
                       <Route path="setup/transit-accounts"element={<TransitAccountsSettings />}  />
                      
                      {/* العمليات */}
                      <Route path="operations" element={<Operations />}>
                        <Route path="receipt-voucher" element={<ReceiptVoucher />} />
                        <Route path="payment-voucher" element={<PaymentVoucher />} />
                        <Route path="journal-entry" element={<JournalEntry />} />
                          <Route path="currency-exchange" element={<CurrencyExchange />} />

                      </Route>

                      {/* تقارير الحسابات */}
                      <Route path="reports" element={<AccountReports />}>
                        <Route path="account-statement" element={<AccountStatement />} />
                      </Route>
                    </Route>

                    {/* الوكلاء */}
                    <Route path="/agents" element={<ProtectedRoute section="agents"><Agents /></ProtectedRoute>} />
                    <Route path="/agents/info" element={<ProtectedRoute section="agent_info"><AgentInfo /></ProtectedRoute>} />
                    <Route path="/agents/groups" element={<ProtectedRoute section="agent_groups"><AgentGroups /></ProtectedRoute>} />

                 {/* الإعدادات */}
<Route
  path="/settings/delivery-fees"
  element={
    <ProtectedRoute section="settings">
      <DeliveryFeesSettings />
    </ProtectedRoute>
  }
/>

<Route
  path="/settings/:tab"
  element={
    <ProtectedRoute section="settings">
      <Settings />
    </ProtectedRoute>
  }
/>

<Route path="/settings" element={<Navigate to="/settings/payment" replace />} />

<Route path="/unauthorized" element={<Unauthorized />} />
<Route path="*" element={<Unauthorized />} />


                  </Routes>
                </main>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
