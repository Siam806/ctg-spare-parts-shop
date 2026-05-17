const path = require("path");
const fs = require("fs");

// Ensure we run with the backend package as cwd so tsconfig-paths finds tsconfig.json
process.chdir(path.join(__dirname, ".."));

require("ts-node/register");
try {
  require("tsconfig-paths/register");
}
catch (e) {
  // tsconfig-paths may not be available in some contexts; ignore if missing
}

const srcDir = path.join(process.cwd(), "src", "api");

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return walk(full, filelist);
    filelist.push(full);
  });
  return filelist;
}

const files = walk(srcDir).filter((f) => /route\.(ts|js)$/.test(f) || /middlewares?\.(ts|js)$/.test(f));

let found = false;

for (const f of files) {
  console.log('\n== FILE:', f);
  try {
    const mod = require(f);
    const keys = Object.keys(mod);
    if (keys.length === 0) {
      console.log('  (no named exports)');
    }
    for (const k of keys) {
      try {
        const t = typeof mod[k];
        console.log(`  export ${k}: ${t}`);
        if ((k === 'GET' || k === 'POST' || k === 'PUT' || k === 'DELETE' || k === 'PATCH') && t !== 'function') {
          console.error('  >> ERROR: HTTP method export is not a function');
          found = true;
        }
        if (k === 'default') {
          console.log('    default export type:', typeof mod[k]);
        }
      }
      catch (err) {
        console.error('  error inspecting export', k, err && err.stack || err);
      }
    }
  }
  catch (err) {
    console.error('  require error:', err && err.stack || err);
  }
}

if (found) process.exit(2);
console.log('\nDone.');
