import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Settings } from "lucide-react";
import { Settings, X } from "lucide-react";
const BRAND = "#16a34a";

export default function Loyalty() {

  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [settings, setSettings] = useState({
    amount_per_point: 100,
    point_value: 1
  });

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  const loadData = async () => {
    const res = await api.get("/api/admin/loyalty-logs");
    if (res.data.success) setData(res.data.data);
  };

  const loadSettings = async () => {
    const res = await api.get("/api/admin/loyalty-settings");
    if (res.data) setSettings(res.data);
  };

  const saveSettings = async () => {
    await api.post("/api/admin/loyalty-settings", settings);
    setIsModalOpen(false);
  };

  // فلترة
  const filtered = data.filter((item) => {
    if (filter === "today") {
      return new Date(item.created_at).toDateString() === new Date().toDateString();
    }
    return true;
  });

  const totalPoints = filtered.reduce((sum, i) => sum + i.points, 0);
  const totalAmount = filtered.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>

      {/* ===== Header ===== */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
        <h2>نقاط الولاء</h2>

        <button
          onClick={() => setIsModalOpen(true)}
          style={styles.settingsBtn}
        >
          <Settings size={18}/> إعدادات الولاء
        </button>
      </div>

      {/* ===== Filter ===== */}
      <div style={styles.filters}>
        <button onClick={() => setFilter("all")}>الكل</button>
        <button onClick={() => setFilter("today")}>اليوم</button>
      </div>

      {/* ===== Stats ===== */}
      <div style={styles.stats}>
        <div>⭐ مجموع النقاط: {totalPoints}</div>
        <div>💰 مجموع الصرف: {totalAmount} ريال</div>
      </div>

      {/* ===== Table ===== */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th>العميل</th>
            <th>الجوال</th>
            <th>المبلغ</th>
            <th>النقاط</th>
            <th>التاريخ</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((item, i) => (
            <tr key={i}>
              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.amount}</td>

              <td style={{
                color: item.type === "earn" ? "green" : "red",
                fontWeight: "bold"
              }}>
                {item.type === "earn" ? "+" : "-"}{item.points}
              </td>

              <td>{new Date(item.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== Modal ===== */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
<div style={styles.modal}>

  {/* زر إغلاق */}
  <div style={styles.modalHeader}>
    <h3 style={{ margin: 0 }}>إعدادات الولاء</h3>

    <button
      onClick={() => setIsModalOpen(false)}
      style={styles.closeBtn}
    >
      <X size={18} />
    </button>
  </div>
            <h3>إعدادات الولاء</h3>

            {/* المربع الأول */}
            <div style={styles.inputGroup}>
              <label>كل كم ريال = نقطة؟</label>
              <input
                type="number"
                value={settings.amount_per_point}
                onChange={(e) =>
                  setSettings({ ...settings, amount_per_point: Number(e.target.value) })
                }
              />
            </div>

            {/* المربع الثاني */}
            <div style={styles.inputGroup}>
              <label>كم تساوي النقطة (ريال)؟</label>
              <input
                type="number"
                value={settings.point_value}
                onChange={(e) =>
                  setSettings({ ...settings, point_value: Number(e.target.value) })
                }
              />
            </div>

            <button onClick={saveSettings} style={styles.saveBtn}>
              حفظ
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

const styles: any = {
  table: {
    width: "100%",
    background: "#fff",
    borderRadius: 12,
  },

  filters: {
    display: "flex",
    gap: 10,
    marginBottom: 10
  },

  stats: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
    fontWeight: "bold"
  },

  settingsBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 5
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 15,
    width: 300
  },

  inputGroup: {
    marginBottom: 10
  },

  saveBtn: {
    width: "100%",
    background: "#16a34a",
    color: "#fff",
    padding: 10,
    borderRadius: 10,
    border: "none"
  }
};
