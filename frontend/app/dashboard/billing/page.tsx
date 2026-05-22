'use client'

import useSWR from 'swr'
import { useState } from 'react'
import {
  getSubscription,
  getUsage,
  createCheckoutSession,
  createPortalSession,
  getInvoices,
  cancelSubscription,
} from '@/lib/api'
import { swrDashboardConfig } from '@/lib/swr-config'
import GlassCard from '@/components/glass-card'
import { useToast } from '@/components/toast'
import {
  CreditCard,
  Zap,
  Check,
  Loader2,
  Receipt,
  AlertTriangle,
} from 'lucide-react'

export default function BillingPage() {
  const { addToast } = useToast()
  const { data: sub, error: subError, isLoading: subLoading, mutate: mutateSub } = useSWR(
    '/billing/subscription',
    getSubscription,
    swrDashboardConfig
  )
  const { data: usage, error: usageError } = useSWR('/billing/usage', getUsage, swrDashboardConfig)
  const { data: invoices, error: invoicesError } = useSWR('/billing/invoices', getInvoices, swrDashboardConfig)

  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingCancel, setLoadingCancel] = useState(false)

  const plan = (sub?.plan as string) || 'free'
  const percent = usage ? Math.min(100, Math.round((usage.count / usage.limit) * 100)) : 0

  const billingError = subError?.message || usageError?.message || invoicesError?.message || ''

  async function handleUpgrade() {
    setLoadingCheckout(true)
    try {
      const { url } = await createCheckoutSession('pro')
      if (url) window.location.href = url
    } catch (e: any) {
      addToast(e.message || 'Checkout failed', 'error')
    } finally {
      setLoadingCheckout(false)
    }
  }

  async function handlePortal() {
    setLoadingPortal(true)
    try {
      const { url } = await createPortalSession()
      if (url) window.location.href = url
    } catch (e: any) {
      addToast(e.message || 'Could not open portal', 'error')
    } finally {
      setLoadingPortal(false)
    }
  }

  async function handleCancel() {
    if (
      !confirm(
        'Are you sure you want to cancel? You will keep Pro access until the end of your billing period.'
      )
    )
      return
    setLoadingCancel(true)
    try {
      await cancelSubscription()
      addToast('Subscription canceled', 'success')
      mutateSub()
    } catch (e: any) {
      addToast(e.message || 'Cancel failed', 'error')
    } finally {
      setLoadingCancel(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-passport-text">Billing</h1>

      {billingError && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{billingError}</span>
          <button onClick={() => mutateSub()} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Current Plan */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={18} className="text-passport-green" />
          <h2 className="text-lg font-semibold text-passport-text">Current Plan</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-passport-text capitalize">
              {plan} Plan
            </div>
            <div className="text-sm text-passport-muted mt-1">
              {plan === 'free'
                ? '3 agents · 100 enforcements/day'
                : 'Unlimited agents · 10K enforcements/day'}
            </div>
          </div>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded ${
              sub?.status === 'active'
                ? 'bg-passport-green/10 text-passport-green'
                : 'bg-passport-amber/10 text-passport-amber'
            }`}
          >
            {sub?.status || 'active'}
          </span>
        </div>

        {/* Usage bar */}
        {usage && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-passport-muted">Enforcements today</span>
              <span className="font-mono text-passport-text">
                {usage.count} / {usage.limit}
              </span>
            </div>
            <div className="h-2 w-full bg-passport-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  percent > 80 ? 'bg-passport-amber' : 'bg-passport-green'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {percent > 80 && plan === 'free' && (
              <div className="mt-2 text-xs text-passport-amber flex items-center gap-1">
                <AlertTriangle size={12} />
                You are approaching your daily limit.
                <button
                  onClick={handleUpgrade}
                  className="underline hover:no-underline"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Upgrade */}
      {plan === 'free' && (
        <GlassCard className="border-passport-green/30">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-passport-green" />
            <h2 className="text-lg font-semibold text-passport-text">
              Upgrade to Pro
            </h2>
          </div>
          <ul className="space-y-2 mb-6">
            {[
              'Unlimited agents',
              '10,000 enforcements/day',
              'Advanced policies + webhooks',
              'Team members',
              'Priority email support',
            ].map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 text-sm text-passport-muted"
              >
                <Check size={14} className="text-passport-green shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loadingCheckout}
            className="btn-primary w-full"
          >
            {loadingCheckout ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Upgrade to Pro — $29/month'
            )}
          </button>
        </GlassCard>
      )}

      {/* Manage */}
      {plan === 'pro' && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-passport-green" />
            <h2 className="text-lg font-semibold text-passport-text">
              Manage Subscription
            </h2>
          </div>
          <div className="space-y-3">
            <button
              onClick={handlePortal}
              disabled={loadingPortal}
              className="btn-secondary w-full"
            >
              {loadingPortal ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Manage Subscription'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={loadingCancel}
              className="btn-danger w-full"
            >
              {loadingCancel ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Cancel Subscription'
              )}
            </button>
          </div>
          {sub?.currentPeriodEnd && (
            <div className="mt-4 text-xs text-passport-muted">
              Current period ends:{" "}
              {new Date(sub.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
        </GlassCard>
      )}

      {/* Invoices */}
      {invoices && invoices.invoices?.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={18} className="text-passport-azure" />
            <h2 className="text-lg font-semibold text-passport-text">
              Invoice History
            </h2>
          </div>
          <div className="space-y-2">
            {invoices.invoices.map((inv: any) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-passport bg-passport-bg border border-passport-border"
              >
                <div>
                  <div className="text-sm text-passport-text font-medium">
                    {inv.number || inv.id}
                  </div>
                  <div className="text-xs text-passport-muted">
                    ${(inv.amount_due / 100).toFixed(2)} · {inv.status}
                  </div>
                </div>
                {inv.pdf && (
                  <a
                    href={inv.pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-passport-azure underline hover:no-underline"
                  >
                    PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
