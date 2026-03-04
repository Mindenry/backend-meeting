const pty = require('node-pty');

const ptyProcess = pty.spawn('npx', ['prisma', 'migrate', 'dev', '--name', 'init', '--skip-seed'], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: '/Users/mind/Documents/GitHub/team-connect/backend-meeting',
  env: process.env
});

let output = '';

ptyProcess.onData((data) => {
  output += data;
  process.stdout.write(data);
  
  if (data.includes('We need to reset the')) {
    ptyProcess.write('yes\r');
  }
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`Command exited with code ${exitCode}`);
  process.exit(exitCode);
});
