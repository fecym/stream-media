const fs = require('fs');
const path = require('path');
const http = require('http');

const interfaces = require('os').networkInterfaces();
const port = 8090;

function getIp() {
  let IpAddress = '';
  for (let devName in interfaces) {
    interfaces[devName].forEach(ipInfo => {
      if (ipInfo.family === 'IPv4' && ipInfo.address !== '127.0.0.1' && !ipInfo.internal) {
        IpAddress = ipInfo.address;
      }
    });
  }
  return IpAddress;
}

const IP = getIp();

function onListening() {
  console.log(`
    Server running at:
    - Local:   http://localhost:${port}
    - Network: http://${IP}:${port}
  `);
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onRequest(req, res) {
  if (req.url === '/video') {
    return onReaderVideo(req, res);
  }
  return fs.createReadStream('./index.html').pipe(res)
}

function onReaderVideo(req, res) {
  const filepath = path.resolve(__dirname, './video.mp4');
  fs.stat(filepath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 404 Error if file not found
        return res.sendStatus(404);
      }
      res.end(err);
    }
    const range = req.headers.range;
    if (!range) return res.sendStatus(416);
    const pos = range.replace(/bytes=/, '').split('-');
    const total = stats.size;
    const start = parseInt(pos[0]);
    const end = pos[1] ? parseInt(pos[1]) : total - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filepath, { start, end }).pipe(res);
  });
}

const server = http.createServer(onRequest);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
