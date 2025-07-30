const { spawn } = require('child_process');

const path = require('path');
const cli = path.join(__dirname, 'test', 'setup', 'jest-docker-cli.ts');
const jestBin = path.join(__dirname, 'node_modules', '.bin', 'jest');

const rawArgs = process.argv.slice(2);
let args = [...rawArgs];

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
  }
}
jestArgs = args;

if (!jestArgs.includes('--forceExit')) {
  jestArgs.push('--forceExit');
}
if (!jestArgs.some(arg => !arg.startsWith('--'))) {
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
    const env = { ...process.env };
    if (extraSqlFiles.length > 0) {
      env.EXTRA_SQL_FILES = extraSqlFiles.join(',');
    }
    await run('npx', ['ts-node', cli, 'start'], { env });
    await run(jestBin, jestArgs, { env });
  } finally {
    await run('npx', ['ts-node', cli, 'stop']);
    process.exit(0);
  }
})(); 