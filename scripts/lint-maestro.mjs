#!/usr/bin/env node
/**
 * lint-maestro.mjs — Validation syntaxique des flows Maestro YANA.
 *
 * Maestro CLI n'est pas requis ici (binaire 50 MB + Java). On vérifie juste
 * que chaque .yaml dans `mobile/.maestro/` est parsable + multi-doc compatible
 * + pas de duplicate testID assertion qui ne peut pas exister dans le code.
 *
 * Usage : `node scripts/lint-maestro.mjs`
 * Exit 0 si tous OK, 1 sinon.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', 'mobile')
const MAESTRO_DIR = join(ROOT, '.maestro')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.yaml')) out.push(p)
  }
  return out
}

function extractTestIDs(repoRoot) {
  const ids = new Set()
  function walkSrc(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (name === 'node_modules' || name === '.expo') continue
      const stat = statSync(p)
      if (stat.isDirectory()) walkSrc(p)
      else if (/\.(tsx?|jsx?)$/.test(name)) {
        const src = readFileSync(p, 'utf8')
        const re = /testID=["']([^"']+)["']|tabBarButtonTestID:\s*["']([^"']+)["']/g
        let m
        while ((m = re.exec(src)) !== null) ids.add(m[1] ?? m[2])
      }
    }
  }
  walkSrc(join(repoRoot, 'app'))
  walkSrc(join(repoRoot, 'src'))
  return ids
}

const codeIDs = extractTestIDs(ROOT)
const flows = walk(MAESTRO_DIR).sort()
let ok = 0
let ko = 0
const missingIDs = new Set()

for (const f of flows) {
  try {
    const docs = yaml.loadAll(readFileSync(f, 'utf8'))
    // Collecte des `id:` référencés dans le flow.
    const flat = JSON.stringify(docs)
    const re = /"id":"([^"]+)"/g
    let m
    while ((m = re.exec(flat)) !== null) {
      // Les variables ${MAESTRO_*} et patterns OS ne sont pas des testIDs réels.
      const id = m[1]
      if (id.includes('${') || id.includes('*')) continue
      if (!codeIDs.has(id)) missingIDs.add(`${id} (in ${f.replace(ROOT + '/', '')})`)
    }
    console.log(`OK  ${f.replace(ROOT + '/', '')}`)
    ok++
  } catch (err) {
    console.error(`KO  ${f.replace(ROOT + '/', '')}: ${err.message}`)
    ko++
  }
}

console.log(`--- ${ok} flows OK, ${ko} KO ---`)
if (missingIDs.size > 0) {
  console.log(`\n⚠ testIDs référencés par Maestro mais absents du code :`)
  for (const id of [...missingIDs].sort()) console.log(`   - ${id}`)
  console.log('Si attendu (ex: tag externe), accept ; sinon ajouter le testID dans le composant.')
}

process.exit(ko === 0 ? 0 : 1)
