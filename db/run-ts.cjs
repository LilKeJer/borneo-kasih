const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  resolveJsonModule: true,
  skipLibCheck: true,
};

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions,
    fileName: filename,
    reportDiagnostics: false,
  });

  module._compile(outputText, filename);
};

const entry = process.argv[2];

if (!entry) {
  console.error("Usage: node ./db/run-ts.cjs <path-to-ts-file>");
  process.exit(1);
}

const entryPath = path.isAbsolute(entry)
  ? entry
  : path.resolve(process.cwd(), entry);

require(entryPath);
