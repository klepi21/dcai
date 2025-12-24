const { spawn } = require('child_process');
const { exec } = require('child_process');

let nextProcess;
let proxyProcess;
let nextPort = 3000;

// Start Next.js
nextProcess = spawn('npx', ['next', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// Listen for Next.js output to detect port
nextProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Check if Next.js switched to port 3001
  if (output.includes('Port 3000 is in use, trying 3001')) {
    nextPort = 3001;
  }
  
  // When Next.js is ready, start the proxy
  if (output.includes('Ready in') || output.includes('Local:')) {
    if (!proxyProcess) {
      console.log('\n🚀 Starting SSL proxy...');
      console.log(`📡 Proxying https://localhost:3002 → http://localhost:${nextPort}\n`);
      
      proxyProcess = spawn('npx', ['local-ssl-proxy', '--source', '3002', '--target', nextPort.toString()], {
        stdio: 'inherit',
        shell: true
      });
    }
  }
});

nextProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Handle process exit
process.on('SIGINT', () => {
  if (nextProcess) nextProcess.kill();
  if (proxyProcess) proxyProcess.kill();
  process.exit();
});


