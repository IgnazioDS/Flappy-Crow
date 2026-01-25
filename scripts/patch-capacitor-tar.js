import fs from 'node:fs'
import path from 'node:path'

const target = path.join(
  process.cwd(),
  'node_modules',
  '@capacitor',
  'cli',
  'dist',
  'util',
  'template.js',
)

if (!fs.existsSync(target)) {
  process.exit(0)
}

const source = fs.readFileSync(target, 'utf8')
const needle = 'tar_1.default.extract({ file: src, cwd: dir });'
const replacement = '(tar_1.default ?? tar_1).extract({ file: src, cwd: dir });'

if (source.includes(replacement)) {
  process.exit(0)
}

if (!source.includes(needle)) {
  console.warn('patch-capacitor-tar: pattern not found')
  process.exit(0)
}

const updated = source.replace(needle, replacement)
fs.writeFileSync(target, updated, 'utf8')
console.info('patch-capacitor-tar: applied')
