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
  if (!agentId || !groupId || !agentAccountId || !commissionAccountId) {
    alert("اكمل كل الحقول");
    return;
  }

  await api.agentInfo.add({
    agent_id: Number(agentId),
    group_id: Number(groupId),
    commission: Number(commission),
    agent_account_id: Number(agentAccountId),
    commission_account_id: Number(commissionAccountId),
  });

  setShowModal(false);
  setAgentId("");
  setGroupId("");
  setCommission("0");
  setAgentAccountId("");
  setCommissionAccountId("");
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
          <div className="bg-[#e9efe6] rounded-xl w-[420px] p-6 space-y-4">

            <h2 className="text-xl font-bold text-right">إضافة وكيل</h2>

            <select
              className="w-full p-3 rounded"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="">اختر الوكيل</option>
              {agents.map((a) => (
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
<select
  className="w-full p-3 rounded"
  value={agentAccountId}
  onChange={(e) => setAgentAccountId(e.target.value)}
>
  <option value="">اختر حساب الوكيل</option>
  {accounts.map((a) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  ))}
</select>

<select
  className="w-full p-3 rounded"
  value={commissionAccountId}
  onChange={(e) => setCommissionAccountId(e.target.value)}
>
  <option value="">اختر حساب العمولة</option>
  {accounts.map((a) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  ))}
</select>

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
