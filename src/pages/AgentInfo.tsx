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
  commission: number;
  agent_account_name: string;
  commission_account_name: string;
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

  /* =========================
     تحميل البيانات
  ========================= */
const loadData = async () => {
  const [info, agentsData, groupsData, accountsData] = await Promise.all([
    api.agentInfo.getAll(),
    api.agents.getAgents(),
    api.agentGroups.getGroups(),
    api.accounts.getAll(),
  ]);

  setRows(info);
  setAgents(agentsData);
  setGroups(groupsData);
  setAccounts(accountsData);
};
;

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

  await api.agentInfo.add({
    account_type: accountType,      // agent | captain
    account_id: Number(agentId),
    group_id: groupId ? Number(groupId) : null,
    commission_type: commissionType, // percent | fixed
    commission_value: Number(commission),
    contract_start: contractStart,
    contract_end: contractEnd,
  });

  setShowModal(false);
  setAgentId("");
  setGroupId("");
  setCommission("0");
  setContractStart("");
  setContractEnd("");
  loadData();
};


  const filtered = rows.filter((r) =>
    r.agent_name.includes(search)
  );

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
    <th className="p-3">الوكيل</th>
    <th className="p-3">المجموعة</th>
    <th className="p-3">حساب الوكيل</th>
    <th className="p-3">حساب العمولة</th>
    <th className="p-3">العمولة %</th>
  </tr>
</thead>

<tbody>
  {filtered.map((r) => (
    <tr key={r.id} className="border-t">
      <td className="p-3">{r.agent_name}</td>
      <td className="p-3">{r.group_name}</td>
      <td className="p-3">{r.agent_account_name}</td>
      <td className="p-3">{r.commission_account_name}</td>
      <td className="p-3">{r.commission}</td>
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

            <h2 className="text-xl font-bold text-right">إضافة وكيل</h2>

        {/* نوع الحساب */}
<select
  className="w-full p-3 rounded"
  value={accountType}
  onChange={(e) => setAccountType(e.target.value as any)}
>
  <option value="agent">وكيل</option>
  <option value="captain">موصل</option>
</select>

{/* الحساب + المجموعة */}
<div className="grid grid-cols-2 gap-3">
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
        {a.name}
      </option>
    ))}
  </select>

  <select
    className="w-full p-3 rounded"
    value={groupId}
    onChange={(e) => setGroupId(e.target.value)}
  >
    <option value="">اختر المجموعة</option>
    {groups.map((g) => (
      <option key={g.id} value={g.id}>
        {g.name}
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

  <select className="w-full p-3 rounded">
    <option value="">العملة</option>
    <option value="YER">YER</option>
    <option value="USD">USD</option>
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


            <input
              type="number"
              placeholder="العمولة %"
              className="w-full p-3 rounded"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />

            <div className="flex justify-between items-center">
              <button
                onClick={handleAdd}
                className="bg-green-700 text-white px-6 py-2 rounded"
              >
                إضافة
              </button>

              <button
                onClick={() => setShowModal(false)}
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
