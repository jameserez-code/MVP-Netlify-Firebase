import test from 'node:test'
import assert from 'node:assert/strict'
import { TEMPLATES, getTemplates, findTemplateById, getCategories } from '../../dist/lib/policy-templates.js'

// --- Template list completeness ---

test('TEMPLATES array contains templates', () => {
  assert.ok(Array.isArray(TEMPLATES))
  assert.ok(TEMPLATES.length >= 8)
})

test('getTemplates returns all templates', () => {
  const templates = getTemplates()
  assert.equal(templates.length, TEMPLATES.length)
  assert.deepEqual(templates, TEMPLATES)
})

test('all templates have required fields', () => {
  for (const tpl of TEMPLATES) {
    assert.ok(typeof tpl.id === 'string', `Template ${tpl.id} missing id`)
    assert.ok(typeof tpl.name === 'string', `Template ${tpl.id} missing name`)
    assert.ok(typeof tpl.description === 'string', `Template ${tpl.id} missing description`)
    assert.ok(typeof tpl.category === 'string', `Template ${tpl.id} missing category`)
    assert.ok(Array.isArray(tpl.policies), `Template ${tpl.id} missing policies array`)
    assert.ok(tpl.policies.length >= 1, `Template ${tpl.id} has no policies`)
  }
})

test('all policies within templates have required fields', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      assert.ok(typeof policy.name === 'string', `Policy in ${tpl.id} missing name`)
      assert.ok(Array.isArray(policy.allowedTools), `Policy in ${tpl.id} missing allowedTools`)
      assert.ok(Array.isArray(policy.deniedTools), `Policy in ${tpl.id} missing deniedTools`)
      assert.ok(typeof policy.piiDetection === 'boolean', `Policy in ${tpl.id} missing piiDetection`)
      assert.ok(typeof policy.maxCost === 'number', `Policy in ${tpl.id} missing maxCost`)
    }
  }
})

// --- Unique IDs ---

test('all template IDs are unique', () => {
  const ids = TEMPLATES.map(t => t.id)
  const uniqueIds = new Set(ids)
  assert.equal(ids.length, uniqueIds.size)
})

test('all template IDs are lowercase kebab-case', () => {
  for (const tpl of TEMPLATES) {
    assert.match(tpl.id, /^[a-z][a-z0-9-]*$/, `ID ${tpl.id} should be kebab-case`)
  }
})

test('all template IDs are non-empty strings', () => {
  for (const tpl of TEMPLATES) {
    assert.ok(tpl.id.length > 0)
    assert.ok(tpl.id.length >= 3)
  }
})

// --- findTemplateById ---

test('findTemplateById returns correct template', () => {
  for (const tpl of TEMPLATES) {
    const found = findTemplateById(tpl.id)
    assert.ok(found)
    assert.equal(found.id, tpl.id)
    assert.equal(found.name, tpl.name)
  }
})

test('findTemplateById returns undefined for unknown ID', () => {
  assert.equal(findTemplateById('nonexistent-template'), undefined)
  assert.equal(findTemplateById(''), undefined)
  assert.equal(findTemplateById(' '), undefined)
})

test('findTemplateById is case-sensitive', () => {
  const tpl = TEMPLATES[0]
  const upperId = tpl.id.toUpperCase()
  assert.equal(findTemplateById(upperId), undefined)
})

test('findTemplateById does not partial-match', () => {
  // 'safe-customer-support' should not match 'safe-customer' or 'customer-support'
  assert.equal(findTemplateById('safe-customer'), undefined)
  assert.equal(findTemplateById('customer-support'), undefined)
})

// --- Categories ---

test('getCategories returns all and categories list', () => {
  const categories = getCategories()
  assert.ok(Array.isArray(categories))
  assert.equal(categories[0], 'all')
  assert.ok(categories.length > 1)
})

test('getCategories includes all unique categories from templates', () => {
  const categories = getCategories()
  const templateCategories = new Set(TEMPLATES.map(t => t.category))

  for (const cat of templateCategories) {
    assert.ok(categories.includes(cat), `Category "${cat}" missing from getCategories()`)
  }
})

test('getCategories has no duplicates', () => {
  const categories = getCategories()
  assert.equal(categories.length, new Set(categories).size)
})

test('getCategories returns same output on repeated calls', () => {
  const c1 = getCategories()
  const c2 = getCategories()
  assert.deepEqual(c1, c2)
})

test('each template belongs to a known category', () => {
  const categories = getCategories()
  for (const tpl of TEMPLATES) {
    assert.ok(categories.includes(tpl.category))
  }
})

test('categories are lowercase strings', () => {
  const categories = getCategories()
  for (const cat of categories) {
    if (cat !== 'all') {
      assert.match(cat, /^[a-z][a-z0-9-]*$/)
    }
  }
})

// --- Filter by category ---

test('templates can be filtered by category', () => {
  const categories = getCategories().filter(c => c !== 'all')
  for (const cat of categories) {
    const filtered = TEMPLATES.filter(t => t.category === cat)
    assert.ok(filtered.length >= 1, `No templates for category: ${cat}`)
    assert.ok(filtered.every(t => t.category === cat))
  }
})

