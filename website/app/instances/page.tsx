'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Instance } from '@/lib/types'
import InstanceCard from '@/components/ui/InstanceCard'
import SetupTerminal from '@/components/ui/SetupTerminal'
import Modal from '@/components/ui/Modal'
import ToastContainer, { type ToastMessage } from '@/components/ui/ToastContainer'
import Button from '@/components/ui/Button'
import { Loader2, Server, AlertTriangle } from 'lucide-react'

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [setupInstance, setSetupInstance] = useState<string | null>(null)
  const [setupUrl, setSetupUrl] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [deletingInstance, setDeletingInstance] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [tunnelStatuses, setTunnelStatuses] = useState<Record<string, 'connected' | 'disconnected' | 'connecting' | 'disconnecting'>>({})
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, 'active' | 'inactive' | 'failed' | 'unknown' | 'loading'>>({})
  const [reconfiguringInstance, setReconfiguringInstance] = useState<string | null>(null)
  const [reconfigureLog, setReconfigureLog] = useState<string[]>([])
  const [reconfigureModalOpen, setReconfigureModalOpen] = useState(false)
  const reconfigureLogRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()
  const router = useRouter()

  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  // Load instances on mount
  useEffect(() => {
    loadInstances()
  }, [])

  // Check for setup query param on mount
  useEffect(() => {
    const setupParam = searchParams.get('setup')
    if (setupParam) {
      handleSetupClick(setupParam)
    }
  }, [searchParams])

  // Auto-scroll reconfigure log to bottom
  useEffect(() => {
    if (reconfigureLogRef.current) {
      reconfigureLogRef.current.scrollTop = reconfigureLogRef.current.scrollHeight
    }
  }, [reconfigureLog])

  const loadInstances = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/instances')
      const data = await response.json()
      const instanceList = data.instances || []
      setInstances(instanceList)

      // Load tunnel statuses for active, onboarded instances
      await loadTunnelStatuses(instanceList)
      await loadServiceStatuses(instanceList)
    } catch (error) {
      console.error('Failed to load instances:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTunnelStatuses = async (instanceList: Instance[]) => {
    const statuses: Record<string, 'connected' | 'disconnected'> = {}
    for (const inst of instanceList) {
      if (inst.status === 'active' && inst.onboardingCompleted) {
        try {
          const res = await fetch(`/api/instances/${inst.name}/tunnel`)
          const data = await res.json()
          statuses[inst.name] = data.active ? 'connected' : 'disconnected'
        } catch {
          statuses[inst.name] = 'disconnected'
        }
      }
    }
    setTunnelStatuses(statuses)
  }

  const loadServiceStatuses = async (instanceList: Instance[]) => {
    const statuses: Record<string, 'active' | 'inactive' | 'failed' | 'unknown'> = {}
    for (const inst of instanceList) {
      if (inst.status === 'active' && inst.onboardingCompleted) {
        try {
          const res = await fetch(`/api/instances/${inst.name}/service`)
          const data = await res.json()
          statuses[inst.name] = data.status || 'unknown'
        } catch {
          statuses[inst.name] = 'unknown'
        }
      }
    }
    setServiceStatuses(statuses)
  }

  const handleSetupClick = async (instanceName: string) => {
    try {
      setSetupLoading(true)
      setSetupInstance(instanceName)

      // Call the setup endpoint to start ttyd and SSH tunnel
      const response = await fetch(`/api/instances/${instanceName}/setup`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to start setup')
      }

      const data = await response.json()
      setSetupUrl(data.url)

      // Update URL without reloading
      router.push(`/instances?setup=${instanceName}`, { scroll: false })
    } catch (error) {
      console.error('Setup error:', error)
      addToast('Failed to start setup. Please try again.', 'error')
      setSetupInstance(null)
    } finally {
      setSetupLoading(false)
    }
  }

  const handleSetupComplete = async () => {
    if (!setupInstance) return

    try {
      // Call the complete endpoint
      const response = await fetch(`/api/instances/${setupInstance}/setup/complete`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.onboardingCompleted) {
        addToast('Setup completed successfully!', 'success')
      } else {
        addToast('Could not verify onboarding completion. Please check the remote server.', 'info')
      }

      // Clear setup state
      setSetupInstance(null)
      setSetupUrl(null)

      // Reload instances to show updated status
      await loadInstances()

      // Remove query param
      router.push('/instances', { scroll: false })
    } catch (error) {
      console.error('Complete error:', error)
      addToast('Failed to complete setup. The tunnel has been closed. You can run onboarding manually via SSH.', 'error')
      setSetupInstance(null)
      setSetupUrl(null)
    }
  }

  const handleDeleteClick = (instanceName: string) => {
    setInstanceToDelete(instanceName)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!instanceToDelete) return

    try {
      setDeletingInstance(instanceToDelete)
      setDeleteModalOpen(false)

      addToast(`Deleting instance "${instanceToDelete}"...`, 'info')

      const response = await fetch(`/api/instances/${instanceToDelete}/delete`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete instance')
      }

      addToast(`Instance "${instanceToDelete}" deleted successfully`, 'success')

      // Reload instances to show updated status
      await loadInstances()
    } catch (error) {
      console.error('Delete error:', error)
      addToast(
        `Failed to delete instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    } finally {
      setDeletingInstance(null)
      setInstanceToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setInstanceToDelete(null)
  }

  const handleTunnelToggle = async (instanceName: string) => {
    const currentStatus = tunnelStatuses[instanceName]

    if (currentStatus === 'connected') {
      // Disconnect
      setTunnelStatuses(prev => ({ ...prev, [instanceName]: 'disconnecting' }))
      try {
        await fetch(`/api/instances/${instanceName}/tunnel`, { method: 'DELETE' })
        setTunnelStatuses(prev => ({ ...prev, [instanceName]: 'disconnected' }))
        addToast(`Tunnel disconnected from ${instanceName}`, 'info')
      } catch (error) {
        setTunnelStatuses(prev => ({ ...prev, [instanceName]: 'connected' }))
        addToast('Failed to disconnect tunnel', 'error')
      }
    } else {
      // Connect
      setTunnelStatuses(prev => ({ ...prev, [instanceName]: 'connecting' }))
      try {
        const res = await fetch(`/api/instances/${instanceName}/tunnel`, { method: 'POST' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to start tunnel')
        }
        setTunnelStatuses(prev => ({ ...prev, [instanceName]: 'connected' }))
        addToast(`Gateway tunnel connected to ${instanceName} on port 18789`, 'success')
      } catch (error) {
        setTunnelStatuses(prev => ({ ...prev, [instanceName]: 'disconnected' }))
        addToast(
          `Failed to connect tunnel: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        )
      }
    }
  }

  const handleServiceToggle = async (instanceName: string) => {
    const currentStatus = serviceStatuses[instanceName]
    const action = currentStatus === 'active' ? 'stop' : 'start'

    // Optimistic: set to loading
    setServiceStatuses(prev => ({ ...prev, [instanceName]: 'loading' }))

    try {
      const res = await fetch(`/api/instances/${instanceName}/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${action} service`)
      }

      const data = await res.json()
      setServiceStatuses(prev => ({ ...prev, [instanceName]: data.status }))
      addToast(
        `OpenClaw service ${action === 'start' ? 'started' : 'stopped'} on ${instanceName}`,
        'success'
      )
    } catch (error) {
      // Revert to previous status on error
      setServiceStatuses(prev => ({ ...prev, [instanceName]: currentStatus || 'unknown' }))
      addToast(
        `Failed to ${action} service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    }
  }

  const handleReconfigureClick = async (instanceName: string) => {
    setReconfiguringInstance(instanceName)
    setReconfigureLog([])
    setReconfigureModalOpen(true)

    try {
      const response = await fetch(`/api/instances/${instanceName}/reconfigure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to start reconfiguration')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.message) {
                setReconfigureLog(prev => [...prev, data.message])
              }
            } catch {
              // Ignore parse errors
            }
          } else if (line.startsWith('event: success')) {
            addToast(`Reconfiguration completed successfully for ${instanceName}`, 'success')
          } else if (line.startsWith('event: error')) {
            addToast(`Reconfiguration failed for ${instanceName}`, 'error')
          }
        }
      }
    } catch (error) {
      console.error('Reconfigure error:', error)
      addToast(
        `Failed to reconfigure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    } finally {
      setReconfiguringInstance(null)
    }
  }

  // Show setup terminal if in setup mode
  if (setupInstance && setupUrl) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <SetupTerminal
            url={setupUrl}
            instanceName={setupInstance}
            onComplete={handleSetupComplete}
            onTunnelToggle={handleTunnelToggle}
            tunnelStatus={tunnelStatuses[setupInstance] || 'disconnected'}
          />
        </div>
      </div>
    )
  }

  // Show loading spinner while starting setup
  if (setupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent-purple animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Starting setup terminal...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Instances</h1>
              <p className="text-gray-400">
                Manage your RoboClaw VPS instances
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
              </div>
            )}

            {/* Empty State */}
            {!loading && instances.length === 0 && (
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-12 text-center">
                <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">No instances yet</h2>
                <p className="text-gray-400 mb-6">
                  Deploy your first RoboClaw instance to get started
                </p>
                <a
                  href="/deploy"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Deploy Instance
                </a>
              </div>
            )}

            {/* Instances Grid */}
            {!loading && instances.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instances.map((instance) => (
                  <InstanceCard
                    key={`${instance.name}-${instance.status}`}
                    instance={instance}
                    onSetupClick={handleSetupClick}
                    onDeleteClick={handleDeleteClick}
                    onTunnelToggle={handleTunnelToggle}
                    onReconfigureClick={handleReconfigureClick}
                    onServiceToggle={handleServiceToggle}
                    isDeleting={deletingInstance === instance.name}
                    tunnelStatus={tunnelStatuses[instance.name] || 'disconnected'}
                    serviceStatus={serviceStatuses[instance.name] || 'unknown'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Delete Instance"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-terminal-error/10 border border-terminal-error/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-terminal-error flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-2">
                Are you sure you want to delete &quot;{instanceToDelete}&quot;?
              </p>
              <p className="text-gray-400">This action cannot be undone.</p>
            </div>
          </div>

          <div className="text-sm text-gray-300 space-y-2">
            <p className="font-semibold">This will:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Delete the server from Hetzner Cloud</li>
              <li>Remove all data on the server</li>
              <li>Mark the instance artifact as deleted</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleDeleteCancel}
            >
              Cancel
            </Button>
            <button
              onClick={handleDeleteConfirm}
              className="flex-1 px-4 py-2 bg-terminal-error hover:bg-terminal-error/90 text-white rounded-lg font-semibold transition-colors"
            >
              Delete Instance
            </button>
          </div>
        </div>
      </Modal>

      {/* Reconfigure Modal */}
      <Modal
        isOpen={reconfigureModalOpen}
        onClose={() => {
          if (!reconfiguringInstance) {
            setReconfigureModalOpen(false)
            setReconfigureLog([])
          }
        }}
        title={`Reconfiguring ${reconfiguringInstance || ''}`}
      >
        <div className="space-y-4">
          {/* Log Output */}
          <div
            ref={reconfigureLogRef}
            className="bg-terminal-bg rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto"
          >
            {reconfigureLog.length === 0 ? (
              <div className="text-gray-400">Starting reconfiguration...</div>
            ) : (
              reconfigureLog.map((line, index) => (
                <div key={index} className="text-gray-300 whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
          </div>

          {/* Close Button */}
          {!reconfiguringInstance && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setReconfigureModalOpen(false)
                  setReconfigureLog([])
                }}
              >
                Close
              </Button>
            </div>
          )}

          {reconfiguringInstance && (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Reconfiguring...</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  )
}
