import React, { useEffect, useState } from "react";
import api from "../services/api";

interface Agent {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
}

interface Account {
  id: number;
  name: string;
}

interface AgentInfoRow {
  id: number;
  agent_name: string;
  group_name: string;
  commission_value: number;
  commission_type: "percent" | "fixed";
  agent_account_name: string | null;
  commission_account_name: string | null;
  currency_code: string | null;
    branch_name: string | null;
}


interface Captain {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  code: string;
  name_ar: string;
}



const AgentInfo: React.FC = () => {
  const [rows, setRows] = useState<AgentInfoRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [agentId, setAgentId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [commission, setCommission] = useState("0");
  const [accounts, setAccounts] = useState<Account[]>([]);
const [agentAccountId, setAgentAccountId] = useState("");
const [commissionAccountId, setCommissionAccountId] = useState("");
const [accountType, setAccountType] = useState<"agent" | "captain">("agent");
const [commissionType, setCommissionType] = useState<"percent" | "fixed">("percent");
const [contractStart, setContractStart] = useState("");
const [contractEnd, setContractEnd] = useState("");
const [agentGroups, setAgentGroups] = useState<Group[]>([]);
const [captainGroups, setCaptainGroups] = useState<Group[]>([]);
const [editingId, setEditingId] = useState<number | null>(null);


  const [captains, setCaptains] = useState<Captain[]>([]);
const [currencies, setCurrencies] = useState<Currency[]>([]);
const [currencyId, setCurrencyId] = useState("");
  /* =========================
     تحميل البيانات
  ========================= */
const loadData = async () => {
  try {
    const [
      info,
      agentsData,
      captainsData,
      agentGroupsData,
      captainGroupsData,
      accountsRes,
      currenciesData,
    ] = await Promise.all([
      api.agentInfo.getAll(),
      api.agents.getAgents(),
      api.captains.getAll(),
      api.agentGroups.getGroups(),     // مجموعات الوكلاء
      api.captainGroups.getGroups(),   // مجموعات الكباتن
      api.accounts.getAccounts(),
      api.currencies.getAll(),
    ]);

setRows(info?.list || []);
    setAgents(agentsData?.agents || []);
    setCaptains(captainsData || []);

    setAgentGroups(agentGroupsData || []);
    setCaptainGroups(captainGroupsData || []);

    const list = accountsRes?.list || [];
    setAccounts(list.filter((a: any) => a.parent_id));

    setCurrencies(currenciesData?.currencies || []);
  } catch (e) {
    console.error("AgentInfo loadData error:", e);
  }
};



  useEffect(() => {
    loadData();
  }, []);

  
  /* =========================
     إضافة
  ========================= */
const handleAdd = async () => {
  if (!agentId || !contractStart || !contractEnd) {
    alert("اكمل كل الحقول");
    return;
  }

  const payload = {
    account_type: accountType,
    account_id: Number(agentId),
    group_id: groupId ? Number(groupId) : null,
    commission_type: commissionType,
    commission_value: Number(commission),
    contract_start: contractStart,
    contract_end: contractEnd,

    agent_account_id: agentAccountId ? Number(agentAccountId) : null,
    commission_account_id: commissionAccountId
      ? Number(commissionAccountId)
      : null,
    currency_id: currencyId ? Number(currencyId) : null,
  };

  if (editingId) {
    // تعديل
    await api.agentInfo.update(editingId, payload);
  } else {
    // إضافة جديدة
    await api.agentInfo.add(payload);
  }

  // إعادة تعيين الحالات
  setEditingId(null);
  setShowModal(false);
  setAgentId("");
  setGroupId("");
  setCommission("0");
  setAgentAccountId("");
  setCommissionAccountId("");
  setCurrencyId("");
  setContractStart("");
  setContractEnd("");

  loadData();
};



const filtered = rows.filter((r) =>
  (r.agent_name || "")
    .toLowerCase()
    .includes(search.toLowerCase())
);


  const handleEdit = (row: AgentInfoRow) => {
  setEditingId(row.id);
  setShowModal(true);

  setAccountType((row as any).account_type || "agent");
  setAgentId(String((row as any).account_id || ""));
  setGroupId(String((row as any).group_id || ""));
  setCommissionType(row.commission_type);
  setCommission(String(row.commission_value || 0));
  setAgentAccountId(String((row as any).agent_account_id || ""));
  setCommissionAccountId(String((row as any).commission_account_id || ""));
  setCurrencyId(String((row as any).currency_id || ""));

  // المهم هنا
  setContractStart(
    (row as any).contract_start
      ? String((row as any).contract_start).slice(0, 10)
      : ""
  );

  setContractEnd(
    (row as any).contract_end
      ? String((row as any).contract_end).slice(0, 10)
      : ""
  );
};


const handleDelete = async (id: number) => {
  if (!confirm("هل أنت متأكد من الحذف؟")) return;
  await api.agentInfo.delete(id);
  loadData();
};


  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">معلومات الوكلاء</h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          إضافة
        </button>
      </div>

      <input
        type="text"
        placeholder="بحث باسم الوكيل"
        className="border p-2 rounded w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-right">
 <thead className="bg-gray-100">
  <tr>
    <th className="p-3 text-center">#</th>
    <th className="p-3 text-center">الوكيل</th>
    <th className="p-3 text-center">الفرع</th>
    <th className="p-3 text-center">المجموعة</th>
    <th className="p-3 text-center">حساب الوكيل / الموصل</th>
    <th className="p-3 text-center">طريقة احتساب العمولة</th>
    <th className="p-3 text-center">النسبة / المبلغ</th>
    <th className="p-3 text-center">فترة العقد</th>
   <th className="p-3 text-center w-[120px]">إجراءات</th>

  </tr>
</thead>

<tbody>
  {filtered.map((r, i) => (
    <tr key={r.id} className="border-t">
      <td className="p-3 text-center">{i + 1}</td>
      <td className="p-3 text-center">{r.agent_name}</td>
      <td className="p-3 text-center">
  {r.branch_name || "-"}
</td>

      <td className="p-3 text-center">{r.group_name || "-"}</td>
      <td className="p-3 text-center">{r.agent_account_name || "-"}</td>
      <td className="p-3 text-center">
        {r.commission_type === "percent" ? "نسبة مئوية" : "مبلغ ثابت"}
      </td>
      <td className="p-3 text-center">
        {r.commission_value}
        {r.commission_type === "percent" ? "%" : ` ${r.currency_code || ""}`}
      </td>
    <td className="p-3 text-center whitespace-nowrap">
 {r.contract_start
  ? String(r.contract_start).slice(0, 10)
  : "-"}

  {String(r.contract_end).slice(0, 10)}
</td>

   <td className="p-3 text-center w-[120px]">
  <div className="flex gap-2 justify-center">
  <button
  className="px-3 py-1 rounded bg-blue-600 text-white"
  onClick={() => handleEdit(r)}
>
  تعديل
</button>

<button
  className="px-3 py-1 rounded bg-red-600 text-white"
  onClick={() => handleDelete(r.id)}
>
  حذف
</button>

  </div>
</td>

    </tr>
  ))}
</tbody>



        </table>
      </div>

      {/* =========================
         Modal
      ========================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-[#e9efe6] rounded-xl w-full max-w-2xl mx-4 p-6 space-y-4">
<h2 className="text-xl font-bold text-right">
  {editingId ? "تعديل وكيل" : "إضافة وكيل"}
</h2>


     {/* نوع الحساب */}
<select
  className="w-full p-3 rounded"
  value={accountType}
  onChange={(e) => {
    setAccountType(e.target.value as any);
    setAgentId(""); // تصفير الاختيار عند التغيير
  }}
>
  <option value="agent">وكيل</option>
  <option value="captain">موصل</option>
</select>

<select
  className="w-full p-3 rounded"
  value={agentId}
  onChange={(e) => setAgentId(e.target.value)}
>
  <option value="">
    {accountType === "agent" ? "اختر الوكيل" : "اختر الموصل"}
  </option>

{(accountType === "agent" ? agents : captains).map((a: any) => (
  <option key={a.id} value={a.id}>
    {a.name || a.name_ar}
  </option>
))}


</select>

{/* الحساب + المجموعة */}
<div className="grid grid-cols-2 gap-3">
<select
  className="w-full p-3 rounded"
  value={agentAccountId}
  onChange={(e) => setAgentAccountId(e.target.value)}
>
  <option value="">اختر حساب الوكيل / الموصل</option>
 {accounts.map((a: any) => (
  <option key={a.id} value={a.id}>
    {a.name || a.name_ar}
  </option>
))}

</select>


<select
  className="w-full p-3 rounded"
  value={groupId}
  onChange={(e) => setGroupId(e.target.value)}
>
  <option value="">اختر المجموعة</option>

  {(accountType === "agent" ? agentGroups : captainGroups).map((g) => (
    <option key={g.id} value={g.id}>
      {g.name || (g as any).name_ar}
    </option>
  ))}
</select>

</div>

{/* نوع العمولة */}
<select
  className="w-full p-3 rounded"
  value={commissionType}
  onChange={(e) => setCommissionType(e.target.value as any)}
>
  <option value="percent">نسبة مئوية</option>
  <option value="fixed">مبلغ ثابت</option>
</select>

{/* القيمة + العملة (إن وجدت) */}
<div className="grid grid-cols-2 gap-3">
  <input
    type="number"
    placeholder={
      commissionType === "percent" ? "النسبة %" : "المبلغ الثابت"
    }
    className="w-full p-3 rounded"
    value={commission}
    onChange={(e) => setCommission(e.target.value)}
  />

<select
  className="w-full p-3 rounded"
  value={currencyId}
  onChange={(e) => setCurrencyId(e.target.value)}
>
  <option value="">العملة</option>
  {currencies.map((c) => (
    <option key={c.id} value={c.id}>
      {c.code} - {c.name_ar}
    </option>
  ))}
</select>

</div>

{/* فترة العقد */}
<div className="grid grid-cols-2 gap-3">
  <input
    type="date"
    className="w-full p-3 rounded"
    value={contractStart}
    onChange={(e) => setContractStart(e.target.value)}
  />
  <input
    type="date"
    className="w-full p-3 rounded"
    value={contractEnd}
    onChange={(e) => setContractEnd(e.target.value)}
  />
</div>



         <div className="flex justify-between items-center">
  <button
    onClick={handleAdd}
    className="bg-green-700 text-white px-6 py-2 rounded"
  >
    {editingId ? "حفظ التعديل" : "إضافة"}
  </button>

  <button
    onClick={() => {
      setShowModal(false);
      setEditingId(null);
    }}
    className="text-green-700"
  >
    إلغاء الأمر
  </button>
</div>


          </div>
        </div>
      )}
    </div>
  );
};

export default AgentInfo;
