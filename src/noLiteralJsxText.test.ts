import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// Every user-facing string must go through t(). This walks the real TypeScript
// AST of every component file and fails on any JSX text node (or literal
// string/template passed as a JSX expression child) that contains letters —
// punctuation and symbols like the disclosure "+"/"−" are allowed.

const SRC = dirname(fileURLToPath(import.meta.url))

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return tsxFiles(path)
    if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) return [path]
    return []
  })
}

const HAS_LETTER = /\p{L}/u

function literalJsxText(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const offences: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && HAS_LETTER.test(node.text)) {
      offences.push(node.text.trim())
    }
    // {'literal'} or {`literal`} directly as a JSX child is a literal too.
    if (
      ts.isJsxExpression(node) &&
      node.expression !== undefined &&
      (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression)) &&
      HAS_LETTER.test(node.expression.text) &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      offences.push(node.expression.text.trim())
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return offences
}

describe('no hardcoded strings in JSX', () => {
  it('finds no literal text in JSX text position in any component file', () => {
    const offenders: Record<string, string[]> = {}
    for (const file of tsxFiles(SRC)) {
      const found = literalJsxText(file)
      if (found.length > 0) offenders[file.slice(SRC.length + 1)] = found
    }
    expect(offenders).toEqual({})
  })
})
