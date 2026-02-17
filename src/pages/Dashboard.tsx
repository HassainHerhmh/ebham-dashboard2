import React from 'react'
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

/* ✅ مهم */
import { io, Socket } from "socket.io-client"

const Dashboard: React.FC = () => {

  const { state, actions } = useApp()

  const stats = state.stats

  /* =========================
     Notifications State
  ========================= */

  const [notifications, setNotifications] = React.useState<any[]>([])

  /* =========================
     Socket Connection
  ========================= */

  React.useEffect(() => {

    const socket: Socket = io(
      "https://ebham-backend-production.up.railway.app"
    )

    socket.on("connect", () => {

      console.log("✅ Socket connected:", socket.id)

    })

    socket.on("admin_notification", (data) => {

      console.log("🔔 Admin notification:", data)

      setNotifications(prev => [

        {
          id: Date.now(),
          message: data.message
        },

        ...prev

      ])

    })

    return () => {

      socket.disconnect()

    }

  }, [])

  /* =========================
     Load stats
  ========================= */

  React.useEffect(() => {

    actions.loadStats()

  }, [])

  /* =========================
     API
  ========================= */

  const { data: recentOrders } = useApi(
    () => api.orders.getOrders({ limit: 10, sort: 'desc' }),
    []
  )

  const { data: salesData } = useApi(
    () => api.reports.getSalesReport(),
    []
  )

  /* ========================= */

  const ordersList =
    Array.isArray(recentOrders?.orders)
      ? recentOrders.orders
      : Array.isArray(recentOrders)
        ? recentOrders
        : []

  const orderStatusData = [
    { name: 'مكتملة', value: 400, color: '#10b981' },
    { name: 'قيد التوصيل', value: 300, color: '#3b82f6' },
    { name: 'ملغية', value: 200, color: '#ef4444' },
    { name: 'في الانتظار', value: 100, color: '#f59e0b' }
  ]

  const getStatusColor = (status: string) => {

    switch (status) {

      case 'مكتمل':
        return 'bg-green-100 text-green-800'

      case 'قيد التوصيل':
        return 'bg-blue-100 text-blue-800'

      case 'في الانتظار':
        return 'bg-yellow-100 text-yellow-800'

      case 'ملغي':
        return 'bg-red-100 text-red-800'

      default:
        return 'bg-gray-100 text-gray-800'

    }

  }

  return (

    <div className="space-y-6">

      {/* =========================
         Header
      ========================= */}

      <div className="flex items-center justify-between">

        <h1 className="text-2xl font-bold text-gray-900">

          لوحة التحكم

        </h1>

        <div className="text-sm text-gray-500">

          آخر تحديث: الآن

        </div>

      </div>


      {/* =========================
         Notifications UI
      ========================= */}

      {notifications.length > 0 && (

        <div className="space-y-2">

          {notifications.slice(0, 5).map((n) => (

            <div
              key={n.id}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow animate-pulse"
            >

              🔔 {n.message}

            </div>

          ))}

        </div>

      )}


      {/* =========================
         Stats Cards
      ========================= */}

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


      {/* =========================
         Charts
      ========================= */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-xl shadow-lg p-6">

          <h2 className="text-lg font-semibold text-gray-900 mb-4">

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

          <h2 className="text-lg font-semibold text-gray-900 mb-4">

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

                  <Cell
                    key={index}
                    fill={entry.color}
                  />

                ))}

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div>


      {/* =========================
         Recent Orders
      ========================= */}

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

                <th className="text-right py-3 px-6">
                  رقم الطلب
                </th>

                <th className="text-right py-3 px-6">
                  العميل
                </th>

                <th className="text-right py-3 px-6">
                  الحالة
                </th>

              </tr>

            </thead>

            <tbody>

              {ordersList.slice(0, 5).map((order: any) => (

                <tr key={order.id}>

                  <td className="py-3 px-6">

                    #{order.id}

                  </td>

                  <td className="py-3 px-6">

                    {order.customer_name}

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
