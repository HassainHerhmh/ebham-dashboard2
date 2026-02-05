import React from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Banknote, Wallet, Smartphone } from "lucide-react";

const PaymentChannels: React.FC = () => {
  const navigate = useNavigate();

  const Card = ({
    title,
    desc,
    icon,
    onClick,
  }: {
    title: string;
    desc: string;
    icon: React.ReactNode;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className="cursor-pointer border rounded-xl p-6 hover:shadow-lg transition bg-white flex flex-col gap-3"
    >
      <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">طرق الدفع</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="الدفع الإلكتروني"
          desc="إدارة بوابات الدفع الإلكتروني وربطها بالحسابات"
          icon={<Smartphone size={24} />}
          onClick={() => navigate("/payments/electronic")}
        />

        <Card
          title="الإيداعات البنكية"
          desc="إدارة حسابات البنوك والتحويلات"
          icon={<CreditCard size={24} />}
          onClick={() => navigate("/payments/banks")}
        />

        <Card
          title="الدفع عند الاستلام"
          desc="تفعيل أو إيقاف الدفع النقدي عند التسليم"
          icon={<Banknote size={24} />}
          onClick={() => navigate("/payments/cod")}
        />

        <Card
          title="الدفع من رصيدي"
          desc="الدفع من رصيد العميل داخل النظام"
          icon={<Wallet size={24} />}
          onClick={() => navigate("/payments/wallet")}
        />
      </div>
    </div>
  );
};

export default PaymentChannels;
