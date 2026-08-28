// Resolver hook so `node --test` can run the TypeScript sources directly
// (Node 24 strips types natively) while still honouring this project's
// `@/*` -> `src/*` path alias and extensionless relative imports.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const EXt = ['.ts', '.tsx', '.mts', '.js', '.mjs'];

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if (spec === '@' || spec.startsWith('@/')) {
    spec = pathToFileURL(path.join(root, 'src', spec.slice(2))).href;
  }
  try {
    return await nextResolve(spec, context);
  } catch (err) {
    if (!/\.[a-z0-9]+$/i.test(spec)) {
      for (const ext of EXt) {
        try {
          return await nextResolve(spec + ext, context);
        } catch { /* try next */ }
      }
      for (const ext of EXt) {
        try {
          return await nextResolve(spec.replace(/\/?$/, '/index') + ext, context);
        } catch { /* try next */ }
      }
    }
    throw err;
  }
}
