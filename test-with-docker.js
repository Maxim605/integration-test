const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const jestBin = path.join(__dirname, 'node_modules', '.bin', 'jest');

const rawArgs = process.argv.slice(2);
let args = [...rawArgs];
const knownProjects = new Set(["unit", "integration", "e2e", "examples"]);
const selectedProjects = [];

let extraSqlFiles = [];
let jestArgs = [];

for (let i = rawArgs.length - 1; i >= 0; i--) {
  if (rawArgs[i].endsWith('.sql')) {
    extraSqlFiles.push(rawArgs[i]);
    args = args.filter(a => a !== rawArgs[i]);
  }
}

for (let i = args.length - 1; i >= 0; i--) {
  if (args[i].startsWith('--sql=')) {
    extraSqlFiles = args[i].replace('--sql=', '').split(',').map(f => f.trim()).filter(Boolean);
    args.splice(i, 1);
  } else if (knownProjects.has(args[i])) {
    selectedProjects.push(args[i]);
    args.splice(i, 1);
  }
}
jestArgs = args;

if (!jestArgs.includes('--forceExit')) {
  jestArgs.push('--forceExit');
}
if (selectedProjects.length > 0) {
  jestArgs.push('--selectProjects', selectedProjects.join(','));
} else if (!jestArgs.some(arg => !arg.startsWith('--'))) {
  jestArgs.push('test/**/*.spec.ts');
}

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    proc.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

(async () => {
  try {
    const env = { ...process.env, SETTINGS_FILE: './settings.spec.yml' };
    await run(jestBin, jestArgs, { env });
  } finally {
    process.exit(0);
  }
})(); 