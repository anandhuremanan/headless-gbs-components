/*
 * Lets a CommonJS tool `require()` the library's TypeScript directly.
 *
 * The evaluation harness has to run the *real* runtime — the same contract
 * emitter, the same validator, the same coercion — because a harness that
 * reimplements any of that is measuring itself. The runtime is TypeScript and
 * the harness is a CLI, so something has to bridge them.
 *
 * Three options were available: add a loader dependency (tsx, jiti), compile
 * to a build directory, or transpile on demand with the compiler that is
 * already a devDependency for the passport generator. The third adds nothing
 * to install and nothing to keep in sync, so that is this file.
 *
 * Transpile-only, like `isolatedModules`: no type checking happens here. That
 * is fine — `tsc --noEmit` and the test suite do the checking, and doing it
 * twice would only make the CLI slow.
 */

const fs = require("fs");
const path = require("path");
const Module = require("module");

let registered = false;

/** Resolve the same way a bundler would: bare path, then `.ts`, then `/index.ts`. */
function resolveTs(request, parent) {
  if (!request.startsWith(".") && !path.isAbsolute(request)) return null;
  const base = path.resolve(path.dirname(parent?.filename ?? process.cwd()), request);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function register() {
  if (registered) return;
  registered = true;

  let ts;
  try {
    ts = require("typescript");
  } catch {
    throw new Error(
      "The evaluation harness needs the TypeScript compiler to load the runtime. " +
        "Run `npm install` at the repository root.",
    );
  }

  const compile = (module_, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        isolatedModules: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    module_._compile(outputText, filename);
  };

  Module._extensions[".ts"] = compile;
  Module._extensions[".tsx"] = compile;

  const resolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, ...rest) {
    try {
      return resolveFilename.call(this, request, parent, ...rest);
    } catch (error) {
      const found = resolveTs(request, parent);
      if (found) return found;
      throw error;
    }
  };
}

module.exports = { register };
