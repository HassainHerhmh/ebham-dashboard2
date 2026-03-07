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
  id:number
  name:string
  description:string
  type:string
  status:string
  views:number
  clicks:number
  image_url:string
  discount_percent:number
  start_date:string
  end_date:string

  restaurant_id?:number
  category_id?:number
  restaurant_name?:string
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

  const [restaurants,setRestaurants] = useState<any[]>([])
  const [categories,setCategories] = useState<any[]>([])
  const [products,setProducts] = useState<any[]>([])

  const [restaurantId,setRestaurantId] = useState<number | null>(null)
  const [categoryId,setCategoryId] = useState<number | null>(null)
  const [productIds,setProductIds] = useState<number[]>([])

  const [editingId,setEditingId] = useState<number | null>(null)

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

  const loadRestaurants = async () => {
    try{
      const res = await api.get("/restaurants/list")
      const list =
        Array.isArray(res.data)
          ? res.data
          : res.data.restaurants || []
      setRestaurants(list)
    }catch(err){
      console.error(err)
    }
  }

  const loadCategories = async (restaurantId:number)=>{
    try{
      const res = await api.get(`/categories?restaurant_id=${restaurantId}`)
      const list =
        Array.isArray(res.data)
          ? res.data
          : res.data.categories || []
      setCategories(list)
    }catch(err){
      console.error(err)
    }
  }

  const loadProducts = async (categoryId:number)=>{
    try{
      const res = await api.get(`/products/by-category/${categoryId}`)
      const list =
        Array.isArray(res.data)
          ? res.data
          : res.data.products || []
      setProducts(list)
    }catch(err){
      console.error(err)
    }
  }

  const createAd = async ()=>{
    try{

      const payload = {
        name,
        description,
        type,
        image_url:image,
        restaurant_id:restaurantId,
        category_id:categoryId,
        product_ids:productIds,
        discount_percent:type==="discount"?discount:null,
        start_date:startDate ? startDate + " 00:00:00" : null,
        end_date:endDate ? endDate + " 23:59:59" : null
      }

      if(editingId){
        await api.put(`/ads/${editingId}`,payload)
      }else{
        await api.post("/ads",payload)
      }

      setShowModal(false)
      setEditingId(null)

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

  const deleteAd = async (id:number)=>{
    if(!confirm("هل تريد حذف الإعلان؟")) return
    try{
      await api.delete(`/ads/${id}`)
      loadAds()
    }catch(err){
      console.error(err)
    }
  }

  const editAd = (ad:Ad)=>{

    setEditingId(ad.id)
    setName(ad.name)
    setDescription(ad.description)
    setType(ad.type)
    setDiscount(ad.discount_percent || 0)
    setImage(ad.image_url || "")
    setStartDate(ad.start_date?.split(" ")[0] || "")
    setEndDate(ad.end_date?.split(" ")[0] || "")

    setShowModal(true)
  }

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

  const totalViews = ads.reduce((sum,a)=> sum+(a.views||0),0)
  const totalClicks = ads.reduce((sum,a)=> sum+(a.clicks||0),0)

  const ctr = totalViews>0
  ?((totalClicks/totalViews)*100).toFixed(1)
  :"0"

  return(

    <div className="space-y-6">

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

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50">

            <tr>
              <th className="p-3 text-right">الإعلان</th>
              <th className="p-3 text-right">النص</th>
              <th className="p-3 text-right">النوع</th>
              <th className="p-3 text-right">المطعم</th>
              <th className="p-3 text-right">الفترة</th>
              <th className="p-3 text-right">المشاهدات</th>
              <th className="p-3 text-right">النقرات</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">الإجراءات</th>
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

                  <td className="p-3">
                    {ad.type==="discount"
                      ? ad.restaurant_name || "-"
                      : "-"
                    }
                  </td>

                <td className="p-3 text-sm">

{ad.start_date && ad.end_date
  ? `${ad.start_date.slice(0,10)} - ${ad.end_date.slice(0,10)}`
  : "-"
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

                  <td className="p-3 flex gap-2">

                    <button
                    onClick={()=>toggleStatus(ad)}
                    className="bg-gray-200 px-3 py-1 rounded"
                    >
                      {ad.status==="active"?"إيقاف":"تفعيل"}
                    </button>

                    <button
                    onClick={()=>editAd(ad)}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      تعديل
                    </button>

                    <button
                    onClick={()=>deleteAd(ad.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      حذف
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

<div className="bg-white w-full max-w-2xl rounded-xl p-6 max-h-[80vh] overflow-y-auto">

<h2 className="text-lg font-bold mb-4">
{editingId ? "تعديل إعلان" : "إضافة إعلان جديد"}
</h2>

<div className="grid grid-cols-2 gap-4">

<input
placeholder="اسم الإعلان"
value={name}
onChange={(e)=>setName(e.target.value)}
className="col-span-2 border rounded-lg p-2"
/>

<textarea
placeholder="نص الإعلان"
value={description}
onChange={(e)=>setDescription(e.target.value)}
className="col-span-2 border rounded-lg p-2"
/>

<select
value={type}
onChange={(e)=>setType(e.target.value)}
className="col-span-2 border rounded-lg p-2"
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
className="border rounded-lg p-2"
>

<option value="">اختر المطعم</option>

{restaurants.map(r=>(
<option key={r.id} value={r.id}>
{r.name}
</option>
))}

</select>

<select
value={categoryId || ""}
onChange={(e)=>{
const id = Number(e.target.value)
setCategoryId(id)
loadProducts(id)
}}
className="border rounded-lg p-2"
>

<option value="">كل الفئات</option>

{categories.map(c=>(
<option key={c.id} value={c.id}>
{c.name}
</option>
))}

</select>

<select
multiple
onChange={(e)=>{
const options = Array.from(e.target.selectedOptions)
setProductIds(options.map(o=>Number(o.value)))
}}
className="col-span-2 border rounded-lg p-2 h-28"
>

{products.map(p=>(
<option key={p.id} value={p.id}>
{p.name}
</option>
))}

</select>

<input
type="number"
placeholder="نسبة الخصم"
value={discount}
onChange={(e)=>setDiscount(Number(e.target.value))}
className="col-span-2 border rounded-lg p-2"
/>

</>

)}

<input
placeholder="رابط صورة الإعلان"
value={image}
onChange={(e)=>setImage(e.target.value)}
className="col-span-2 border rounded-lg p-2"
/>

{image && (

<img
src={image}
className="col-span-2 w-full h-40 object-cover rounded border"
onError={(e:any)=>{
e.target.style.display="none"
}}
/>

)}

<input
type="date"
value={startDate}
onChange={(e)=>setStartDate(e.target.value)}
className="border rounded-lg p-2"
/>

<input
type="date"
value={endDate}
onChange={(e)=>setEndDate(e.target.value)}
className="border rounded-lg p-2"
/>

</div>

<div className="flex justify-end gap-3 mt-6">

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
