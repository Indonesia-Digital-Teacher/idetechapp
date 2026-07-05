const http = require('http');
const options = { socketPath: '/var/run/docker.sock', path: '/containers/json', method: 'GET' };
const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', e => console.error(e));
req.end();
