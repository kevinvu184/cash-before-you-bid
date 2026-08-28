// Fails the build when dist/ is over the mobile performance budget.
//
// CLAUDE.md has carried a page-weight budget since the repo started, and
// nothing measured it — which made it prose, not a budget. This reads the real
// build output, gzips it, and compares the totals to perf-budget.json. It is
// wired into the pull request workflow, so a change that puts the app over the
// line fails the pull request that introduces it rather than being discovered
// on a phone at an inspection.
//
// Gzip, not brotli: gzip is the floor every host and proxy supports, so it is
// the pessimistic number. GitHub Pages serves brotli where the client asks for
// it, and the real transfer is smaller than what this prints.
//
// Usage: npm run build && node scripts/check-bundle-size.mjs

import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync, appendFileSync } from 'node:fs'
import { dirname, join, posix, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DIST = join(ROOT, 'dist')
const KIB = 1024

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

function distFiles() {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
      const path = join(dir, item.name)
      return item.isDirectory() ? walk(path) : [path]
    })
  return walk(DIST).map((path) => relative(DIST, path).split(sep).join(posix.sep))
}

const gzipCache = new Map()
function gzipBytes(name) {
  if (!gzipCache.has(name)) {
    gzipCache.set(name, gzipSync(readFileSync(join(DIST, name)), { level: 9 }).length)
  }
  return gzipCache.get(name)
}

/**
 * The font files index.html asks the browser to preload. Read out of the built
 * HTML rather than listed here, so adding a preload puts it under the budget
 * automatically and removing one takes it back out.
 */
function preloadedFonts(files) {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  const links = html.match(/<link\b[^>]*\brel="preload"[^>]*>/g) ?? []
  const hrefs = links
    .filter((link) => /\bas="font"/.test(link))
    .map((link) => /\bhref="([^"]+)"/.exec(link)?.[1])
    .filter((href) => href !== undefined)

  return hrefs.map((href) => {
    // The href is base-prefixed (vite.config.ts sets a GitHub Pages base); the
    // tail after the base is the path inside dist/.
    const name = files.find((file) => href.endsWith(`/${file}`) || href === file)
    if (name === undefined) fail(`index.html preloads ${href}, which is not in dist/`)
    return name
  })
}

function selectFiles(budget, files) {
  if (budget.select === 'extension') return files.filter((file) => file.endsWith(budget.extension))
  if (budget.select === 'preloaded-fonts') return preloadedFonts(files)
  fail(`perf-budget.json: unknown select "${budget.select}" on "${budget.name}"`)
}

const kib = (bytes) => `${(bytes / KIB).toFixed(1)} KiB`

function main() {
  if (!statSync(DIST, { throwIfNoEntry: false })?.isDirectory()) {
    fail('No dist/ to measure. Run `npm run build` first.')
  }

  const { budgets } = JSON.parse(readFileSync(join(ROOT, 'perf-budget.json'), 'utf8'))
  const files = distFiles()
  const rows = []
  const over = []

  for (const budget of budgets) {
    const matched = selectFiles(budget, files)
    if (matched.length === 0) fail(`Budget "${budget.name}" matched no files in dist/.`)
    const total = matched.reduce((sum, file) => sum + gzipBytes(file), 0)
    const headroom = budget.maxGzipBytes - total
    if (headroom < 0) over.push(budget.name)
    rows.push({
      name: budget.name,
      count: matched.length,
      total,
      max: budget.maxGzipBytes,
      headroom,
      files: matched
        .map((file) => ({ file, bytes: gzipBytes(file) }))
        .sort((a, b) => b.bytes - a.bytes),
    })
  }

  const lines = []
  lines.push('| Budget | Files | Gzipped | Limit | Headroom |')
  lines.push('| --- | ---: | ---: | ---: | ---: |')
  for (const row of rows) {
    const verdict = row.headroom < 0 ? `**over by ${kib(-row.headroom)}**` : kib(row.headroom)
    lines.push(`| ${row.name} | ${row.count} | ${kib(row.total)} | ${kib(row.max)} | ${verdict} |`)
  }
  const table = lines.join('\n')

  console.log(`\nMobile performance budget — dist/, gzipped\n\n${table}\n`)
  for (const row of rows) {
    console.log(`  ${row.name}`)
    for (const { file, bytes } of row.files) {
      console.log(`    ${kib(bytes).padStart(10)}  ${file}`)
    }
  }

  // Every pull request shows the numbers, passing or failing; a budget nobody
  // reads until it breaks is most of the way back to being prose.
  if (process.env.GITHUB_STEP_SUMMARY) {
    const heading = over.length > 0 ? '### ❌ Over the mobile performance budget' : '### ✅ Within the mobile performance budget'
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${heading}\n\n${table}\n`)
  }

  if (over.length > 0) {
    fail(`Over budget: ${over.join(', ')}. See CLAUDE.md and perf-budget.json.`)
  }
  console.log('\n  Within budget.\n')
}

main()
