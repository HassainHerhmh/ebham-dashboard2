import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Percent,
  Eye,
  MousePointer,
  Plus
} from "lucide-react";

import api from "../services/api";

interface Ad {
  id: number;
  name: string;
  description: string;
  type: string;
  status: string;
  views: number;
  clicks: number;
  image_url: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
}

const Marketing: React.FC = () => {

  const [ads,setAds] = useState<Ad[]>([])
  const [showModal,setShowModal] = useState(false)

  const [description,setDescription] = useState("")
  const [name,setName] = useState("")
  const [type,setType] = useState("promo")
  const [discount,setDiscount] = useState(0)
  const [image,setImage] = useState("")
  const [startDate,setStartDate] = useState("")
  const [endDate,setEndDate] = useState("")

  /* خصم المطاعم */

  const [restaurants,setRestaurants] = useState<any[]>([])
  const [categories,setCategories] = useState<any[]>([])
  const [products,setProducts] = useState<any[]>([])

  const [restaurantId,setRestaurantId] = useState<number | null>(null)
  const [categoryId,setCategoryId] = useState<number | null>(null)
  const [productIds,setProductIds] = useState<number[]>([])

  /* تحميل البيانات */

  useEffect(()=>{
    loadAds()
    loadRestaurants()
  },[])

  const loadAds = async ()=>{

    try{

      const res = await api.get("/ads/admin")
      setAds(res.data)

    }catch(err){

      console.error(err)

    }

  }

  const loadRestaurants = async ()=>{

    try{

const res = await api.get("/restaurants/list")
  setRestaurants(res.data.restaurants || res.data)

    }catch(err){

      console.error(err)

    }

  }

  const loadCategories = async (restaurantId:number)=>{

    try{

      const res = await api.get(`/categories?restaurant_id=${restaurantId}`)
      setCategories(res.data)

    }catch(err){

      console.error(err)

    }

  }

  const loadProducts = async (categoryId:number)=>{

    try{

      const res = await api.get(`/products?category_id=${categoryId}`)
      setProducts(res.data)

    }catch(err){

      console.error(err)

    }

  }

  /* إنشاء إعلان */

  const createAd = async ()=>{

    try{

      await api.post("/ads",{

        name,
        description,
        type,
        image_url:image,

        restaurant_id:restaurantId,
        category_id:categoryId,
        product_ids:productIds,

        discount_percent:type==="discount"?discount:null,

        start_date:startDate
          ? startDate + " 00:00:00"
          : null,

        end_date:endDate
          ? endDate + " 23:59:59"
          : null

      })

      setShowModal(false)

      setName("")
      setDescription("")
      setDiscount(0)
      setImage("")
      setStartDate("")
      setEndDate("")
      setRestaurantId(null)
      setCategoryId(null)
      setProductIds([])

      loadAds()

    }catch(err){

      console.error(err)

    }

  }

  /* تفعيل / تعطيل */

  const toggleStatus = async (ad:Ad)=>{

    try{

      const newStatus = ad.status === "active"
        ? "inactive"
        : "active"

      await api.put(`/ads/${ad.id}`,{
        ...ad,
        status:newStatus
      })

      loadAds()

    }catch(err){

      console.error(err)

    }

  }

  /* الإحصائيات */

  const totalViews = ads.reduce((sum,a)=> sum+(a.views||0),0)

  const totalClicks = ads.reduce((sum,a)=> sum+(a.clicks||0),0)

  const ctr = totalViews>0
  ?((totalClicks/totalViews)*100).toFixed(1)
  :"0"

  return(

    <div className="space-y-6">

      {/* العنوان */}

      <div className="flex justify-between items-center">

        <h1 className="text-2xl font-bold flex items-center gap-2">

          <TrendingUp className="w-7 h-7"/>

          إدارة الإعلانات

        </h1>

        <button
        onClick={()=>setShowModal(true)}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >

          <Plus size={18}/>

          إنشاء إعلان

        </button>

      </div>

      {/* الإحصائيات */}

      <div className="grid md:grid-cols-3 gap-4">

        <div className="bg-white p-6 rounded-xl shadow flex justify-between">

          <div>

            <p className="text-gray-500 text-sm">المشاهدات</p>

            <p className="text-xl font-bold">{totalViews}</p>

          </div>

          <Eye/>

        </div>

        <div className="bg-white p-6 rounded-xl shadow flex justify-between">

          <div>

            <p className="text-gray-500 text-sm">النقرات</p>

            <p className="text-xl font-bold">{totalClicks}</p>

          </div>

          <MousePointer/>

        </div>

        <div className="bg-white p-6 rounded-xl shadow flex justify-between">

          <div>

            <p className="text-gray-500 text-sm">CTR</p>

            <p className="text-xl font-bold">{ctr}%</p>

          </div>

          <Percent/>

        </div>

      </div>

      {/* جدول الإعلانات */}

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50">

            <tr>

              <th className="p-3 text-right">الإعلان</th>
              <th className="p-3 text-right">النص</th>
              <th className="p-3 text-right">النوع</th>
              <th className="p-3 text-right">المشاهدات</th>
              <th className="p-3 text-right">النقرات</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">إدارة</th>

            </tr>

          </thead>

          <tbody>

            {ads.map(ad=>{

              const rate = ad.views>0
              ?((ad.clicks/ad.views)*100).toFixed(1)
              :"0"

              return(

                <tr key={ad.id} className="border-t">

                  <td className="p-3 flex items-center gap-3">

                    {ad.image_url && (

                      <img
                      src={ad.image_url}
                      className="w-12 h-12 rounded object-cover border"
                      onError={(e:any)=>{
                        e.target.src="https://dummyimage.com/60x60/eeeeee/000000&text=Ad"
                      }}
                      />

                    )}

                    {ad.name}

                  </td>

                  <td className="p-3">{ad.description}</td>

                  <td className="p-3">

                  {ad.type==="promo"
                  ? "ترويجي"
                  : ad.discount_percent
                  ? `خصم ${ad.discount_percent}%`
                  : "خصم"
                  }

                  </td>

                  <td className="p-3">{ad.views}</td>

                  <td className="p-3">{ad.clicks} ({rate}%)</td>

                  <td className="p-3">

                    {ad.status==="active"
                    ?<span className="text-green-600">مفعل</span>
                    :<span className="text-red-500">متوقف</span>
                    }

                  </td>

                  <td className="p-3">

                    <button
                    onClick={()=>toggleStatus(ad)}
                    className="bg-gray-200 px-3 py-1 rounded"
                    >

                      {ad.status==="active"?"إيقاف":"تفعيل"}

                    </button>

                  </td>

                </tr>

              )

            })}

          </tbody>

        </table>

      </div>

      {/* مودل إضافة إعلان */}

      {showModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white w-[450px] rounded-xl p-6 space-y-4">

            <h2 className="text-lg font-bold">
              إضافة إعلان جديد
            </h2>

            <input
            placeholder="اسم الإعلان"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            className="w-full border rounded-lg p-2"
            />

            <textarea
            placeholder="نص الإعلان"
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            className="w-full border rounded-lg p-2"
            />

            <select
            value={type}
            onChange={(e)=>setType(e.target.value)}
            className="w-full border rounded-lg p-2"
            >

              <option value="promo">إعلان ترويجي</option>
              <option value="discount">إعلان خصم</option>

            </select>

            {type==="discount" && (

              <>
              <select
              value={restaurantId || ""}
              onChange={(e)=>{
                const id = Number(e.target.value)
                setRestaurantId(id)
                loadCategories(id)
              }}
              className="w-full border rounded-lg p-2"
              >

              <option value="">اختر المطعم</option>

              {restaurants.map(r=>(
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}

              </select>

              {restaurantId && (

                <select
                value={categoryId || ""}
                onChange={(e)=>{
                  const id = Number(e.target.value)
                  setCategoryId(id)
                  loadProducts(id)
                }}
                className="w-full border rounded-lg p-2"
                >

                <option value="">كل الفئات</option>

                {categories.map(c=>(
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}

                </select>

              )}

              {categoryId && (

                <select
                multiple
                onChange={(e)=>{

                  const options = Array.from(e.target.selectedOptions)
                  setProductIds(options.map(o=>Number(o.value)))

                }}
                className="w-full border rounded-lg p-2 h-32"
                >

                {products.map(p=>(
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}

                </select>

              )}

              <input
              type="number"
              placeholder="نسبة الخصم"
              value={discount}
              onChange={(e)=>setDiscount(Number(e.target.value))}
              className="w-full border rounded-lg p-2"
              />

              </>

            )}

            <input
            placeholder="رابط صورة الإعلان"
            value={image}
            onChange={(e)=>setImage(e.target.value)}
            className="w-full border rounded-lg p-2"
            />

            {image && (

              <img
              src={image}
              className="w-full h-40 object-cover rounded border"
              onError={(e:any)=>{
                e.target.style.display="none"
              }}
              />

            )}

            <input
            type="date"
            value={startDate}
            onChange={(e)=>setStartDate(e.target.value)}
            className="w-full border rounded-lg p-2"
            />

            <input
            type="date"
            value={endDate}
            onChange={(e)=>setEndDate(e.target.value)}
            className="w-full border rounded-lg p-2"
            />

            <div className="flex justify-end gap-3">

              <button
              onClick={()=>setShowModal(false)}
              className="px-4 py-2 bg-gray-200 rounded"
              >
                إلغاء
              </button>

              <button
              onClick={createAd}
              className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                حفظ الإعلان
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  )

}

export default Marketing
