import React from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  timestamp: Date
  isVisible: boolean
  isRead: boolean
}

const NotificationSystem: React.FC = () => {
  const { state, actions } = useApp()

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600 dark:text-green-300" />
      case 'error':
        return <AlertCircle size={20} className="text-red-600 dark:text-red-300" />
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-300" />
      default:
        return <Info size={20} className="text-blue-600 dark:text-blue-300" />
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-700'
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-700'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-700'
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-700'
    }
  }

  const visibleNotifications = state.notifications.filter((notification) => notification.isVisible)

  if (visibleNotifications.length === 0) return null

  return (
    <div className="fixed top-4 left-4 z-50 space-y-2 max-w-sm">
      {visibleNotifications.map((notification: Notification) => (
        <div
          key={notification.id}
          onClick={() => actions.markNotificationRead(notification.id)}
          className={`p-4 rounded-lg border shadow-lg transition-all duration-300 ${getBackgroundColor(notification.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 space-x-reverse">
              {getIcon(notification.type)}
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
                  {notification.timestamp.toLocaleTimeString('ar-SA')}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                actions.markNotificationRead(notification.id)
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default NotificationSystem