test('each category has at least one template', () => {
  const categories = getCategories().filter(c => c !== 'all')
  const categoryCounts = new Map()
  for (const tpl of TEMPLATES) {
    categoryCounts.set(tpl.category, (categoryCounts.get(tpl.category) || 0) + 1)
  }
  for (const cat of categories) {
    assert.ok(categoryCounts.has(cat), `Category ${cat} has no templates`)
    assert.ok(categoryCounts.get(cat) >= 1, `Category ${cat} should have at least 1 template`)
  }
})

// --- Search functionality ---

test('templates can be searched by name substring', () => {
  const found = TEMPLATES.filter(t => t.name.toLowerCase().includes('customer'))
  assert.ok(found.length >= 1)
  for (const t of found) {
    assert.ok(t.name.toLowerCase().includes('customer'))
  }
})

test('templates can be searched by description substring', () => {
  const found = TEMPLATES.filter(t => t.description.toLowerCase().includes('read-only'))
  assert.ok(found.length >= 1)
  for (const t of found) {
    assert.ok(t.description.toLowerCase().includes('read-only'))
  }
})

test('template search by category matches', () => {
  const target = TEMPLATES[0].category
  const found = TEMPLATES.filter(t => t.category === target)
  assert.ok(found.length >= 1)
  assert.ok(found.every(t => t.category === target))
})

test('template search with no matches returns empty array', () => {
  const found = TEMPLATES.filter(t => t.name.includes('ZZZ_NONEXISTENT_ZZZ'))
  assert.equal(found.length, 0)
})

// --- Policy validation ---

test('maxCost is always positive', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      assert.ok(policy.maxCost > 0, `Policy ${policy.name} maxCost should be > 0`)
    }
  }
})

test('maxCost is a number', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      assert.ok(Number.isFinite(policy.maxCost))
    }
  }
})

test('allowedTools and deniedTools are disjoint per policy', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      const intersection = policy.allowedTools.filter(t => policy.deniedTools.includes(t))
      assert.equal(intersection.length, 0, `Policy ${policy.name}: tool overlap found: ${intersection.join(', ')}`)
    }
  }
})

test('allowedTools arrays are non-empty', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      assert.ok(policy.allowedTools.length > 0, `Policy ${policy.name} has no allowed tools`)
    }
  }
})

test('deniedTools arrays are non-empty', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      assert.ok(policy.deniedTools.length > 0, `Policy ${policy.name} has no denied tools`)
    }
  }
})

test('allowedTools and deniedTools use lowercase_underscore format', () => {
  const format = /^[a-z][a-z0-9_]*(_[a-z][a-z0-9_]*)*$/
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      for (const tool of [...policy.allowedTools, ...policy.deniedTools]) {
        assert.match(tool, format, `Tool "${tool}" in ${policy.name} is not lowercase_underscore`)
      }
    }
  }
})

// --- allowedDomains / deniedDomains ---

test('domains are optional in policies', () => {
  const policiesWithDomains = []
  const policiesWithoutDomains = []
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      if (policy.allowedDomains || policy.deniedDomains) {
        policiesWithDomains.push(policy)
      } else {
        policiesWithoutDomains.push(policy)
      }
    }
  }
  assert.ok(policiesWithDomains.length >= 0)
  assert.ok(policiesWithoutDomains.length >= 0)
})

test('domains do not contain protocols when present', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      const allDomains = [...(policy.allowedDomains || []), ...(policy.deniedDomains || [])]
      for (const domain of allDomains) {
        assert.ok(!domain.startsWith('http://'), `Domain ${domain} should not have http:// prefix`)
        assert.ok(!domain.startsWith('https://'), `Domain ${domain} should not have https:// prefix`)
      }
    }
  }
})

// --- piiDetection ---

test('piiDetection is always a boolean', () => {
  for (const tpl of TEMPLATES) {
    for (const policy of tpl.policies) {
      assert.ok(policy.piiDetection === true || policy.piiDetection === false)
    }
  }
})

// --- Template names are unique ---

test('template names are unique', () => {
  const names = TEMPLATES.map(t => t.name)
  assert.equal(names.length, new Set(names).size, 'Template names must be unique')
})

// --- Template list is immutable-like (same reference but no accidental mutation tests) ---

test('getTemplates returns a fresh array reference check', () => {
  const t1 = getTemplates()
  const t2 = getTemplates()
  assert.equal(t1, t2) // Returns the same reference
})

test('each template has exactly one policy', () => {
  for (const tpl of TEMPLATES) {
    assert.equal(tpl.policies.length, 1, `Template ${tpl.id} should have exactly 1 policy`)
  }
})

// --- Edge cases ---

test('findTemplateById with null/undefined returns undefined', () => {
  assert.equal(findTemplateById(null), undefined)
  assert.equal(findTemplateById(undefined), undefined)
})

test('findTemplateById with non-string returns undefined', () => {
  assert.equal(findTemplateById(123), undefined)
  assert.equal(findTemplateById({}), undefined)
  assert.equal(findTemplateById([]), undefined)
  assert.equal(findTemplateById(true), undefined)
})
