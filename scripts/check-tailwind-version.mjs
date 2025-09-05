import { readFileSync, readdirSync } from 'fs'
import { execSync } from 'child_process'

function grep(dir, re, files = []) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${f.name}`
    if (f.isDirectory()) grep(p, re, files)
    else if (/\.(ts|tsx|js|jsx|css)$/.test(f.name)) {
      const txt = readFileSync(p, 'utf8')
      if (re.test(txt)) files.push(p)
    }
  }
  return files
}

const version = execSync('cd frontend-app && pnpm ls tailwindcss --depth=0').toString().trim()
const offenders = grep('./frontend-app', /(ring|bg|text|from|to)-opacity-\d+/)

console.log('Tailwind:', version || 'unknown')
console.log('Opacity offenders:', offenders.length)
offenders.forEach(f => console.log(' -', f))