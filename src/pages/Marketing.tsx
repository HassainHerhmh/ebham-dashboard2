import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Eye,
  MousePointer
} from "lucide-react";

import api from "../services/api";

interface Campaign {
  id: number;
  name: string;
  type: string;
  status: string;
  views: number;
  clicks: number;
  budget: number;
  startDate: string;
}

const Marketing: React.FC = () => {

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name,setName] = useState("");
  const [type,setType] = useState("promo");
  const [budget,setBudget] = useState(0);

  /* =========================
     تحميل الإعلانات
  ========================= */

  useEffect(()=>{
    loadCampaigns()
  },[])

  const loadCampaigns = async () => {

    try{

      const res = await api.get("/campaigns");

      setCampaigns(res.data)

    }catch(err){

      console.error("فشل تحميل الحملات",err)

    }

  }

  /* =========================
     إنشاء إعلان
  ========================= */

  const createCampaign = async ()=>{

    try{

      await api.post("/campaigns",{

        name,
        type,
        budget,
        status:"active"

      })

      setName("")
      setBudget(0)

      loadCampaigns()

    }catch(err){

      console.error("فشل إنشاء الحملة",err)

    }

  }

  /* =========================
     تفعيل / تعطيل إعلان
  ========================= */

  const toggleStatus = async (c:Campaign)=>{

    try{

      await api.put(`/campaigns/${c.id}`,{

        ...c,
        status:c.status === "active" ? "paused" : "active"

      })

      loadCampaigns()

    }catch(err){

      console.error(err)

    }

  }

  /* =========================
     الإحصائيات
  ========================= */

  const totalViews = campaigns.reduce((sum,c)=> sum + (c.views || 0),0)

  const totalClicks = campaigns.reduce((sum,c)=> sum + (c.clicks || 0),0)

  const totalBudget = campaigns.reduce((sum,c)=> sum + (c.budget || 0),0)

  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0"

  return (

    <div className="space-y-6">

      {/* العنوان */}

      <div className="flex justify-between items-center">

        <h1 className="text-2xl font-bold flex items-center gap-2">

          <TrendingUp className="w-7 h-7" />

          إدارة الإعلانات

        </h1>

      </div>


      {/* إنشاء إعلان */}

      <div className="bg-white p-6 rounded-xl shadow-lg grid md:grid-cols-4 gap-4">

        <input
        placeholder="اسم الإعلان"
        value={name}
        onChange={(e)=>setName(e.target.value)}
        className="border rounded-lg p-2"
        />

        <select
        value={type}
        onChange={(e)=>setType(e.target.value)}
        className="border rounded-lg p-2"
        >

          <option value="promo">إعلان ترويجي</option>

          <option value="discount">إعلان خصم</option>

        </select>

        <input
        type="number"
        placeholder="الميزانية"
        value={budget}
        onChange={(e)=>setBudget(Number(e.target.value))}
        className="border rounded-lg p-2"
        />

        <button
        onClick={createCampaign}
        className="bg-blue-600 text-white rounded-lg px-4"
        >

          إنشاء الإعلان

        </button>

      </div>


      {/* الإحصائيات */}

      <div className="grid md:grid-cols-4 gap-4">

        <div className="bg-white p-6 rounded-xl shadow-lg flex justify-between">

          <div>

            <p className="text-gray-500 text-sm">المشاهدات</p>

            <p className="text-xl font-bold">{totalViews}</p>

          </div>

          <Eye />

        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg flex justify-between">

          <div>

            <p className="text-gray-500 text-sm">النقرات</p>

            <p className="text-xl font-bold">{totalClicks}</p>

          </div>

          <MousePointer />

        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg flex justify-between">

          <div>

            <p className="text-gray-500 text-sm">نسبة النقر</p>

            <p className="text-xl font-bold">{ctr}%</p>

          </div>

          <Percent />

        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg flex justify-between">

          <div>

            <p className="text-gray-500 text-sm">الميزانية</p>

            <p className="text-xl font-bold">{totalBudget}</p>

          </div>

          <DollarSign />

        </div>

      </div>


      {/* جدول الإعلانات */}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50">

            <tr>

              <th className="p-3 text-right">اسم الإعلان</th>

              <th className="p-3 text-right">النوع</th>

              <th className="p-3 text-right">المشاهدات</th>

              <th className="p-3 text-right">النقرات</th>

              <th className="p-3 text-right">الميزانية</th>

              <th className="p-3 text-right">الحالة</th>

              <th className="p-3 text-right">إدارة</th>

            </tr>

          </thead>

          <tbody>

            {campaigns.map((c)=>{

              const rate = c.views > 0
              ? ((c.clicks / c.views) * 100).toFixed(1)
              : "0"

              return(

                <tr key={c.id} className="border-t">

                  <td className="p-3 font-semibold">

                    {c.name}

                  </td>

                  <td className="p-3">

                    {c.type === "promo" ? "ترويجي" : "خصم"}

                  </td>

                  <td className="p-3">

                    {c.views}

                  </td>

                  <td className="p-3">

                    {c.clicks} ({rate}%)

                  </td>

                  <td className="p-3">

                    {c.budget}

                  </td>

                  <td className="p-3">

                    {c.status === "active" ?

                      <span className="text-green-600">مفعل</span>

                      :

                      <span className="text-red-500">متوقف</span>

                    }

                  </td>

                  <td className="p-3">

                    <button

                    onClick={()=>toggleStatus(c)}

                    className="bg-gray-200 px-3 py-1 rounded"

                    >

                      {c.status === "active" ?

                        "إيقاف"

                        :

                        "تفعيل"

                      }

                    </button>

                  </td>

                </tr>

              )

            })}

          </tbody>

        </table>

      </div>

    </div>

  )

}

export default Marketing
