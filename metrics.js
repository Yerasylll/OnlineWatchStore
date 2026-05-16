const { getDB } = require('./backend/config/database');

let counts = {};
let durationBuckets = {};
const BUCKETS = [50, 100, 200, 500, 1000, 2000, 5000];
const startedAt = Date.now();

function metricsMiddleware(req, res, next) {
  const t = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t;
    const route = req.route ? req.route.path : req.path;
    const key = `${req.method}|${route}|${res.statusCode}`;
    counts[key] = (counts[key] || 0) + 1;
    for (const b of BUCKETS) {
      if (ms <= b) {
        const dk = `${req.method}|${route}|${b}`;
        durationBuckets[dk] = (durationBuckets[dk] || 0) + 1;
      }
    }
  });
  next();
}

function metricsEndpoint(req, res) {
  let out = '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\n';
  for (const [k, v] of Object.entries(counts)) {
    const [method, route, status] = k.split('|');
    out += `http_requests_total{method="${method}",route="${route}",status="${status}",job="watchstore-backend"} ${v}\n`;
  }

  out += '\n# HELP http_request_duration_ms HTTP request duration buckets\n# TYPE http_request_duration_ms histogram\n';
  for (const [k, v] of Object.entries(durationBuckets)) {
    const [method, route, le] = k.split('|');
    out += `http_request_duration_ms_bucket{method="${method}",route="${route}",le="${le}",job="watchstore-backend"} ${v}\n`;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  out += `http_request_duration_ms_bucket{le="+Inf",job="watchstore-backend"} ${total}\n`;

  const mem = process.memoryUsage();
  out += `\n# HELP process_heap_bytes Node.js heap used\n# TYPE process_heap_bytes gauge\nprocess_heap_bytes{job="watchstore-backend"} ${mem.heapUsed}\n`;
  out += `\n# HELP app_uptime_seconds Uptime in seconds\n# TYPE app_uptime_seconds gauge\napp_uptime_seconds{job="watchstore-backend"} ${((Date.now() - startedAt) / 1000).toFixed(1)}\n`;

  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(out);
}

async function healthEndpoint(req, res) {
  const health = { status: 'ok', uptime: process.uptime(), checks: {} };
  try {
    const db = getDB();
    await db.command({ ping: 1 });
    health.checks.mongodb = 'ok';
  } catch {
    health.checks.mongodb = 'error';
    health.status = 'degraded';
  }
  res.status(health.status === 'ok' ? 200 : 503).json(health);
}

module.exports = { metricsMiddleware, metricsEndpoint, healthEndpoint };