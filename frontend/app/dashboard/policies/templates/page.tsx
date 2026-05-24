'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import { useDebounce } from '@/lib/use-debounce'
import { listPolicyTemplates, createPolicyFromTemplate } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import PolicyTemplatePreview from '@/components/policy-template-preview'
import { SkeletonCard, PageLoader } from '@/components/loading'
import { useToast } from '@/components/toast'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutGrid,
  Shield,
  ArrowLeft,
  CheckCircle,
  Lock,
  BookOpen,
  Sparkles,
  User,
} from 'lucide-react'

interface TemplatePolicy {
  name: string
  allowedTools: string[]
  deniedTools: string[]
  allowedDomains?: string[]
  deniedDomains?: string[]
  piiDetection: boolean
  maxCost: number
}

interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: string
  policies: TemplatePolicy[]
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  'customer-support': 'Customer Support',
  'data-analysis': 'Data Analysis',
  'social-media': 'Social Media',
  'e-commerce': 'E-commerce',
  hr: 'HR',
  devops: 'DevOps',
  legal: 'Legal',
  research: 'Research',
  development: 'Development',
  compliance: 'Compliance',
}

const CATEGORY_ORDER = [
  'all',
  'customer-support',
  'data-analysis',
  'social-media',
  'e-commerce',
  'hr',
  'devops',
  'legal',
  'research',
  'development',
  'compliance',
]

function categoryIcon(category: string) {
  switch (category) {
    case 'customer-support': return <BookOpen size={14} />
    case 'data-analysis': return <LayoutGrid size={14} />
    case 'social-media': return <Sparkles size={14} />
    case 'e-commerce': return <LayoutGrid size={14} />
    case 'hr': return <User size={14} />
    case 'devops': return <Shield size={14} />
    case 'legal': return <BookOpen size={14} />
    case 'research': return <Search size={14} />
    case 'development': return <LayoutGrid size={14} />
    case 'compliance': return <CheckCircle size={14} />
    default: return <LayoutGrid size={14} />
  }
}

export default function TemplatesPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebounce(searchInput, 150)
  const [previewTemplate, setPreviewTemplate] = useState<PolicyTemplate | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR(
    ['/policies/templates', activeCategory, searchQuery],
    () => listPolicyTemplates({ category: activeCategory === 'all' ? undefined : activeCategory, search: searchQuery || undefined }),
    swrDashboardConfig
  )

  const templates: PolicyTemplate[] = useMemo(() => {
    if (!data) return []
    return Array.isArray(data) ? data : data?.data || []
  }, [data])

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category))
    return CATEGORY_ORDER.filter((c) => c === 'all' || cats.has(c))
  }, [templates])

  async function handleImport(template: PolicyTemplate) {
    setImportingId(template.id)
    try {
      await createPolicyFromTemplate({ templateId: template.id })
      addToast(`Imported "${template.name}" successfully`, 'success')
      setPreviewTemplate(null)
      router.push('/dashboard/policies')
    } catch (err: any) {
      addToast(err.message || 'Failed to import template', 'error')
    } finally {
      setImportingId(null)
    }
  }

  function handleCustomize(template: PolicyTemplate) {
    setPreviewTemplate(null)
    // Navigate to policies page with template pre-selected
    // We'll pass the template ID via query param or localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('passport_selected_template', JSON.stringify(template))
    }
    router.push('/dashboard/policies')
  }

  const filteredTemplates = useMemo(() => {
    let result = templates
    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s) ||
          t.category.toLowerCase().includes(s)
      )
    }
    return result
  }, [templates, activeCategory, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/policies"
            className="p-2 rounded-passport text-passport-dim hover:text-passport-text hover:bg-passport-surface-2 transition-colors"
            aria-label="Back to policies"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-passport-text">Policy Templates</h1>
            <p className="text-sm text-passport-muted mt-0.5">
              Pre-built policy configurations for common agent scenarios
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search templates..."
          className="input-field pl-9"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-passport text-xs font-mono transition-all border ${
              activeCategory === cat
                ? 'bg-passport-green/10 text-passport-green border-passport-green/30'
                : 'bg-passport-surface text-passport-muted border-passport-border hover:border-passport-border-2 hover:text-passport-text'
            }`}
          >
            {categoryIcon(cat)}
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <Shield size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{error.message || 'Failed to load templates'}</span>
        </div>
      )}

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No templates found"
          description={searchInput ? 'Try adjusting your search or category filter.' : 'No templates available.'}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, i) => {
            const policy = template.policies[0]
            const allowedCount = policy?.allowedTools?.length || 0
            const deniedCount = policy?.deniedTools?.length || 0
            return (
              <GlassCard key={template.id} delay={i * 0.05}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-passport-azure/10 text-passport-azure border border-passport-azure/20">
                          {template.category.replace(/-/g, ' ')}
                        </span>
                      </div>
                      <h3 className="font-semibold text-passport-text truncate">{template.name}</h3>
                    </div>
                    <div className="p-2 rounded-passport bg-passport-surface-2 shrink-0">
                      <Shield size={16} className="text-passport-green" />
                    </div>
                  </div>
                  <p className="text-sm text-passport-muted mb-4 flex-1">{template.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-passport-green/10 text-passport-green">
                      <CheckCircle size={10} />
                      {allowedCount} allowed
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-passport-coral/10 text-passport-coral">
                      <Lock size={10} />
                      {deniedCount} denied
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="btn-secondary flex-1 text-xs"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleImport(template)}
                      disabled={importingId === template.id}
                      className="btn-primary flex-1 text-xs disabled:opacity-50"
                    >
                      {importingId === template.id ? (
                        <span className="w-3 h-3 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                      ) : (
                        <Shield size={12} />
                      )}
                      Use Template
                    </button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      <PolicyTemplatePreview
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onImport={handleImport}
        onCustomize={handleCustomize}
      />
    </div>
  )
}
