const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx tsc --noEmit', { encoding: 'utf8' });
  fs.writeFileSync('ts_out.txt', 'SUCCESS\n' + output);
} catch (error) {
  fs.writeFileSync('ts_out.txt', 'FAILED\n' + error.stdout + '\n' + error.stderr);
}
