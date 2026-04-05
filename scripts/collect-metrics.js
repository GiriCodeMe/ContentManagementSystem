#!/usr/bin/env node
/**
 * collect-metrics.js — SDLC Performance Matrix collector for cms.
 * Writes metrics/AIKPI.json consumed by ai-sdlc-dashboard.
 *
 * Run inside the publish-metrics CI job after all gates have executed.
 * Requires: GITHUB_TOKEN, GITHUB_RUN_ID, GATE_BUILD, GATE_FORMAT,
 *           GATE_UNIT, GATE_E2E, GATE_A11Y, GATE_VULN
 *
 * Run from the ContentManagementSystem root directory.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.warn(`  [readJson] ${filePath}: ${err.message}`)
    return null
  }
}

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  } catch {
    return null
  }
}

async function fetchGitHub(apiPath, token) {
  const url = `https://api.github.com${apiPath}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) return null
  return res.json()
}

function isoWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

const mock = (value, unit, source = 'mock') => ({ value, unit, source, is_mock: true })
const live = (value, unit, source) => ({ value, unit, source, is_mock: false })
const gateOutcome = env => (process.env[env] === 'success' ? 'pass' : 'fail')

// ── Environment ───────────────────────────────────────────────────────────────

const GITHUB_TOKEN   = process.env.GITHUB_TOKEN  || ''
const GITHUB_RUN_ID  = process.env.GITHUB_RUN_ID || 'local'
const OWNER          = process.env.GITHUB_REPOSITORY_OWNER || 'GiriCodeMe'
const REPO_NAME      = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/')[1]
  : 'ContentManagementSystem'
const DASHBOARD_REPO = 'GiriCodeMe/ai-sdlc-dashboard'
const DASHBOARD_PATH = 'metrics/cms/AIKPI.json'

// ── Collectors ────────────────────────────────────────────────────────────────

function collectUnitTests() {
  // artifacts are downloaded to client/ subdir in CI
  const summary = readJson('client/coverage/coverage-summary.json')
  const results = readJson('client/test-results/vitest-results.json')
  const cov = summary?.total ?? {}
  return {
    total:               results?.numTotalTests  != null ? live(results.numTotalTests,  'count', 'vitest-results.json') : mock(0, 'count'),
    passed:              results?.numPassedTests != null ? live(results.numPassedTests, 'count', 'vitest-results.json') : mock(0, 'count'),
    failed:              results?.numFailedTests != null ? live(results.numFailedTests, 'count', 'vitest-results.json') : mock(0, 'count'),
    coverage_lines:      cov.lines?.pct      != null ? live(cov.lines.pct,      'percent', 'coverage-summary.json') : mock(0, 'percent'),
    coverage_branches:   cov.branches?.pct   != null ? live(cov.branches.pct,   'percent', 'coverage-summary.json') : mock(0, 'percent'),
    coverage_functions:  cov.functions?.pct  != null ? live(cov.functions.pct,  'percent', 'coverage-summary.json') : mock(0, 'percent'),
    coverage_statements: cov.statements?.pct != null ? live(cov.statements.pct, 'percent', 'coverage-summary.json') : mock(0, 'percent'),
  }
}

function collectE2eTests() {
  const results = readJson('client/test-results/playwright-results.json')
  const stats = results?.stats ?? {}
  const passed = stats.expected   ?? null
  const failed = stats.unexpected ?? null
  const total  = passed !== null && failed !== null ? passed + failed + (stats.skipped ?? 0) : null
  return {
    total:  total  !== null ? live(total,  'count', 'playwright-results.json') : mock(0, 'count'),
    passed: passed !== null ? live(passed, 'count', 'playwright-results.json') : mock(0, 'count'),
    failed: failed !== null ? live(failed, 'count', 'playwright-results.json') : mock(0, 'count'),
  }
}

function collectA11yTests() {
  const results = readJson('client/test-results/a11y-results.json')
  const stats = results?.stats ?? {}
  const passed = stats.expected   ?? null
  const failed = stats.unexpected ?? null
  const total  = passed !== null && failed !== null ? passed + failed + (stats.skipped ?? 0) : null
  return {
    total:      total  !== null ? live(total,  'count', 'a11y-results.json') : mock(0, 'count'),
    passed:     passed !== null ? live(passed, 'count', 'a11y-results.json') : mock(0, 'count'),
    failed:     failed !== null ? live(failed, 'count', 'a11y-results.json') : mock(0, 'count'),
    violations: mock(0, 'count', 'axe-core'),
  }
}

function collectVulnCheck() {
  let raw = null
  try {
    raw = execSync('cd client && npm audit --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  } catch (err) {
    raw = err.stdout ?? null
  }
  if (!raw) return { total: mock(0, 'count', 'npm audit unavailable'), gate: gateOutcome('GATE_VULN') }
  try {
    const audit = JSON.parse(raw)
    const vulns = audit.metadata?.vulnerabilities ?? {}
    const total = (vulns.moderate ?? 0) + (vulns.high ?? 0) + (vulns.critical ?? 0)
    return {
      total:    live(total,              'count', 'npm audit --json'),
      moderate: live(vulns.moderate ?? 0, 'count', 'npm audit --json'),
      high:     live(vulns.high     ?? 0, 'count', 'npm audit --json'),
      critical: live(vulns.critical ?? 0, 'count', 'npm audit --json'),
      gate:     gateOutcome('GATE_VULN'),
    }
  } catch {
    return { total: mock(0, 'count', 'npm audit parse error'), gate: gateOutcome('GATE_VULN') }
  }
}

function collectAiCommitRatio() {
  const totalOut = safeExec('git log --oneline')
  const aiOut    = safeExec('git log --oneline --grep="Co-Authored-By: Claude"')
  if (!totalOut) return null
  const total = totalOut.trim().split('\n').filter(Boolean).length
  const ai    = aiOut ? aiOut.trim().split('\n').filter(Boolean).length : 0
  return { ratio: total > 0 ? Math.round((ai / total) * 100) : 0, ai_commits: ai, total_commits: total }
}

function countComplexModules() {
  // Count JSX/JS components > 100 lines in client/src/components
  const dirs = ['client/src/components', 'client/src/pages']
  let complexCount = 0, totalLines = 0
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8')
      const lines = content.split('\n').length
      totalLines += lines
      if (lines > 100) complexCount++
    }
  }
  return { count: complexCount, totalLines }
}

async function collectPrCycleTime(token) {
  const prs = await fetchGitHub(`/repos/${OWNER}/${REPO_NAME}/pulls?state=closed&per_page=30`, token)
  if (!prs || prs.length === 0) return mock(0, 'hours', 'no closed PRs')
  const hours = prs.filter(pr => pr.merged_at)
    .map(pr => (new Date(pr.merged_at) - new Date(pr.created_at)) / 3_600_000)
  if (hours.length === 0) return mock(0, 'hours', 'no merged PRs')
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length
  return live(parseFloat(avg.toFixed(1)), 'hours', 'github-api-pulls')
}

async function collectActivity(token) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [commits, prs] = await Promise.all([
    fetchGitHub(`/repos/${OWNER}/${REPO_NAME}/commits?since=${since}&per_page=100`, token),
    fetchGitHub(`/repos/${OWNER}/${REPO_NAME}/pulls?state=all&per_page=100`, token),
  ])
  return {
    commits_last_30d: live(Array.isArray(commits) ? commits.length : 0, 'count', 'github-api-commits'),
    prs_last_30d:     live(Array.isArray(prs)     ? prs.length     : 0, 'count', 'github-api-pulls'),
  }
}

async function fetchExistingSeries(token) {
  const res = await fetchGitHub(`/repos/${DASHBOARD_REPO}/contents/${DASHBOARD_PATH}`, token)
  if (!res?.content) return { heatmap_series: [], dual_axis_series: [] }
  try {
    const existing = JSON.parse(Buffer.from(res.content, 'base64').toString('utf8'))
    return {
      heatmap_series:   Array.isArray(existing.heatmap_series)   ? existing.heatmap_series   : [],
      dual_axis_series: Array.isArray(existing.dual_axis_series) ? existing.dual_axis_series : [],
    }
  } catch {
    return { heatmap_series: [], dual_axis_series: [] }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const now    = new Date()
  const sprint = isoWeek(now)

  console.log('Collecting CMS SDLC metrics...')

  const unitTests  = collectUnitTests()
  const e2eTests   = collectE2eTests()
  const a11yTests  = collectA11yTests()
  const vuln       = collectVulnCheck()
  const aiCommit   = collectAiCommitRatio()
  const { count: complexModules, totalLines } = countComplexModules()

  const prCycleTime = await collectPrCycleTime(GITHUB_TOKEN)
  const activity    = await collectActivity(GITHUB_TOKEN)
  const { heatmap_series, dual_axis_series } = await fetchExistingSeries(GITHUB_TOKEN)

  const AI_COMMIT_RATIO   = aiCommit?.ratio        ?? 0
  const AI_COMMITS_TOTAL  = aiCommit?.ai_commits   ?? 0
  const ALL_COMMITS_TOTAL = aiCommit?.total_commits ?? 0

  // Mock constants (replace when real APIs available)
  const AI_ACCEPTANCE_RATE     = 72   // mock — Copilot API
  const BOILERPLATE_REDUCTION  = 38   // mock — % lines AI-generated
  const FLOW_EFFICIENCY        = 0.70  // mock — VA/total time (high: greenfield CMS)
  const AI_CHANGE_FAILURE_RATE = 1.5   // mock — DORA AI-induced failures %
  const SECURITY_REMEDIATION   = 2.8   // mock — hours to resolve AI-flagged vuln
  const UNIT_COST_PER_FEATURE  = 7.20  // mock — USD
  const TOKEN_ROI              = 11.2  // mock — X return per token $
  const LABOR_ARBITRAGE_VALUE  = 1800  // mock — USD/month saved

  const high_ai_usage     = AI_ACCEPTANCE_RATE >= 70
  const high_failure_rate = AI_CHANGE_FAILURE_RATE >= 5.0
  const ratio             = totalLines > 0 ? complexModules / totalLines : 0
  const low_orchestration = ratio < 0.005
  const retention_flagged = high_ai_usage && (high_failure_rate || low_orchestration)

  const newHeatmapEntry = {
    project: 'cms',
    sprint,
    ai_acceptance_rate:   AI_ACCEPTANCE_RATE,
    technical_debt_ratio: 0.04, // mock
  }
  const newDualAxisEntry = {
    sprint,
    pr_cycle_time_hours:        typeof prCycleTime.value === 'number' ? prCycleTime.value : 0,
    ai_induced_vulnerabilities: AI_CHANGE_FAILURE_RATE,
  }
  const updatedHeatmap  = [...heatmap_series.filter(e => !(e.project === 'cms' && e.sprint === sprint)), newHeatmapEntry]
  const updatedDualAxis = [...dual_axis_series.filter(e => e.sprint !== sprint), newDualAxisEntry]

  const metrics = {
    meta: {
      project:        'cms',
      repo:           `${OWNER}/${REPO_NAME}`,
      collected_at:   now.toISOString(),
      ci_run_id:      GITHUB_RUN_ID,
      schema_version: '1.1.0',
    },

    tier1_input: {
      ai_acceptance_rate:    mock(AI_ACCEPTANCE_RATE,    'percent', 'copilot-api'),
      boilerplate_reduction: mock(BOILERPLATE_REDUCTION, 'percent', 'copilot-api'),
      ai_commit_ratio: {
        value: AI_COMMIT_RATIO, unit: 'percent',
        source: 'git-log-co-authored-by', is_mock: false,
        ai_commits: AI_COMMITS_TOTAL, total_commits: ALL_COMMITS_TOTAL,
      },
    },

    tier2_process: {
      pr_cycle_time:   prCycleTime,
      flow_efficiency: mock(FLOW_EFFICIENCY, 'ratio', 'linearb-api'),
    },

    tier3_output: {
      ai_change_failure_rate:     mock(AI_CHANGE_FAILURE_RATE, 'percent', 'dora-api'),
      security_remediation_speed: mock(SECURITY_REMEDIATION,   'hours',   'snyk-api'),
    },

    tier4_value: {
      unit_cost_per_feature: mock(UNIT_COST_PER_FEATURE, 'USD',       'manual-estimate'),
      token_roi:             mock(TOKEN_ROI,             'ratio',     'manual-estimate'),
      labor_arbitrage_value: mock(LABOR_ARBITRAGE_VALUE, 'USD/month', 'manual-estimate'),
    },

    space_framework: {
      satisfaction:  mock(4.4, 'score-5', 'survey'),
      performance:   mock(82,  'percent', 'dora'),
      activity: {
        commits_last_30d: activity.commits_last_30d,
        prs_last_30d:     activity.prs_last_30d,
      },
      communication: mock(4.1, 'score-5', 'survey'),
      efficiency:    mock(0.78, 'ratio', 'manual-estimate'),
    },

    orchestration_value: {
      complex_modules_managed: live(complexModules, 'count', 'fs.readdirSync(client/src/components)'),
      manual_lines_written:    live(totalLines,     'count', 'fs.readdirSync(client/src/components)'),
      ratio:                   live(ratio,          'ratio', 'derived'),
    },

    retention_risk: {
      flagged: retention_flagged,
      evaluation: {
        high_ai_usage:           { value: high_ai_usage,     threshold: '>=70% acceptance' },
        high_failure_rate:       { value: high_failure_rate, threshold: '>=5% failure rate' },
        low_orchestration_value: { value: low_orchestration, threshold: '<0.005 ratio' },
      },
    },

    ci_native: {
      build_status: {
        value: process.env.GATE_BUILD === 'success' ? 'pass' : 'fail',
        unit: 'status', source: 'github-actions', is_mock: false,
      },
      unit_tests:  unitTests,
      e2e_tests:   e2eTests,
      a11y_tests:  a11yTests,
      lint_errors: {
        value:   process.env.GATE_FORMAT === 'success' ? 0 : -1,
        unit: 'count', source: 'prettier', is_mock: false,
      },
      vuln_check: vuln,
      lighthouse: mock(null, 'score', 'not-configured'),
    },

    heatmap_series:   updatedHeatmap,
    dual_axis_series: updatedDualAxis,
  }

  fs.mkdirSync('metrics', { recursive: true })
  fs.writeFileSync('metrics/AIKPI.json', JSON.stringify(metrics, null, 2))
  console.log('metrics/AIKPI.json written successfully')
  console.log(`  Sprint           : ${sprint}`)
  console.log(`  AI commit ratio  : ${AI_COMMIT_RATIO}% (${AI_COMMITS_TOTAL}/${ALL_COMMITS_TOTAL} commits)`)
  console.log(`  Complex modules  : ${complexModules} (of ${totalLines} lines)`)
  console.log(`  Retention flagged: ${retention_flagged}`)
}

main().catch(err => {
  console.error('collect-metrics.js failed:', err)
  process.exit(1)
})
