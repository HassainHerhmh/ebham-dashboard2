import React from 'react'
import { io, Socket } from "socket.io-client"

import StatCard from '../components/StatCard'
import { useApp } from '../contexts/AppContext'
import { useApi } from '../hooks/useApi'
import api from '../services/api'

import {
  Users,
  ShoppingBag,
  Truck,
  DollarSign
} from 'lucide-react'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'


const SOCKET_URL = "https://ebham-backend-production.up.railway.app"


const Dashboard: React.FC = () => {

  const { state, actions } = useApp()

  const stats = state.stats

  const socketRef = React.useRef<Socket | null>(null)


  /* =========================
     تحميل الإحصائيات
  ========================= */
  React.useEffect(() => {
    actions.loadStats()
  }, [])


  /* =========================
     الاتصال بـ Socket.IO
  ========================= */
  React.useEffect(() => {

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10
    })

    socketRef.current = socket

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id)
    })

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected")
    })

    /* =========================
       استقبال إشعارات لوحة التحكم
    ========================= */
    socket.on("admin_notification", (data: any) => {

      console.log("📢 Admin notification received:", data)

      // عرض alert مؤقت
      alert(data.message)

      // إعادة تحميل الإحصائيات
      actions.loadStats()

    })


    return () => {
      socket.disconnect()
    }

  }, [])



  /* =========================
     جلب الطلبات الأخيرة
  ========================= */
  const { data: recentOrders } = useApi(
    () => api.orders.getOrders({ limit: 10, sort: 'desc' }),
    []
  )


  /* =========================
     تقرير المبيعات
  ========================= */
  const { data: salesData } =
    useApi(() => api.reports.getSalesReport(), [])



  /* =========================
     معالجة الطلبات
  ========================= */
  const ordersList =
    Array.isArray(recentOrders?.orders)
      ? recentOrders.orders
      : Array.isArray(recentOrders)
        ? recentOrders
        : []



  /* =========================
     بيانات الرسم
  ========================= */
  const orderStatusData = [

    { name: 'مكتملة', value: 400, color: '#10b981' },

    { name: 'قيد التوصيل', value: 300, color: '#3b82f6' },

    { name: 'ملغية', value: 200, color: '#ef4444' },

    { name: 'في الانتظار', value: 100, color: '#f59e0b' }

  ]


  /* =========================
     ألوان الحالة
  ========================= */
  const getStatusColor = (status: string) => {

    switch (status) {

      case 'completed':
      case 'مكتمل':
        return 'bg-green-100 text-green-800'

      case 'delivering':
      case 'قيد التوصيل':
        return 'bg-blue-100 text-blue-800'

      case 'pending':
      case 'في الانتظار':
        return 'bg-yellow-100 text-yellow-800'

      case 'cancelled':
      case 'ملغي':
        return 'bg-red-100 text-red-800'

      default:
        return 'bg-gray-100 text-gray-800'
    }

  }



  return (

    <div className="space-y-6">


      {/* Header */}
      <div className="flex items-center justify-between">

        <h1 className="text-2xl font-bold text-gray-900">
          لوحة التحكم
        </h1>

        <div className="text-sm text-gray-500">
          متصل realtime
        </div>

      </div>



      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">


        <StatCard
          title="إجمالي الطلبات اليوم"
          value={stats?.totalOrders?.toString() || "0"}
          change="12%"
          changeType="increase"
          icon={ShoppingBag}
          color="primary"
        />


        <StatCard
          title="العملاء النشطون"
          value={stats?.activeCustomers?.toString() || "0"}
          change="8%"
          changeType="increase"
          icon={Users}
          color="secondary"
        />


        <StatCard
          title="الكباتن المتاحون"
          value={stats?.availableCaptains?.toString() || "0"}
          change="2"
          changeType="decrease"
          icon={Truck}
          color="warning"
        />


        <StatCard
          title="إجمالي المبيعات"
          value={`${stats?.totalSales?.toLocaleString() || "0"} ريال`}
          change="15%"
          changeType="increase"
          icon={DollarSign}
          color="success"
        />


      </div>



      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


        <div className="bg-white rounded-xl shadow-lg p-6">

          <h2 className="text-lg font-semibold mb-4">
            المبيعات الأسبوعية
          </h2>

          <ResponsiveContainer width="100%" height={300}>

            <AreaChart data={salesData || []}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />

            </AreaChart>

          </ResponsiveContainer>

        </div>



        <div className="bg-white rounded-xl shadow-lg p-6">

          <h2 className="text-lg font-semibold mb-4">
            حالة الطلبات
          </h2>

          <ResponsiveContainer width="100%" height={300}>

            <PieChart>

              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
              >

                {orderStatusData.map((entry, index) => (

                  <Cell key={index} fill={entry.color} />

                ))}

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div>



      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg">

        <div className="px-6 py-4 border-b">

          <h2 className="text-lg font-semibold">
            الطلبات الأخيرة
          </h2>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="py-3 px-6 text-right">
                  رقم
                </th>

                <th className="py-3 px-6 text-right">
                  الحالة
                </th>

              </tr>

            </thead>


            <tbody>

              {ordersList.slice(0, 5).map((order: any) => (

                <tr key={order.id}
                    className="border-b hover:bg-gray-50">

                  <td className="py-3 px-6">
                    #{order.id}
                  </td>

                  <td className="py-3 px-6">

                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>

                      {order.status}

                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>



    </div>

  )

}

export default Dashboard
