// LoyaltyPage.tsx

import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function LoyaltyPage() {

  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/api/admin/loyalty")
      .then(res => setData(res.data));
  }, []);

  return (
    <div>
      <h2>نقاط الولاء</h2>

      {data.map((u:any)=>(
        <div key={u.user_id}>
          👤 {u.name} - ⭐ {u.points} نقطة
        </div>
      ))}

    </div>
  );
}
