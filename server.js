import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

function loadLocalEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT || 3000);
const PENPENCIL_BASE = 'https://api.penpencil.co';
const ORGANIZATION_ID = process.env.PW_ORGANIZATION_ID || '5eb393ee95fab7468a79d189';
const CLIENT_ID = process.env.PW_CLIENT_ID || 'system-admin';
const CLIENT_SECRET = process.env.PW_CLIENT_SECRET;
const PWTHOR_BEARER_TOKEN = process.env.PWTHOR_BEARER_TOKEN;
const sessions = new Map();
const MIME_TYPES = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw new Error('Request body must be valid JSON.'); }
}

function cleanPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(digits)) throw new Error('Enter a valid phone number.');
  return digits;
}

async function penPencil(path, options = {}) {
  const response = await fetch(`${PENPENCIL_BASE}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error?.message || payload?.message || `Authentication service returned ${response.status}.`);
  }
  return payload;
}

async function getBatchSubjects(batchId) {
  if (!PWTHOR_BEARER_TOKEN) throw new Error('PWTHOR_BEARER_TOKEN is not configured on the server.');
  const response = await fetch(`https://pwthor.live/api/BatchInfo?BatchId=${encodeURIComponent(batchId)}&Type=details`, {
    headers: { Authorization: `Bearer ${PWTHOR_BEARER_TOKEN}`, Accept: 'application/json' }
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok || payload?.success === false) throw new Error(payload?.message || `PW Thor BatchInfo returned ${response.status}.`);
  return payload;
}

function sessionFrom(request) {
  const cookie = request.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)study_session=([^;]+)/);
  return match ? sessions.get(match[1]) : undefined;
}

async function handleApi(request, response, path) {
  if (request.method === 'GET' && path === '/api/auth/status') {
    const session = sessionFrom(request);
    return sendJson(response, 200, { authenticated: Boolean(session), profile: session?.profile || null });
  }

  if (request.method === 'POST' && path === '/api/auth/request-otp') {
    const { phone } = await readJson(request);
    const username = cleanPhone(phone);
    const result = await penPencil('/v3/users/get-otp-app?smsType=0&fallback=true', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'client-type': 'MOBILE' },
      body: JSON.stringify({ username, countryCode: '+91', organizationId: ORGANIZATION_ID })
    });
    return sendJson(response, 200, { success: true, message: result.message || 'OTP sent.' });
  }

  if (request.method === 'POST' && path === '/api/auth/verify-otp') {
    if (!CLIENT_SECRET) return sendJson(response, 500, { success: false, message: 'PW_CLIENT_SECRET is not configured on the server.' });
    const { phone, otp } = await readJson(request);
    const username = cleanPhone(phone);
    if (!/^\d{4,8}$/.test(String(otp || ''))) throw new Error('Enter a valid OTP.');
    const result = await penPencil('/v3/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'client-type': 'MOBILE' },
      body: JSON.stringify({ username, otp: String(otp), client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'password', latitude: 0, longitude: 0, organizationId: ORGANIZATION_ID })
    });
    const token = result.data?.access_token;
    if (!token) throw new Error('The login service did not issue an access token.');
    const profileResponse = await penPencil('/v1/users/self', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const sessionId = randomUUID();
    sessions.set(sessionId, { token, refreshToken: result.data?.refresh_token, profile: profileResponse.data, expiresAt: Date.now() + Number(result.data?.expires_in || 0) * 1000 });
    response.setHeader('Set-Cookie', `study_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.max(60, Number(result.data?.expires_in || 3600))}`);
    return sendJson(response, 200, { success: true, profile: profileResponse.data });
  }

  if (request.method === 'POST' && path === '/api/auth/logout') {
    const cookie = (request.headers.cookie || '').match(/(?:^|;\s*)study_session=([^;]+)/)?.[1];
    if (cookie) sessions.delete(cookie);
    response.setHeader('Set-Cookie', 'study_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return sendJson(response, 200, { success: true });
  }

  const batchRoute = path.match(/^\/api\/study\/batch\/([a-f0-9]{24})$/i);
  if (request.method === 'GET' && batchRoute) {
    const payload = await getBatchSubjects(batchRoute[1]);
    return sendJson(response, 200, payload);
  }

  // New: GET /api/study/subjects?batchId=...&q=...  -> returns subjects for a batch optionally filtered by query
  try {
    const fullUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'GET' && fullUrl.pathname === '/api/study/subjects') {
      const batchId = fullUrl.searchParams.get('batchId');
      const q = (fullUrl.searchParams.get('q') || '').toLowerCase();
      if (!batchId) return sendJson(response, 400, { success: false, message: 'Missing batchId query parameter.' });
      const payload = await getBatchSubjects(batchId);
      let subjects = payload.data?.subjects || [];
      if (q) subjects = subjects.filter(s => ((s.subject || s.name || '') + '').toLowerCase().includes(q));
      return sendJson(response, 200, { success: true, data: subjects });
    }
  } catch (e) {
    // fall through to route not found or other handlers
  }

  sendJson(response, 404, { success: false, message: 'Route not found.' });
}

async function serveStatic(response, pathname) {
  const fileName = pathname === '/' ? 'index.html' : pathname.slice(1);
  const root = normalize(process.cwd());
  const safePath = normalize(join(root, fileName));
  if (safePath !== root && !safePath.startsWith(`${root}\\`)) return sendJson(response, 403, { success: false, message: 'Forbidden.' });
  try {
    const content = await readFile(safePath);
    response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(safePath)] || 'application/octet-stream' });
    response.end(content);
  } catch { sendJson(response, 404, { success: false, message: 'File not found.' }); }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) await handleApi(request, response, url.pathname);
    else await serveStatic(response, url.pathname);
  } catch (error) {
    console.error('Request failed:', error.message);
    sendJson(response, 400, { success: false, message: error.message || 'Request failed.' });
  }
}).listen(PORT, () => console.log(`Study app: http://localhost:${PORT}`));
