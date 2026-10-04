/**
 * ═══════════════════════════════════════════════════════════════
 *  عميل الـ API
 *
 *  المسؤوليات:
 *   • إرفاق توكن الدخول تلقائيًا.
 *   • تجديد التوكن مرة واحدة عند انتهائه ثم إعادة المحاولة —
 *     مع طابور يمنع إطلاق عشرة طلبات تجديد متوازية.
 *   • تحويل استجابات الخطأ إلى كائن ApiRequestError موحّد الشكل
 *     يحمل رسالة عربية جاهزة للعرض وأخطاء الحقول للفورم.
 *   • رصد انقطاع الـ API لعرض شريط «تعذّر الاتصال» في الهيدر.
 * ═══════════════════════════════════════════════════════════════
 */
import { storage, KEYS } from './storage.js';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/** خطأ موحّد يصل إلى الواجهة */
export class ApiRequestError extends Error {
  constructor(message, { status, code, errors, offline = false } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status ?? 0;
    this.code = code ?? null;
    this.errors = errors ?? null;
    this.offline = offline;
  }
}

/** مستمعون يُبلَّغون عند انتهاء الجلسة نهائيًا (لتسجيل الخروج في الواجهة) */
const sessionListeners = new Set();
export const onSessionExpired = (listener) => {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
};
const notifySessionExpired = () => sessionListeners.forEach((listener) => listener());

/** مستمعون لحالة اتصال الـ API (يستخدمها شريط التنبيه في الهيدر) */
const statusListeners = new Set();
let apiReachable = true;
export const onApiStatusChange = (listener) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};
function setApiReachable(value) {
  if (apiReachable === value) return;
  apiReachable = value;
  statusListeners.forEach((listener) => listener(value));
}
export const isApiReachable = () => apiReachable;

/* ── تجديد التوكن: طلب واحد مشترك لكل الطلبات المنتظرة ───────── */
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = storage.get(KEYS.refreshToken);
  if (!refreshToken) return null;

  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) throw new Error('refresh failed');

      const payload = await response.json();
      storage.set(KEYS.accessToken, payload.data.tokens.access_token);
      storage.set(KEYS.refreshToken, payload.data.tokens.refresh_token);
      return payload.data.tokens.access_token;
    } catch {
      storage.remove(KEYS.accessToken);
      storage.remove(KEYS.refreshToken);
      notifySessionExpired();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** بناء سلسلة الاستعلام مع تجاهل القيم الفارغة */
function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request(path, { method = 'GET', body, params, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? storage.get(KEYS.accessToken) : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // فشل شبكي: السيرفر متوقّف أو لا يوجد اتصال
    setApiReachable(false);
    throw new ApiRequestError('تعذّر الاتصال بالخادم', { offline: true });
  }

  setApiReachable(true);

  // 204 بلا محتوى
  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.ok) return payload?.data ?? payload;

  // انتهت صلاحية التوكن: نجدّد مرة واحدة ثم نعيد الطلب
  if (response.status === 401 && retry && payload?.code === 'TOKEN_EXPIRED') {
    const newToken = await refreshAccessToken();
    if (newToken) return request(path, { method, body, params, auth, retry: false });
  }

  if (response.status === 401 && auth && token) notifySessionExpired();

  throw new ApiRequestError(payload?.message || 'حدث خطأ غير متوقّع', {
    status: response.status,
    code: payload?.code,
    errors: payload?.errors,
  });
}

/** استجابة مرقّمة: نحتاج meta بجانب data */
async function requestPaginated(path, params) {
  const token = storage.get(KEYS.accessToken);
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, { headers });
  } catch {
    setApiReachable(false);
    throw new ApiRequestError('تعذّر الاتصال بالخادم', { offline: true });
  }
  setApiReachable(true);

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(payload?.message || 'حدث خطأ', { status: response.status, code: payload?.code, errors: payload?.errors });
  }
  return { items: payload?.data ?? [], meta: payload?.meta ?? null };
}

/**
 * رفع ملف مع حقول نصّية (multipart).
 * لا نضبط `Content-Type` بأنفسنا: المتصفّح يضيفه مع الحدّ الفاصل
 * (boundary) الذي يولّده، وكتابته يدويًا تُفسد الطلب.
 *
 * @param {string} path
 * @param {File} file
 * @param {object} [fields] حقول إضافية تُرسل مع الملف
 * @param {string} [fieldName] اسم حقل الملف المتوقّع في الخادم
 */
async function upload(path, file, fields = {}, fieldName = 'image') {
  const form = new FormData();
  form.append(fieldName, file);
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
  }

  const token = storage.get(KEYS.accessToken);
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: form });
  } catch {
    setApiReachable(false);
    throw new ApiRequestError('تعذّر الاتصال بالخادم', { offline: true });
  }
  setApiReachable(true);

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(payload?.message || 'تعذّر رفع الملف', {
      status: response.status, code: payload?.code, errors: payload?.errors,
    });
  }
  return payload?.data ?? payload;
}

/** تنزيل ملف يولّده الخادم (قالب CSV مثلًا) */
async function download(path, filename) {
  const token = storage.get(KEYS.accessToken);
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiRequestError('تعذّر تنزيل الملف', { status: response.status });

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get:    (path, params, options) => request(path, { method: 'GET', params, ...options }),
  post:   (path, body, options)   => request(path, { method: 'POST', body, ...options }),
  put:    (path, body, options)   => request(path, { method: 'PUT', body, ...options }),
  patch:  (path, body, options)   => request(path, { method: 'PATCH', body, ...options }),
  delete: (path, params, options) => request(path, { method: 'DELETE', params, ...options }),
  paginated: requestPaginated,
  upload,
  download,
};
