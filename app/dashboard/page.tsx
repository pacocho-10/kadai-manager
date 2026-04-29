'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type Task = Database['public']['Tables']['tasks']['Row']

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    subject: '',
    description: '',
    deadline: '',
  })
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
    
    // 通知権限の状態を確認
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // 締切チェックと通知（1分ごと）
  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date()
      
      tasks.forEach(task => {
        if (task.completed) return
        
        const deadline = new Date(task.deadline)
        const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        
        // 24時間以内、かつまだ期限切れではない
        if (diffHours > 0 && diffHours <= 24) {
          sendNotification(
            '締切が近づいています！',
            `【${task.subject || '課題'}】${task.title} - 残り${Math.floor(diffHours)}時間`
          )
        }
        
        // 期限切れ
        if (diffHours < 0 && diffHours > -1) {
          sendNotification(
            '⚠️ 期限切れです！',
            `【${task.subject || '課題'}】${task.title}`
          )
        }
      })
    }

    // 初回チェック
    checkDeadlines()
    
    // 1分ごとにチェック
    const interval = setInterval(checkDeadlines, 60000)
    
    return () => clearInterval(interval)
  }, [tasks])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        sendNotification('通知が有効になりました', '締切が近い課題をお知らせします')
      }
    }
  }

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon.png', // アイコンは後で追加可能
        badge: '/badge.png',
      })
    }
  }

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('deadline', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: newTask.title,
      subject: newTask.subject,
      description: newTask.description,
      deadline: new Date(newTask.deadline).toISOString(),
    })

    if (error) {
      console.error('Error adding task:', error)
      alert('課題の追加に失敗しました')
    } else {
      setShowAddModal(false)
      setNewTask({ title: '', subject: '', description: '', deadline: '' })
      fetchTasks()
    }
  }

  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !currentStatus })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task:', error)
    } else {
      fetchTasks()
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('この課題を削除しますか？')) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
    } else {
      fetchTasks()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isDeadlineNear = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours <= 24 && diffHours > 0
  }

  const isOverdue = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    return deadlineDate < now
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">課題管理システム</h1>
          <div className="flex items-center space-x-4">
            {notificationPermission !== 'granted' && (
              <button
                onClick={requestNotificationPermission}
                className="px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
              >
                🔔 通知を有効化
              </button>
            )}
            {notificationPermission === 'granted' && (
              <span className="text-sm text-green-600">🔔 通知ON</span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            課題一覧（{tasks.filter(t => !t.completed).length}件）
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + 課題を追加
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            課題がありません。「+ 課題を追加」から追加してください。
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`bg-white rounded-lg shadow p-4 ${
                  task.completed ? 'opacity-60' : ''
                } ${
                  !task.completed && isOverdue(task.deadline)
                    ? 'border-l-4 border-red-500'
                    : !task.completed && isDeadlineNear(task.deadline)
                    ? 'border-l-4 border-yellow-500'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task.id, task.completed)}
                      className="mt-1 h-5 w-5 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3
                          className={`font-semibold ${
                            task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.subject && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {task.subject}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                      )}
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span
                          className={`${
                            !task.completed && isOverdue(task.deadline)
                              ? 'text-red-600 font-semibold'
                              : !task.completed && isDeadlineNear(task.deadline)
                              ? 'text-yellow-600 font-semibold'
                              : 'text-gray-500'
                          }`}
                        >
                          📅 {formatDate(task.deadline)}
                          {!task.completed && isOverdue(task.deadline) && ' (期限切れ)'}
                          {!task.completed && isDeadlineNear(task.deadline) && ' (24時間以内)'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 課題追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">課題を追加</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  課題名 *
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: レポート提出"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  科目名
                </label>
                <input
                  type="text"
                  value={newTask.subject}
                  onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 数学"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  詳細
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="例: p.10-15の問題を解く"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  締切 *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewTask({ title: '', subject: '', description: '', deadline: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}