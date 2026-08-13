import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const candidates = [
  join(root, 'node_modules/typescript/lib/typescript.js'),
  'C:/Program Files/Microsoft VS Code/resources/app/extensions/node_modules/typescript/lib/typescript.js',
]
const typescriptPath = candidates.find(existsSync)
if (!typescriptPath) {
  throw new Error('TypeScript runtime is unavailable. Run npm ci first.')
}

const require = createRequire(import.meta.url)
const ts = require(typescriptPath)
const files = [
  'tests/types/editor-stubs.d.ts',
  'src/components/content-manager.tsx',
  'src/lib/github-editor.ts',
  'src/lib/content-formats.ts',
].map((file) => join(root, file))
const options = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  noEmit: true,
  baseUrl: root,
  paths: { '@/*': ['src/*'] },
  skipLibCheck: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
}
const program = ts.createProgram(files, options, ts.createCompilerHost(options))
const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)

for (const diagnostic of diagnostics) {
  const position =
    diagnostic.file && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : null
  const location = diagnostic.file
    ? `${relative(root, diagnostic.file.fileName)}${
        position ? `:${position.line + 1}:${position.character + 1}` : ''
      }`
    : 'TypeScript'
  console.error(
    `${location} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`,
  )
}

if (diagnostics.length) process.exit(1)
console.log('Editor TypeScript check passed')
