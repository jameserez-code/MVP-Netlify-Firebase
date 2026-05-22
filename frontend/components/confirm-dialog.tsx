'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '@/components/modal'
import Button from '@/components/button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  icon?: React.ReactNode
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        cancelRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onConfirm])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      actions={
        <>
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-passport-red/10">
          {icon || <AlertTriangle size={20} className="text-passport-red" />}
        </div>
        <div>
          <h3 className="text-base font-bold text-passport-text">{title}</h3>
          <p className="text-sm text-passport-muted mt-1">{description}</p>
        </div>
      </div>
    </Modal>
  )
}
