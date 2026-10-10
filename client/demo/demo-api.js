/* ============================================
   النسخة التجريبية (عرض فقط) - النواة المشتركة

   بتعترض طلبات fetch لمسار الـ API وبترد عليها من بيانات وهمية متخزنة في
   localStorage عند الزائر نفسه. مفيش سيرفر ولا قاعدة بيانات: كل زائر معاه
   نسخته الخاصة، ومفيش أي حاجة بتتبعت لأي مكان.

   الملف ده مش بيتحمّل في النسخة الحقيقية خالص - بيتحط في index.html بتاع
   النسخة التجريبية بس (demo/inject.mjs). ومفيش أي تعديل على كود الواجهة.
   ============================================ */

function createDemo(cfg) {
  'use strict';

  var pad = function (n) {
    return String(n).padStart(2, '0');
  };

  var H = {
    pad: pad,
    now: function () {
      return Date.now();
    },
    // "YYYY-MM-DD HH:MM:SS" بتوقيت UTC (زي DATETIME من MySQL)
    utc: function (ms) {
      var d = new Date(ms);
      return (
        d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' +
        pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds())
      );
    },
    day: function (ms) {
      return H.utc(ms).slice(0, 10);
    },
    iso: function (ms) {
      return new Date(ms).toISOString();
    },
    // أيام نسبية لـ "النهارده" بتوقيت الزائر (YYYY-MM-DD)
    localDay: function (offset) {
      var d = new Date();
      d.setDate(d.getDate() + (offset || 0));
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    // رقم ثابت 0..999 من نص: عشان البيانات المتولّدة تبقى متكررة مش عشوائية
    hash: function (str) {
      var h = 2166136261;
      str = String(str);
      for (var i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0) % 1000;
    },
    code: function (length, alphabet) {
      alphabet = alphabet || 'abcdefghijklmnopqrstuvwxyz0123456789';
      var out = '';
      for (var i = 0; i < length; i += 1) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      return out;
    },
    ok: function (body, status) {
      return { status: status || 200, body: body };
    },
    seq: function (db, kind) {
      db.seq = db.seq || {};
      db.seq[kind] = (db.seq[kind] || 0) + 1;
      return db.seq[kind];
    },
    clone: function (value) {
      return JSON.parse(JSON.stringify(value));
    },
  };

  var db = null;

  function load() {
    try {
      var raw = localStorage.getItem(cfg.key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.__v === cfg.version) return parsed;
      }
    } catch (e) {
      /* التخزين المحلي مقفول - هنكمّل من الذاكرة */
    }
    return null;
  }

  function save() {
    try {
      localStorage.setItem(cfg.key, JSON.stringify(db));
    } catch (e) {
      /* الكوتا خلصت أو التخزين مقفول - الجلسة الحالية شغّالة من الذاكرة */
    }
  }

  function reset() {
    db = { __v: cfg.version, seq: {} };
    cfg.seed(db, H);
    save();
  }

  db = load();
  if (!db) reset();

  /* ---------- اعتراض fetch ---------- */

  var prefixes = [].concat(cfg.prefix);
  var realFetch = window.fetch.bind(window);

  function matchPrefix(pathname) {
    for (var i = 0; i < prefixes.length; i += 1) {
      var p = prefixes[i];
      if (pathname === p || pathname.indexOf(p + '/') === 0) return pathname.slice(p.length) || '/';
    }
    return null;
  }

  function headerValue(headers, name) {
    if (!headers) return undefined;
    if (typeof headers.get === 'function') return headers.get(name);
    var lower = name.toLowerCase();
    for (var k in headers) if (k.toLowerCase() === lower) return headers[k];
    return undefined;
  }

  window.fetch = function (input, init) {
    var raw = typeof input === 'string' ? input : input && (input.url || input.href);
    var parsed;
    try {
      parsed = new URL(raw, window.location.origin);
    } catch (e) {
      return realFetch(input, init);
    }
    var path = parsed.origin === window.location.origin ? matchPrefix(parsed.pathname) : null;
    if (path === null) return realFetch(input, init);

    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var headers = (init && init.headers) || (input && input.headers) || {};
    var body = null;
    var rawBody = init && init.body;
    if (typeof rawBody === 'string' && rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        body = null;
      }
    }
    var query = {};
    parsed.searchParams.forEach(function (v, k) {
      query[k] = v;
    });

    var result;
    try {
      result = cfg.handle({ method: method, path: path, query: query, body: body, headers: headers, header: function (n) { return headerValue(headers, n); } }, db, H);
      if (!result) result = { status: 404, body: cfg.notFound ? cfg.notFound(path) : { message: 'المسار ده مش موجود في النسخة التجريبية' } };
      save();
    } catch (e) {
      if (window.console) console.error('[demo]', e);
      result = { status: 500, body: cfg.serverError ? cfg.serverError() : { message: 'حصل خطأ في النسخة التجريبية' } };
    }

    return new Promise(function (resolve) {
      setTimeout(function () {
        var h = Object.assign({ 'Content-Type': 'application/json' }, result.headers || {});
        var payload = result.status === 204 ? null : result.raw ? result.body : JSON.stringify(result.body);
        resolve(new Response(payload, { status: result.status, headers: h }));
      }, 40 + Math.floor(Math.random() * 80));
    });
  };

  /* ---------- شريط التجربة ---------- */

  var API = {
    db: function () {
      return db;
    },
    H: H,
    save: save,
    reset: function () {
      try {
        localStorage.removeItem(cfg.key);
      } catch (e) {
        /* لا شيء */
      }
      if (cfg.onReset) cfg.onReset();
      window.location.href = cfg.home || '/';
    },
    go: function (url) {
      save();
      window.location.href = url || cfg.home || '/';
    },
  };

  function mountBar() {
    if (document.getElementById('demo-bar')) return;
    var bar = cfg.bar || {};
    var style = document.createElement('style');
    style.textContent =
      '#demo-bar{position:fixed;left:10px;bottom:10px;z-index:2147483000;font-family:inherit;direction:rtl;font-size:13px;line-height:1.5}' +
      '#demo-bar *{box-sizing:border-box}' +
      '#demo-toggle{display:flex;align-items:center;gap:6px;background:#1c1c24;color:#fff;border:1px solid rgba(255,255,255,.28);' +
      'border-radius:999px;padding:7px 13px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)}' +
      '#demo-toggle i{width:8px;height:8px;border-radius:50%;background:#f5b93a;display:inline-block}' +
      '#demo-panel{display:none;position:absolute;left:0;bottom:calc(100% + 8px);width:min(290px,calc(100vw - 20px));' +
      'background:#fff;color:#1c1c24;border:1px solid #d6d6dc;border-radius:14px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.3)}' +
      '#demo-panel p{margin:0 0 8px;font-size:12.5px;color:#454552}' +
      '#demo-panel button{display:block;width:100%;margin-top:6px;padding:9px 11px;border-radius:10px;border:1px solid #1c1c24;' +
      'background:#fff;color:#1c1c24;font:inherit;font-weight:700;text-align:right;cursor:pointer}' +
      '#demo-panel button.primary{background:#1c1c24;color:#fff}' +
      '#demo-panel small{display:block;margin-top:9px;font-size:11.5px;color:#6a6a78}';
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'demo-bar';
    var actions = (bar.actions || [])
      .map(function (a, i) {
        return '<button type="button" class="' + (a.primary ? 'primary' : '') + '" data-i="' + i + '"></button>';
      })
      .join('');
    wrap.innerHTML =
      '<div id="demo-panel" role="dialog" aria-label="خيارات النسخة التجريبية">' +
      '<p></p>' + actions +
      '<button type="button" data-reset="1">إعادة ضبط البيانات</button><small></small></div>' +
      '<button id="demo-toggle" type="button" aria-expanded="false" aria-controls="demo-panel"><i></i><span></span></button>';
    document.body.appendChild(wrap);

    var panel = wrap.querySelector('#demo-panel');
    var toggle = wrap.querySelector('#demo-toggle');
    toggle.querySelector('span').textContent = bar.label || 'نسخة تجريبية';
    panel.querySelector('p').textContent =
      bar.intro || 'ده عرض للتطبيق ببيانات وهمية متخزنة على جهازك بس.';
    panel.querySelector('small').textContent = bar.note || '';
    (bar.actions || []).forEach(function (a, i) {
      panel.querySelector('button[data-i="' + i + '"]').textContent = a.label;
    });

    function setOpen(open) {
      panel.style.display = open ? 'block' : 'none';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () {
      setOpen(panel.style.display !== 'block');
    });
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute('data-reset')) return API.reset();
      var idx = t.getAttribute('data-i');
      if (idx !== null && bar.actions[Number(idx)]) bar.actions[Number(idx)].run(API);
    });
    if (bar.openFirst && !sessionStorage.getItem(cfg.key + ':seen')) {
      try {
        sessionStorage.setItem(cfg.key + ':seen', '1');
      } catch (e) {
        /* لا شيء */
      }
      setOpen(true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBar);
  else mountBar();

  return API;
}
/* ============================================
   رُمّان - الباك إند التجريبي
   الأشكال مطابقة لـ server/src/modules/* (الغلاف {success, data, meta}).
   بيانات الكتالوج والطلبات وهمية بالكامل ومتخزنة عند الزائر في localStorage.
   ============================================ */

(function () {
  'use strict';

  const DEMO_PASSWORD = 'Demo@1234';
  const POINT_VALUE = 0.05;
  const POINTS_PER_EGP = 1;
  const DAY = 86400000;

  const TIERS = [
    { key: 'silver', label: 'فضّي', minSpent: 0, multiplier: 1, perks: ['نقطة لكل جنيه', 'عروض الأعضاء'] },
    { key: 'gold', label: 'ذهبي', minSpent: 15000, multiplier: 1.5, perks: ['نقطة ونصف لكل جنيه', 'توصيل مجاني فوق 500', 'أولوية في مواعيد التوصيل'] },
    { key: 'platinum', label: 'بلاتيني', minSpent: 50000, multiplier: 2, perks: ['نقطتان لكل جنيه', 'توصيل مجاني دائمًا', 'مدير حساب شخصي', 'دعوات لتذوّق المنتجات الجديدة'] },
  ];
  const SLOTS = [
    { from: '09:00', to: '12:00', label: 'صباحًا' },
    { from: '12:00', to: '15:00', label: 'ظهرًا' },
    { from: '15:00', to: '18:00', label: 'عصرًا' },
    { from: '18:00', to: '21:00', label: 'مساءً' },
    { from: '21:00', to: '23:59', label: 'ليلًا' },
  ];
  const TRANSITIONS = {
    pending: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'],
    ready: ['out_for_delivery', 'delivered', 'cancelled'], out_for_delivery: ['delivered', 'cancelled'],
    delivered: ['refunded'], cancelled: [], refunded: [],
  };
  const OPEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
  const STATUS_NOTES = {
    pending: 'تم استلام الطلب', confirmed: 'تأكّد طلبك', preparing: 'جارٍ تجهيز طلبك', ready: 'طلبك جاهز',
    out_for_delivery: 'طلبك في الطريق إليك', delivered: 'تم تسليم طلبك', cancelled: 'أُلغي الطلب', refunded: 'تم الاسترداد',
  };

  const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const money = (n) => r2(n).toFixed(2);

  /* ---------- أدوات الرد ---------- */
  const ok = (data, o = {}) => ({ status: o.status || 200, body: { success: true, message: o.message || null, data: data === undefined ? null : data, ...(o.meta ? { meta: o.meta } : {}) } });
  const created = (data, message) => ok(data, { status: 201, message: message || 'تم الإنشاء بنجاح' });
  const paged = (items, page, limit, total) => ok(items, { meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasNext: page * limit < total, hasPrev: page > 1 } });
  const fail = (status, message, code, errors) => ({ status, body: { success: false, message, code: code || null, errors: errors || null } });

  /* ---------- بيانات البداية ---------- */

  function seed(db, H) {
    const now = H.now();
    const iso = (ms) => H.iso(ms);

    db.session = null;
    db.settings = [
      { key: 'brand_name_ar', value: 'رُمّان', group: 'brand' }, { key: 'brand_tagline', value: 'سوق طازج بلمسة بيت', group: 'brand' },
      { key: 'support_phone', value: '19444', group: 'contact' }, { key: 'support_email', value: 'help@rumman.demo', group: 'contact' },
      { key: 'points_per_egp', value: '1', group: 'loyalty' }, { key: 'point_value_egp', value: '0.05', group: 'loyalty' },
      { key: 'max_points_redemption_percent', value: '50', group: 'loyalty' }, { key: 'store_status', value: 'open', group: 'general' },
    ].map((s) => ({ ...s, updated_at: iso(now - 9 * DAY) }));

    db.branches = [
      { id: 1, code: 'NSR', slug: 'nasr-city', name_ar: 'رُمّان مدينة نصر', name_en: 'Rumman Nasr City', tagline_ar: 'الفرع الرئيسي — كل الأقسام', address_ar: '12 شارع مصطفى النحاس، مدينة نصر', address_en: '12 Mostafa El-Nahas St', city: 'القاهرة', governorate: 'القاهرة', latitude: 30.0626, longitude: 31.3305, phone: '02 2274 1100', whatsapp: '01001234501', email: 'nasr@rumman.demo', opens_at: '08:00:00', closes_at: '23:30:00', is_24h: 0, delivery_radius_km: '9.0', delivery_fee: '30.00', free_delivery_over: '600.00', min_order_amount: '120.00', avg_prep_minutes: 35, supports_pickup: 1, area_sqm: 1200, opened_year: 2019, status: 'active', manager_id: 3 },
      { id: 2, code: 'MAD', slug: 'maadi', name_ar: 'رُمّان المعادي', name_en: 'Rumman Maadi', tagline_ar: 'على كورنيش النيل', address_ar: '45 شارع 9، المعادي', address_en: '45 Road 9, Maadi', city: 'القاهرة', governorate: 'القاهرة', latitude: 29.9602, longitude: 31.2569, phone: '02 2380 4400', whatsapp: '01001234502', email: 'maadi@rumman.demo', opens_at: '08:00:00', closes_at: '23:00:00', is_24h: 0, delivery_radius_km: '7.0', delivery_fee: '25.00', free_delivery_over: '500.00', min_order_amount: '100.00', avg_prep_minutes: 30, supports_pickup: 1, area_sqm: 800, opened_year: 2021, status: 'active', manager_id: null },
      { id: 3, code: 'ZYD', slug: 'sheikh-zayed', name_ar: 'رُمّان الشيخ زايد', name_en: 'Rumman Sheikh Zayed', tagline_ar: 'مفتوح ٢٤ ساعة', address_ar: 'بيفرلي هيلز، الشيخ زايد', address_en: 'Beverly Hills, Sheikh Zayed', city: 'الجيزة', governorate: 'الجيزة', latitude: 30.0131, longitude: 30.9792, phone: '02 3855 7700', whatsapp: '01001234503', email: 'zayed@rumman.demo', opens_at: '00:00:00', closes_at: '23:59:00', is_24h: 1, delivery_radius_km: '12.0', delivery_fee: '35.00', free_delivery_over: '700.00', min_order_amount: '150.00', avg_prep_minutes: 40, supports_pickup: 1, area_sqm: 1500, opened_year: 2023, status: 'active', manager_id: null },
    ];
    db.hours = [];
    db.branches.forEach((b) => {
      for (let d = 0; d < 7; d += 1) db.hours.push({ branch_id: b.id, weekday: d, open_time: b.opens_at, close_time: b.closes_at, is_closed: 0 });
    });
    db.zones = [
      { id: 1, branch_id: 1, name_ar: 'مدينة نصر', name_en: 'Nasr City', delivery_fee: '30.00', min_order: '120.00', eta_minutes: 45, status: 'active' },
      { id: 2, branch_id: 1, name_ar: 'مصر الجديدة', name_en: 'Heliopolis', delivery_fee: '35.00', min_order: '150.00', eta_minutes: 55, status: 'active' },
      { id: 3, branch_id: 2, name_ar: 'المعادي', name_en: 'Maadi', delivery_fee: '25.00', min_order: '100.00', eta_minutes: 40, status: 'active' },
      { id: 4, branch_id: 3, name_ar: 'الشيخ زايد', name_en: 'Sheikh Zayed', delivery_fee: '35.00', min_order: '150.00', eta_minutes: 50, status: 'active' },
    ];

    db.categories = [
      [1, 'vegetables-fruits', 'خضار وفاكهة', 'leaf', '#3E8E41', 'A', 'طازج من المزرعة كل صباح'],
      [2, 'meat-poultry', 'لحوم ودواجن', 'cleaver', '#C0392B', 'B', 'ذبح طازج وتقطيع حسب الطلب'],
      [3, 'seafood', 'أسماك ومأكولات بحرية', 'wave', '#1F7A9E', 'C', 'صيد اليوم'],
      [4, 'dairy-eggs', 'ألبان وبيض', 'drop', '#E6A817', 'D', 'من مزارع موثوقة'],
      [5, 'bakery', 'مخبوزات', 'wheat', '#C27C2C', 'E', 'من الفرن إلى سلتك'],
      [6, 'pantry', 'بقالة', 'jar', '#8B5E3C', 'F', 'أساسيات المطبخ'],
      [7, 'beverages', 'مشروبات', 'bottle', '#2E86AB', 'G', 'عصائر وشاي وقهوة'],
      [8, 'snacks-sweets', 'سناكس وحلويات', 'snack', '#D81E4A', 'H', 'لحظة حلوة'],
      [9, 'household', 'منظفات ومنزل', 'sparkle', '#6C5CE7', 'J', 'بيت نضيف'],
    ].map((c, i) => ({ id: c[0], parent_id: null, slug: c[1], name_ar: c[2], name_en: null, tagline_ar: c[6], description_ar: null, motif: c[3], accent_color: c[4], aisle_code: c[5], sort_order: i + 1, is_featured: i < 6 ? 1 : 0, status: 'active', deleted_at: null }));

    db.brands = [
      [1, 'rumman', 'رُمّان', 1], [2, 'juhayna', 'جهينة', 0], [3, 'lamar', 'لامار', 0], [4, 'beyti', 'بيتي', 0], [5, 'sunny', 'صني', 0], [6, 'olio', 'أوليو', 0],
    ].map((b) => ({ id: b[0], slug: b[1], name_ar: b[2], name_en: null, country: 'مصر', is_house_label: b[3], status: 'active' }));

    // [cat, brand, name_ar, unit_size, price, compare_at, badge, organic, fresh, exclusive, featured, origin, maker, desc]
    const P = [
      [1, 1, 'رمان بلدي', '١ كجم', 48, 60, 'best_seller', 0, 1, 0, 1, 'مصر', 'مزارع الفيوم', 'حبات حمراء حلوة'],
      [1, 1, 'برتقال أبو سرة', '١ كجم', 22, 0, '', 0, 1, 0, 1, 'مصر', 'مزارع البحيرة', 'عصيري ومناسب للتناول'],
      [1, 1, 'ليمون بلدي', '٥٠٠ جم', 18, 0, '', 0, 1, 0, 0, 'مصر', 'مزارع القليوبية', ''],
      [1, 1, 'موز بلدي', '١ كجم', 32, 38, 'deal', 0, 1, 0, 0, 'مصر', '', ''],
      [1, 1, 'تفاح أحمر', '١ كجم', 65, 0, '', 0, 1, 0, 1, 'لبنان', '', 'مقرمش وحلو'],
      [1, 1, 'عنب أحمر', '٥٠٠ جم', 40, 0, 'new', 0, 1, 0, 0, 'مصر', '', ''],
      [1, 1, 'فراولة طازجة', '٢٥٠ جم', 28, 35, 'deal', 1, 1, 0, 1, 'مصر', 'مزارع القناطر', 'عضوية'],
      [1, 1, 'جزر', '١ كجم', 15, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [1, 1, 'بطاطس', '١ كجم', 20, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [1, 1, 'طماطم', '١ كجم', 24, 0, 'best_seller', 0, 1, 0, 1, 'مصر', '', ''],
      [1, 1, 'خيار', '١ كجم', 18, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [1, 1, 'فلفل رومي ألوان', '٥٠٠ جم', 35, 0, '', 1, 1, 0, 0, 'مصر', '', ''],
      [1, 1, 'نعناع بلدي', 'حزمة', 6, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [1, 1, 'أفوكادو', '٣ حبات', 55, 70, 'limited', 0, 1, 1, 0, 'كينيا', '', 'ناضج وجاهز'],
      [2, 1, 'صدور فراخ', '١ كجم', 185, 0, 'best_seller', 0, 1, 0, 1, 'مصر', 'مزارع رُمّان', 'بدون جلد'],
      [2, 1, 'وراك فراخ', '١ كجم', 120, 135, 'deal', 0, 1, 0, 0, 'مصر', '', ''],
      [2, 1, 'لحم بتلو مفروم', '٥٠٠ جم', 150, 0, '', 0, 1, 0, 1, 'مصر', '', 'مفروم يوميًا'],
      [2, 1, 'ستيك ريب آي', '٣٠٠ جم', 260, 0, 'limited', 0, 1, 1, 1, 'أستراليا', '', ''],
      [2, 4, 'كفتة بتلو', '٥٠٠ جم', 130, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [3, 1, 'فيليه سمك بلطي', '٥٠٠ جم', 95, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [3, 1, 'جمبري جامبو', '٥٠٠ جم', 320, 360, 'deal', 0, 1, 0, 1, 'مصر', '', ''],
      [3, 1, 'سمك قاروص', '١ كجم', 240, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [4, 2, 'لبن كامل الدسم', '١ لتر', 38, 0, 'best_seller', 0, 1, 0, 1, 'مصر', 'جهينة', ''],
      [4, 1, 'جبنة رومي', '٢٥٠ جم', 85, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [4, 2, 'زبادي يوناني', '١٥٠ جم', 16, 0, 'new', 0, 1, 0, 0, 'مصر', '', ''],
      [4, 1, 'زبدة طبيعية', '٢٠٠ جم', 70, 80, 'deal', 0, 1, 0, 0, 'مصر', '', ''],
      [4, 1, 'بيض بلدي', '١٢ بيضة', 85, 0, 'best_seller', 1, 1, 0, 1, 'مصر', 'مزارع المنوفية', ''],
      [5, 1, 'عيش فينو', '٦ أرغفة', 14, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [5, 1, 'كرواسون زبدة', '٤ قطع', 60, 0, 'new', 0, 1, 0, 1, 'مصر', 'مخبز رُمّان', ''],
      [5, 1, 'توست أسمر', '٥٠٠ جم', 32, 0, '', 0, 1, 0, 0, 'مصر', '', ''],
      [6, 3, 'أرز مصري', '١ كجم', 38, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [6, 3, 'مكرونة اسباجتي', '٤٠٠ جم', 16, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [6, 3, 'عدس أصفر', '٥٠٠ جم', 30, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [6, 3, 'سكر', '١ كجم', 30, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [6, 1, 'عسل نحل أبيض', '٣٥٠ جم', 140, 170, 'deal', 1, 0, 1, 1, 'مصر', 'نحالة سيوة', ''],
      [6, 6, 'زيت زيتون بكر', '٥٠٠ مل', 195, 0, '', 1, 0, 1, 1, 'مصر', '', 'عصرة أولى على البارد'],
      [6, 3, 'طحينة', '٤٠٠ جم', 55, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [7, 5, 'مياه معدنية', '٦ زجاجات', 42, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [7, 5, 'عصير برتقال طازج', '١ لتر', 55, 0, 'new', 0, 1, 0, 1, 'مصر', '', ''],
      [7, 3, 'شاي أسود', '٢٥٠ جم', 78, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [7, 3, 'قهوة تركي محوّجة', '٢٥٠ جم', 120, 0, '', 0, 0, 1, 0, 'مصر', '', 'بالهيل'],
      [8, 3, 'شوكولاتة داكنة', '١٠٠ جم', 65, 0, '', 0, 0, 0, 1, 'بلجيكا', '', ''],
      [8, 3, 'بسكويت بالتمر', '٣٠٠ جم', 28, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [8, 1, 'لوز محمّص', '٢٥٠ جم', 150, 175, 'deal', 0, 0, 0, 1, 'مصر', '', ''],
      [8, 3, 'شيبسي', '٦٠ جم', 8, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [9, 3, 'منظف أرضيات', '١ لتر', 45, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [9, 3, 'مناديل مطبخ', '٣ رولات', 40, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
      [9, 3, 'سائل غسيل أطباق', '٧٥٠ مل', 38, 0, '', 0, 0, 0, 0, 'مصر', '', ''],
    ];
    const cat = (id) => db.categories.find((c) => c.id === id);
    db.products = P.map((p, i) => {
      const id = i + 1;
      const h = H.hash('p' + id);
      return {
        id, sku: 'RMN-' + String(1000 + id), slug: 'p' + id + '-' + cat(p[0]).slug, barcode: '62210' + String(100000 + id),
        category_id: p[0], brand_id: p[1], name_ar: p[2], name_en: null, short_desc_ar: p[13] || null, description_ar: (p[13] || p[2]) + ' — منتقى بعناية ليصلك بأفضل جودة.',
        unit: 'piece', unit_size: p[3], price: money(p[4]), compare_at_price: p[5] ? money(p[5]) : null, cost_price: money(p[4] * 0.7), tax_rate: '0.00',
        origin_country: p[11] || null, farm_or_maker: p[12] || null, storage_ar: p[8] ? 'يُحفظ في الثلاجة' : 'يُحفظ في مكان جاف وبارد', shelf_life_days: p[8] ? 5 : 365,
        nutrition: null, allergens: [], tags: [p[7] ? 'organic' : null, p[8] ? 'fresh' : null].filter(Boolean),
        is_organic: p[7], is_fresh: p[8], is_exclusive: p[9], is_featured: p[10], badge: p[6] || null, max_per_order: 12,
        rating_avg: (3.9 + (h % 11) / 10).toFixed(2), rating_count: 8 + (h % 140), sold_count: 40 + h * 3, view_count: 100 + h * 5,
        status: 'active', deleted_at: null, updated_at: iso(now - (h % 20) * DAY), created_at: iso(now - 30 * DAY),
      };
    });
    db.inventory = [];
    db.products.forEach((p) => {
      db.branches.forEach((b) => {
        const h = H.hash('i' + p.id + '-' + b.id);
        const quantity = h % 23 === 0 ? 0 : h % 17 === 0 ? 4 : 18 + (h % 90);
        db.inventory.push({
          id: db.inventory.length + 1, branch_id: b.id, product_id: p.id, quantity, reserved: 0, low_stock_threshold: 10,
          aisle: cat(p.category_id).aisle_code + (1 + (h % 6)), price_override: b.id === 3 && h % 5 === 0 ? money(Number(p.price) * 1.05) : null,
          restock_at: null, updated_at: iso(now - (h % 10) * DAY),
        });
      });
    });

    db.promotions = [
      { id: 1, slug: 'weekend-fresh', title_ar: 'طازج نهاية الأسبوع', subtitle_ar: 'خصومات على الخضار والفاكهة حتى الجمعة', kind: 'hero', category_id: 1, cta_label: 'تسوّق الخضار', cta_href: '/shop?category=vegetables-fruits', accent: '#3E8E41', sort_order: 1, status: 'active', starts_at: iso(now - 3 * DAY), ends_at: iso(now + 30 * DAY) },
      { id: 2, slug: 'free-delivery', title_ar: 'توصيل مجاني فوق ٥٠٠ جنيه', subtitle_ar: 'على كل الفروع', kind: 'strip', category_id: null, cta_label: 'ابدأ التسوّق', cta_href: '/shop', accent: '#D81E4A', sort_order: 2, status: 'active', starts_at: iso(now - 3 * DAY), ends_at: iso(now + 30 * DAY) },
      { id: 3, slug: 'seafood-deal', title_ar: 'مأكولات بحرية بخصم ١٥٪', subtitle_ar: 'جمبري وسمك طازج', kind: 'banner', category_id: 3, cta_label: 'شوف العرض', cta_href: '/shop?category=seafood', accent: '#1F7A9E', sort_order: 3, status: 'active', starts_at: iso(now - 3 * DAY), ends_at: iso(now + 30 * DAY) },
      { id: 4, slug: 'dairy-week', title_ar: 'أسبوع الألبان', subtitle_ar: 'زبادي وجبنة وبيض بلدي', kind: 'banner', category_id: 4, cta_label: 'تسوّق الألبان', cta_href: '/shop?category=dairy-eggs', accent: '#E6A817', sort_order: 4, status: 'active', starts_at: iso(now - 3 * DAY), ends_at: iso(now + 30 * DAY) },
    ];
    db.coupons = [
      { id: 1, code: 'RUMMAN10', title_ar: 'خصم ١٠٪ على سلتك', type: 'percentage', value: '10.00', min_order_amount: '200.00', max_discount: '100.00', applies_to: 'all', applies_value: null, first_order_only: 0, usage_limit: null, per_user_limit: 5, used_count: 41, starts_at: iso(now - 20 * DAY), ends_at: iso(now + 60 * DAY), status: 'active' },
      { id: 2, code: 'WELCOME50', title_ar: 'خصم ٥٠ جنيه لأول طلب', type: 'fixed', value: '50.00', min_order_amount: '300.00', max_discount: null, applies_to: 'all', applies_value: null, first_order_only: 1, usage_limit: null, per_user_limit: 1, used_count: 12, starts_at: iso(now - 20 * DAY), ends_at: iso(now + 60 * DAY), status: 'active' },
      { id: 3, code: 'FREESHIP', title_ar: 'توصيل مجاني', type: 'free_delivery', value: '0.00', min_order_amount: '150.00', max_discount: null, applies_to: 'all', applies_value: null, first_order_only: 0, usage_limit: null, per_user_limit: 3, used_count: 27, starts_at: iso(now - 20 * DAY), ends_at: iso(now + 60 * DAY), status: 'active' },
      { id: 4, code: 'FRESH15', title_ar: '١٥٪ على الخضار والفاكهة', type: 'percentage', value: '15.00', min_order_amount: '100.00', max_discount: '60.00', applies_to: 'category', applies_value: '1', first_order_only: 0, usage_limit: 200, per_user_limit: 2, used_count: 9, starts_at: iso(now - 20 * DAY), ends_at: iso(now + 60 * DAY), status: 'active' },
    ];

    const U = (id, name, email, phone, role, extra) => ({
      id, uuid: 'demo-' + id, full_name: name, email, phone, role, avatar_url: null, gender: 'unspecified', birth_date: null, preferred_lang: 'ar',
      default_branch_id: 1, loyalty_points: 0, loyalty_tier: 'silver', wallet_balance: '0.00', total_spent: '0.00', orders_count: 0,
      email_verified_at: iso(now - 40 * DAY), created_at: iso(now - 45 * DAY), status: 'active', password: DEMO_PASSWORD, ...extra,
    });
    db.users = [
      U(1, 'منى السيد', 'mona@rumman.demo', '01012345678', 'customer', { loyalty_points: 480, wallet_balance: '150.00', total_spent: '2340.00', orders_count: 5 }),
      U(2, 'سلمى المدير', 'admin@rumman.demo', '01099990001', 'admin', {}),
      U(3, 'كريم مدير الفرع', 'manager@rumman.demo', '01099990002', 'branch_manager', { default_branch_id: 1 }),
    ];
    const names = ['أحمد فتحي', 'هدى محمود', 'يوسف سمير', 'ندى عادل', 'عمر خالد', 'سارة إبراهيم', 'مصطفى حسن', 'رنا طارق'];
    names.forEach((n, i) => {
      db.users.push(U(10 + i, n, 'cust' + i + '@rumman.demo', '0101000' + String(1000 + i), 'customer', { default_branch_id: 1 + (i % 3), orders_count: 3 + (i % 4), total_spent: money(900 + i * 410) }));
    });
    db.addresses = [
      { id: 1, user_id: 1, label: 'المنزل', recipient_name: 'منى السيد', phone: '01012345678', governorate: 'القاهرة', city: 'مدينة نصر', area: 'الحي الثامن', street: '٢٣ شارع عباس العقاد', building: '٤', floor: '٣', apartment: '٧', landmark: 'بجوار صيدلية العزبي', latitude: null, longitude: null, is_default: 1, created_at: iso(now - 40 * DAY), deleted_at: null },
      { id: 2, user_id: 1, label: 'الشغل', recipient_name: 'منى السيد', phone: '01012345678', governorate: 'القاهرة', city: 'التجمع الخامس', area: 'الحي الثالث', street: '١٠ شارع التسعين', building: '١٢', floor: '٢', apartment: null, landmark: null, latitude: null, longitude: null, is_default: 0, created_at: iso(now - 30 * DAY), deleted_at: null },
    ];

    db.seqCart = 0;
    db.carts = {};
    db.orders = [];
    db.reviews = [];
    db.wishlist = [{ user_id: 1, product_id: 7 }, { user_id: 1, product_id: 20 }, { user_id: 1, product_id: 36 }];
    db.notifs = [];
    db.loyaltyTx = [];
    db.walletTx = [];
    db.audit = [];
    db.newsletter = [];
    db.contacts = [];

    let orderSeq = 0;
    function itemRows(pairs) {
      return pairs.map(([pid, qty], k) => {
        const p = db.products.find((x) => x.id === pid);
        return { id: ++db.seqItem, product_id: pid, name_snapshot: p.name_ar, unit_snapshot: p.unit_size, sku_snapshot: p.sku, unit_price: p.price, quantity: qty, line_total: money(Number(p.price) * qty) };
      });
    }
    db.seqItem = 0;
    function makeOrder(o) {
      const branch = db.branches.find((b) => b.id === o.branch);
      const items = itemRows(o.items);
      const subtotal = r2(items.reduce((a, i) => a + Number(i.line_total), 0));
      const delivery = o.pickup ? 0 : subtotal >= Number(branch.free_delivery_over) ? 0 : Number(branch.delivery_fee);
      const discount = o.discount || 0;
      const grand = r2(subtotal - discount + delivery);
      const placed = now - o.daysAgo * DAY - (o.hoursAgo || 0) * 3600000;
      const stamp = new Date(placed);
      const num = 'RMN-' + branch.code + '-' + String(stamp.getFullYear()).slice(2) + String(stamp.getMonth() + 1).padStart(2, '0') + String(stamp.getDate()).padStart(2, '0') + '-' + String(++orderSeq).padStart(4, '0');
      const flow = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
      const timeline = [];
      if (o.status === 'cancelled') {
        timeline.push({ status: 'pending', note: STATUS_NOTES.pending, created_at: iso(placed) }, { status: 'cancelled', note: 'إلغاء من العميل', created_at: iso(placed + 600000) });
      } else {
        const upto = flow.indexOf(o.status);
        for (let k = 0; k <= upto; k += 1) timeline.push({ status: flow[k], note: STATUS_NOTES[flow[k]], created_at: iso(placed + k * 20 * 60000) });
      }
      const order = {
        id: db.orders.length + 1, order_number: num, user_id: o.user, branch_id: o.branch, address_id: o.pickup ? null : 1, fulfillment_type: o.pickup ? 'pickup' : 'delivery',
        status: o.status, payment_method: o.method || 'cod', payment_status: o.status === 'delivered' ? 'paid' : o.method === 'instapay' ? 'awaiting_payment' : 'unpaid',
        subtotal: money(subtotal), discount_total: money(discount), delivery_fee: money(delivery), tax_total: '0.00', points_redeemed: 0, points_value: '0.00',
        grand_total: money(grand), points_earned: Math.floor(subtotal), coupon_code: o.coupon || null, slot_date: H.day(placed), slot_from: '18:00:00', slot_to: '21:00:00',
        customer_note: null, cancel_reason: o.status === 'cancelled' ? 'إلغاء من العميل' : null, placed_at: iso(placed),
        delivered_at: o.status === 'delivered' ? iso(placed + 100 * 60000) : null, rating: o.rating || null, items, timeline,
      };
      db.orders.push(order);
      return order;
    }
    // طلبات منى (العميلة التجريبية)
    makeOrder({ user: 1, branch: 1, items: [[1, 2], [10, 1], [23, 2], [26, 1]], status: 'delivered', daysAgo: 21, rating: 5 });
    makeOrder({ user: 1, branch: 1, items: [[15, 1], [24, 1], [31, 2], [36, 1]], status: 'delivered', daysAgo: 14, rating: 4, coupon: 'RUMMAN10', discount: 38 });
    makeOrder({ user: 1, branch: 1, items: [[7, 2], [27, 2], [28, 1]], status: 'delivered', daysAgo: 8, rating: 5 });
    makeOrder({ user: 1, branch: 2, items: [[20, 1], [14, 2]], status: 'cancelled', daysAgo: 5 });
    makeOrder({ user: 1, branch: 1, items: [[16, 1], [2, 2], [25, 1], [38, 1]], status: 'preparing', daysAgo: 0, hoursAgo: 1, method: 'instapay' });
    // طلبات عملاء آخرين لتغذية التحليلات
    for (let k = 0; k < 70; k += 1) {
      const h = H.hash('ord' + k);
      const status = k < 5 ? ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'][k] : h % 14 === 0 ? 'cancelled' : 'delivered';
      const lines = [];
      for (let l = 0; l < 2 + (h % 4); l += 1) lines.push([1 + (H.hash('l' + k + l) % db.products.length), 1 + (H.hash('q' + k + l) % 3)]);
      makeOrder({ user: 10 + (h % 8), branch: 1 + (h % 3), items: lines, status, daysAgo: k < 5 ? 0 : Math.floor(k / 2.4), hoursAgo: k < 5 ? k : h % 20, method: h % 4 === 0 ? 'instapay' : 'cod', rating: status === 'delivered' && h % 3 ? 3 + (h % 3) : null });
    }
    db.orders.sort((a, b) => (a.placed_at < b.placed_at ? 1 : -1)).forEach((o, i) => { o.id = i + 1; });

    // الإشعارات والنقاط والمحفظة
    const N = (title, body, link, ago, read) => db.notifs.push({ id: db.notifs.length + 1, user_id: 1, type: 'order', title, body, link, read_at: read ? iso(now - ago) : null, created_at: iso(now - ago) });
    const live = db.orders.find((o) => o.user_id === 1 && o.status === 'preparing');
    N('جارٍ تجهيز طلبك', 'طلبك ' + live.order_number + ' بدأ تجهيزه في الفرع.', '/account/orders/' + live.order_number, 40 * 60000, false);
    N('أهلًا بك في رُمّان', 'أضفنا ١٠٠ نقطة ترحيبية إلى رصيدك. استخدمها في أول طلب.', '/account/loyalty', 20 * DAY, true);
    N('تم تسليم طلبك', 'أضفنا نقاط الطلب إلى رصيدك. بالهناء والشفاء.', '/account', 8 * DAY, true);
    db.loyaltyTx = [
      { type: 'earn', points: 100, balance_after: 100, note: 'نقاط ترحيبية', created_at: iso(now - 45 * DAY), order_number: null },
      { type: 'earn', points: 220, balance_after: 320, note: 'نقاط الطلب', created_at: iso(now - 21 * DAY), order_number: db.orders.filter((o) => o.user_id === 1)[3].order_number },
      { type: 'redeem', points: -60, balance_after: 260, note: 'استبدال في طلب', created_at: iso(now - 14 * DAY), order_number: null },
      { type: 'earn', points: 220, balance_after: 480, note: 'نقاط الطلب', created_at: iso(now - 8 * DAY), order_number: null },
    ].reverse();
    db.walletTx = [
      { type: 'credit', amount: '200.00', balance_after: '200.00', reason: 'شحن رصيد', reference: null, created_at: iso(now - 30 * DAY) },
      { type: 'debit', amount: '50.00', balance_after: '150.00', reason: 'دفع طلب', reference: db.orders.filter((o) => o.user_id === 1)[2].order_number, created_at: iso(now - 14 * DAY) },
    ].reverse();
    ['admin.login', 'product.update', 'inventory.adjust', 'coupon.create', 'settings.update'].forEach((a, i) => {
      db.audit.push({ action: a, entity: a.split('.')[0], entity_id: 1 + i, meta: {}, ip_address: '10.0.0.' + (i + 4), created_at: iso(now - i * 4 * 3600000), actor_name: 'سلمى المدير', actor_role: 'admin' });
    });
    for (let k = 0; k < 18; k += 1) {
      const p = db.products[(k * 7) % db.products.length];
      db.reviews.push({ id: k + 1, product_id: p.id, user_id: 10 + (k % 8), rating: 3 + (H.hash('r' + k) % 3), title: ['ممتاز', 'جودة عالية', 'مرضي', 'هيتكرر'][k % 4], body: ['وصل طازج ومتغلف كويس', 'نفس الوصف بالظبط', 'السعر مناسب والجودة كويسة', 'هطلبه تاني'][k % 4], is_verified: 1, helpful_count: k % 6, status: 'published', created_at: iso(now - (k + 1) * DAY) });
    }
  }

  /* ---------- أدوات القراءة ---------- */

  const fmtBranch = (b) => ({
    id: b.id, code: b.code, slug: b.slug, name_ar: b.name_ar, name_en: b.name_en, tagline_ar: b.tagline_ar, address_ar: b.address_ar, address_en: b.address_en,
    city: b.city, governorate: b.governorate, latitude: b.latitude, longitude: b.longitude, phone: b.phone, whatsapp: b.whatsapp, email: b.email,
    opens_at: b.opens_at, closes_at: b.closes_at, is_24h: b.is_24h, delivery_radius_km: b.delivery_radius_km, delivery_fee: b.delivery_fee,
    free_delivery_over: b.free_delivery_over, min_order_amount: b.min_order_amount, avg_prep_minutes: b.avg_prep_minutes,
    supports_pickup: b.supports_pickup, area_sqm: b.area_sqm, opened_year: b.opened_year, status: b.status,
  });

  function isOpenNow(b) {
    if (b.is_24h) return true;
    const d = new Date();
    const m = d.getHours() * 60 + d.getMinutes();
    const t = (s) => { const [h, mm] = String(s).split(':').map(Number); return h * 60 + mm; };
    const o = t(b.opens_at);
    const c = t(b.closes_at);
    return c <= o ? m >= o || m < c : m >= o && m < c;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const rad = (x) => (x * Math.PI) / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return +(2 * R * Math.asin(Math.sqrt(a))).toFixed(2);
  }

  function handle(req, db, H) {
    const { method, path, query, body } = req;
    const b = body || {};
    const num = (v) => (v === undefined || v === '' || v === null ? undefined : Number(v));
    const user = (() => {
      const a = req.header('Authorization') || '';
      const m = /^Bearer demo\.(\d+)\./.exec(a);
      return m ? db.users.find((u) => u.id === Number(m[1]) && u.status === 'active') || null : null;
    })();
    const needUser = () => (user ? null : fail(401, 'سجّل دخولك أولًا', 'NO_TOKEN'));
    const isStaff = user && user.role !== 'customer';
    const isAdmin = user && user.role === 'admin';
    const needManager = () => (!user ? fail(401, 'سجّل دخولك أولًا', 'NO_TOKEN') : isStaff ? null : fail(403, 'هذه الصفحة لفريق العمل فقط', 'FORBIDDEN'));
    const needAdmin = () => (!user ? fail(401, 'سجّل دخولك أولًا', 'NO_TOKEN') : isAdmin ? null : fail(403, 'هذه الصفحة للمدير فقط', 'FORBIDDEN'));

    const cat = (id) => db.categories.find((c) => c.id === id);
    const brand = (id) => db.brands.find((x) => x.id === id);
    const prod = (id) => db.products.find((p) => p.id === Number(id));
    const inv = (branchId, productId) => db.inventory.find((i) => i.branch_id === Number(branchId) && i.product_id === Number(productId));
    const branchOf = (id) => db.branches.find((x) => x.id === Number(id));

    function cardOf(p, branchId) {
      const c = cat(p.category_id);
      const br = brand(p.brand_id);
      const i = branchId ? inv(branchId, p.id) : null;
      const effective = i && i.price_override ? i.price_override : p.price;
      const stock = i ? Math.max(i.quantity - i.reserved, 0) : 999;
      return {
        id: p.id, sku: p.sku, slug: p.slug, name_ar: p.name_ar, name_en: p.name_en, short_desc_ar: p.short_desc_ar, unit: p.unit, unit_size: p.unit_size,
        price: p.price, compare_at_price: p.compare_at_price, badge: p.badge, is_organic: p.is_organic, is_fresh: p.is_fresh, is_exclusive: p.is_exclusive,
        is_featured: p.is_featured, rating_avg: p.rating_avg, rating_count: p.rating_count, sold_count: p.sold_count, max_per_order: p.max_per_order,
        origin_country: p.origin_country, farm_or_maker: p.farm_or_maker, tags: p.tags,
        category_slug: c.slug, category_name: c.name_ar, category_motif: c.motif, category_accent: c.accent_color,
        brand_slug: br ? br.slug : null, brand_name: br ? br.name_ar : null, is_house_label: br ? br.is_house_label : 0,
        effective_price: effective, stock, is_low_stock: i ? (i.quantity - i.reserved <= i.low_stock_threshold ? 1 : 0) : 0, aisle: i ? i.aisle : null,
        in_stock: stock > 0, discount_percent: p.compare_at_price ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100) : 0,
      };
    }
    const live = () => db.products.filter((p) => p.status === 'active' && !p.deleted_at);

    function publicUser(u) {
      const o = {};
      ['id', 'uuid', 'full_name', 'email', 'phone', 'role', 'avatar_url', 'gender', 'birth_date', 'preferred_lang', 'default_branch_id', 'loyalty_points', 'loyalty_tier', 'wallet_balance', 'total_spent', 'orders_count', 'email_verified_at', 'created_at'].forEach((k) => { o[k] = u[k]; });
      return o;
    }
    const tokens = (u) => ({ access_token: 'demo.' + u.id + '.' + H.code(12), refresh_token: 'demo-r.' + u.id + '.' + H.code(16), expires_in: 900 });

    /* ============ المحتوى (من غير مصادقة) ============ */
    if (method === 'GET' && path === '/content/site') {
      const s = Object.fromEntries(db.settings.map((x) => [x.key, x.value]));
      return ok({
        brand: { name: s.brand_name_ar, tagline: s.brand_tagline }, support: { phone: s.support_phone, email: s.support_email },
        loyalty: { points_per_egp: Number(s.points_per_egp), point_value_egp: Number(s.point_value_egp), max_redemption_percent: Number(s.max_points_redemption_percent) },
        counts: { branches: db.branches.length, categories: db.categories.length, products: live().length, governorates: new Set(db.branches.map((x) => x.governorate)).size },
        since_year: Math.min(...db.branches.map((x) => x.opened_year)), free_delivery_from: Math.min(...db.branches.map((x) => Number(x.free_delivery_over))),
        announcements: db.promotions.filter((p) => p.kind === 'strip' && p.status === 'active').map((p) => ({ text: p.title_ar, href: p.cta_href })),
        store_open: s.store_status === 'open',
      });
    }
    if (method === 'GET' && path === '/content/promotions') {
      return ok(db.promotions.filter((p) => p.status === 'active').sort((a, c) => a.sort_order - c.sort_order).map((p) => {
        const c = p.category_id ? cat(p.category_id) : null;
        return { slug: p.slug, title_ar: p.title_ar, subtitle_ar: p.subtitle_ar, kind: p.kind, cta_label: p.cta_label, cta_href: p.cta_href, accent: p.accent, category_slug: c ? c.slug : null, category_name: c ? c.name_ar : null, category_motif: c ? c.motif : null };
      }));
    }
    if (method === 'POST' && path === '/content/contact') {
      if (!b.name || !b.email || !b.subject || !b.message) return fail(422, 'اكمل بيانات الرسالة', 'VALIDATION');
      db.contacts.push(b);
      return created(null, 'وصلتنا رسالتك — نردّ عادةً خلال يوم عمل');
    }
    if (method === 'POST' && path === '/content/newsletter') {
      if (!/^\S+@\S+\.\S+$/.test(b.email || '')) return fail(422, 'بريد إلكتروني غير صالح', 'VALIDATION');
      db.newsletter.push(b.email);
      return ok(null, { message: 'اشتركت في نشرة رُمّان' });
    }
    if (method === 'GET' && path === '/loyalty/tiers') {
      return ok({ tiers: TIERS, point_value_egp: POINT_VALUE, points_per_egp: POINTS_PER_EGP, max_redemption_percent: 50 });
    }
    if (method === 'GET' && path === '/payments/methods') {
      return ok({ methods: [
        { key: 'cod', label: 'الدفع عند الاستلام', note: 'ادفع نقدًا لمندوب التوصيل أو عند الاستلام من الفرع.', instant: false },
        { key: 'instapay', label: 'إنستاباي', note: 'حوّل المبلغ ثم ارفع صورة الإيصال — نراجعه خلال دقائق ونبدأ التجهيز.', instant: false, instructions: { address: 'rumman@instapay', account_name: 'رُمّان للتجارة', window_hours: 24 } },
      ] });
    }

    /* ============ الفروع والكتالوج ============ */
    if (method === 'GET' && path === '/branches') {
      const lat = num(query.lat);
      const lng = num(query.lng);
      let list = db.branches.filter((x) => x.status !== 'closed');
      if (query.city) list = list.filter((x) => x.city.includes(query.city) || x.governorate.includes(query.city));
      list = list.map((x) => ({
        ...fmtBranch(x), available_products: db.inventory.filter((i) => i.branch_id === x.id && i.quantity > 0).length,
        is_open_now: isOpenNow(x), distance_km: lat != null && lng != null ? haversine(lat, lng, x.latitude, x.longitude) : null,
      }));
      if (lat != null && lng != null) list.sort((a, c) => a.distance_km - c.distance_km);
      return ok(list);
    }
    if (method === 'GET' && path === '/branches/nearest') {
      const lat = num(query.lat);
      const lng = num(query.lng);
      const list = db.branches.map((x) => ({ ...fmtBranch(x), is_open_now: isOpenNow(x), distance_km: haversine(lat, lng, x.latitude, x.longitude) })).sort((a, c) => a.distance_km - c.distance_km);
      return ok({ ...list[0], within_delivery_range: list[0].distance_km <= Number(list[0].delivery_radius_km) });
    }
    let m = /^\/branches\/([^/]+)$/.exec(path);
    if (method === 'GET' && m) {
      const x = /^\d+$/.test(m[1]) ? branchOf(m[1]) : db.branches.find((y) => y.slug === m[1]);
      if (!x) return fail(404, 'الفرع غير موجود');
      const stock = db.inventory.filter((i) => i.branch_id === x.id);
      return ok({
        ...fmtBranch(x), is_open_now: isOpenNow(x), distance_km: null,
        hours: db.hours.filter((h) => h.branch_id === x.id).map((h) => ({ weekday: h.weekday, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed })),
        delivery_zones: db.zones.filter((z) => z.branch_id === x.id && z.status === 'active').map((z) => ({ id: z.id, name_ar: z.name_ar, name_en: z.name_en, delivery_fee: z.delivery_fee, min_order: z.min_order, eta_minutes: z.eta_minutes })),
        stats: { products_count: stock.length, low_stock_count: stock.filter((i) => i.quantity - i.reserved <= i.low_stock_threshold).length },
      });
    }

    if (method === 'GET' && path === '/categories') {
      const bid = num(query.branch_id);
      return ok(db.categories.filter((c) => c.status === 'active' && !c.deleted_at).sort((a, c) => a.sort_order - c.sort_order).map((c) => ({
        id: c.id, parent_id: c.parent_id, slug: c.slug, name_ar: c.name_ar, name_en: c.name_en, tagline_ar: c.tagline_ar, description_ar: c.description_ar,
        motif: c.motif, accent_color: c.accent_color, aisle_code: c.aisle_code, sort_order: c.sort_order, is_featured: c.is_featured,
        products_count: live().filter((p) => p.category_id === c.id && (!bid || (inv(bid, p.id) && inv(bid, p.id).quantity - inv(bid, p.id).reserved > 0))).length,
      })));
    }
    m = /^\/categories\/([^/]+)$/.exec(path);
    if (method === 'GET' && m) {
      const c = db.categories.find((x) => x.slug === m[1] && x.status === 'active');
      if (!c) return fail(404, 'القسم غير موجود');
      const bid = num(query.branch_id);
      const prices = live().filter((p) => p.category_id === c.id).map((p) => Number(bid && inv(bid, p.id) && inv(bid, p.id).price_override ? inv(bid, p.id).price_override : p.price));
      return ok({ ...c, children: [], price_range: { min_price: prices.length ? Math.min(...prices) : null, max_price: prices.length ? Math.max(...prices) : null } });
    }

    if (method === 'GET' && path === '/products/suggest') {
      const q = String(query.q || '').trim();
      const bid = num(query.branch_id);
      const items = live().filter((p) => p.name_ar.includes(q)).sort((a, c) => c.sold_count - a.sold_count).slice(0, 8).map((p) => {
        const c = cat(p.category_id);
        const i = bid ? inv(bid, p.id) : null;
        return { id: p.id, slug: p.slug, name_ar: p.name_ar, unit_size: p.unit_size, category_name: c.name_ar, category_motif: c.motif, category_accent: c.accent_color, effective_price: i && i.price_override ? i.price_override : p.price };
      });
      return ok({ items, trending: [{ term: 'بيض', hits: 31 }, { term: 'فراخ', hits: 24 }, { term: 'لبن', hits: 19 }, { term: 'عسل', hits: 12 }] });
    }
    if (method === 'GET' && path === '/products/trending') return ok([{ term: 'بيض', hits: 31 }, { term: 'فراخ', hits: 24 }]);
    if (method === 'GET' && path === '/products/recently-viewed') return ok([]);
    if (method === 'GET' && path === '/products') {
      const bid = num(query.branch_id);
      const bool = (v) => ['true', '1'].includes(String(v));
      let list = live().map((p) => cardOf(p, bid));
      if (query.category) list = list.filter((p) => p.category_slug === query.category);
      if (query.brand) list = list.filter((p) => p.brand_slug === query.brand);
      if (query.search) list = list.filter((p) => p.name_ar.includes(query.search) || (p.short_desc_ar || '').includes(query.search) || (p.farm_or_maker || '').includes(query.search));
      if (num(query.min_price) !== undefined) list = list.filter((p) => Number(p.effective_price) >= num(query.min_price));
      if (num(query.max_price) !== undefined) list = list.filter((p) => Number(p.effective_price) <= num(query.max_price));
      if (num(query.min_rating) !== undefined) list = list.filter((p) => Number(p.rating_avg) >= num(query.min_rating));
      if (bool(query.organic)) list = list.filter((p) => p.is_organic);
      if (bool(query.exclusive)) list = list.filter((p) => p.is_exclusive);
      if (bool(query.featured)) list = list.filter((p) => p.is_featured);
      if (bool(query.on_sale)) list = list.filter((p) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price));
      if (bool(query.in_stock) && bid) list = list.filter((p) => p.stock > 0);
      const sorts = {
        featured: (a, c) => c.is_featured - a.is_featured || c.sold_count - a.sold_count, newest: (a, c) => c.id - a.id,
        price_asc: (a, c) => Number(a.effective_price) - Number(c.effective_price), price_desc: (a, c) => Number(c.effective_price) - Number(a.effective_price),
        rating: (a, c) => Number(c.rating_avg) - Number(a.rating_avg), popular: (a, c) => c.sold_count - a.sold_count, name: (a, c) => a.name_ar.localeCompare(c.name_ar, 'ar'),
      };
      list.sort(sorts[query.sort] || sorts.featured);
      const limit = Math.min(Math.max(num(query.limit) || 24, 1), 100);
      const page = Math.max(num(query.page) || 1, 1);
      return paged(list.slice((page - 1) * limit, page * limit), page, limit, list.length);
    }
    m = /^\/products\/([^/]+)$/.exec(path);
    if (method === 'GET' && m) {
      const p = db.products.find((x) => x.slug === m[1] && x.status === 'active');
      if (!p) return fail(404, 'المنتج غير موجود');
      const bid = num(query.branch_id);
      const c = cat(p.category_id);
      p.view_count += 1;
      const base = cardOf(p, bid);
      return ok({
        ...base, description_ar: p.description_ar, barcode: p.barcode, nutrition: p.nutrition, allergens: p.allergens, storage_ar: p.storage_ar,
        shelf_life_days: p.shelf_life_days, tax_rate: p.tax_rate, view_count: p.view_count, category_id: p.category_id, category_tagline: c.tagline_ar,
        availability: db.branches.map((x) => { const i = inv(x.id, p.id); return { branch_id: x.id, name_ar: x.name_ar, slug: x.slug, city: x.city, stock: i ? Math.max(i.quantity - i.reserved, 0) : 0, price: i && i.price_override ? i.price_override : p.price }; }),
        related: live().filter((x) => x.category_id === p.category_id && x.id !== p.id).sort((a, d) => d.sold_count - a.sold_count).slice(0, 8).map((x) => cardOf(x, bid)),
        frequently_bought_together: live().filter((x) => x.id !== p.id && x.category_id !== p.category_id).sort((a, d) => H.hash('t' + p.id + a.id) - H.hash('t' + p.id + d.id)).slice(0, 4).map((x) => ({ ...cardOf(x, bid), together_count: 3 + (H.hash('c' + x.id) % 20) })),
      });
    }

    m = /^\/reviews\/product\/(\d+)$/.exec(path);
    if (method === 'GET' && m) {
      const rows = db.reviews.filter((r) => r.product_id === Number(m[1]) && r.status === 'published').sort((a, c) => (a.created_at < c.created_at ? 1 : -1));
      const dist = [5, 4, 3, 2, 1].map((n) => ({ rating: n, total: rows.filter((r) => r.rating === n).length }));
      const page = Math.max(num(query.page) || 1, 1);
      const limit = Math.min(num(query.limit) || 10, 50);
      return ok({
        items: rows.slice((page - 1) * limit, page * limit).map((r) => {
          const u = db.users.find((x) => x.id === r.user_id);
          return { id: r.id, rating: r.rating, title: r.title, body: r.body, is_verified: r.is_verified, helpful_count: r.helpful_count, created_at: r.created_at, author: u ? u.full_name.split(' ')[0] : 'عميل' };
        }),
        distribution: dist,
      }, { meta: { page, limit, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / limit)), hasNext: page * limit < rows.length, hasPrev: page > 1 } });
    }

    /* ============ المصادقة ============ */
    if (method === 'POST' && path === '/auth/login') {
      const id = String(b.email || b.identifier || '').trim().toLowerCase();
      const u = db.users.find((x) => (x.email === id || x.phone === id) && x.status === 'active');
      if (!u || u.password !== String(b.password)) return fail(401, 'البريد أو كلمة المرور غير صحيحة', 'INVALID_CREDENTIALS');
      return ok({ user: publicUser(u), tokens: tokens(u) }, { message: 'أهلًا بعودتك' });
    }
    if (method === 'POST' && path === '/auth/register') {
      const email = String(b.email || '').trim().toLowerCase();
      if (!b.full_name || !email || !b.password) return fail(422, 'اكمل البيانات المطلوبة', 'VALIDATION');
      if (String(b.password).length < 8) return fail(422, 'كلمة المرور ٨ أحرف على الأقل', 'VALIDATION', { password: 'كلمة المرور ٨ أحرف على الأقل' });
      if (db.users.some((x) => x.email === email)) return fail(409, 'هذا البريد مسجّل بالفعل', 'ACCOUNT_EXISTS');
      const id = Math.max(...db.users.map((x) => x.id)) + 1;
      const u = { id, uuid: 'demo-' + id, full_name: String(b.full_name).trim(), email, phone: b.phone || null, role: 'customer', avatar_url: null, gender: 'unspecified', birth_date: null, preferred_lang: 'ar', default_branch_id: null, loyalty_points: 100, loyalty_tier: 'silver', wallet_balance: '0.00', total_spent: '0.00', orders_count: 0, email_verified_at: null, created_at: H.iso(H.now()), status: 'active', password: String(b.password) };
      db.users.push(u);
      db.loyaltyTx.unshift({ user_id: id, type: 'earn', points: 100, balance_after: 100, note: 'نقاط ترحيبية', created_at: H.iso(H.now()), order_number: null });
      return created({ user: publicUser(u), tokens: tokens(u), email_verification_sent: false }, 'أهلًا بك في رُمّان');
    }
    if (method === 'POST' && path === '/auth/refresh') {
      const r = /^demo-r\.(\d+)\./.exec(b.refresh_token || '');
      const u = r ? db.users.find((x) => x.id === Number(r[1])) : null;
      if (!u) return fail(401, 'انتهت الجلسة', 'INVALID_REFRESH');
      return ok({ user: publicUser(u), tokens: tokens(u) });
    }
    if (method === 'POST' && path === '/auth/logout') return ok(null, { message: 'تم تسجيل الخروج' });
    if (method === 'POST' && ['/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'].includes(path)) {
      return ok({ sent: true }, { message: 'ده عرض تجريبي — لا يُرسَل بريد حقيقي' });
    }

    /* ============ يلزم تسجيل دخول ============ */
    // شرائح التوصيل مفتوحة من غير تسجيل دخول (زي السيرفر الحقيقي)
    const gate = path === '/orders/slots' ? null : needUser();
    if (gate) return gate;

    if (method === 'GET' && path === '/auth/me') return ok(publicUser(user));
    if (method === 'GET' && path === '/auth/sessions') return ok([{ id: 1, user_agent: 'هذا الجهاز', created_at: H.iso(H.now()), current: true }]);
    if (method === 'POST' && path === '/auth/change-password') {
      if (user.password !== String(b.current_password || b.currentPassword)) return fail(401, 'كلمة المرور الحالية غير صحيحة', 'INVALID_PASSWORD');
      user.password = String(b.new_password || b.newPassword || user.password);
      return ok({ changed: true }, { message: 'تم تغيير كلمة المرور' });
    }
    if (method === 'POST' && path === '/auth/resend-verification') return ok({ sent: true });

    /* --- الحساب --- */
    if (method === 'GET' && path === '/users/profile') {
      const idx = TIERS.findIndex((t) => t.key === user.loyalty_tier);
      const next = TIERS[idx + 1] || null;
      return ok({ ...publicUser(user), tier: TIERS[idx], next_tier: next, spend_to_next_tier: next ? Math.max(0, next.minSpent - Number(user.total_spent)) : 0 });
    }
    if (method === 'PATCH' && path === '/users/profile') {
      ['full_name', 'phone', 'birth_date', 'gender', 'preferred_lang', 'default_branch_id', 'avatar_url'].forEach((k) => { if (b[k] !== undefined) user[k] = b[k]; });
      return ok(null, { message: 'تم تحديث بياناتك' });
    }
    if (method === 'GET' && path === '/users/summary') {
      const mine = db.orders.filter((o) => o.user_id === user.id).sort((a, c) => (a.placed_at < c.placed_at ? 1 : -1));
      const last = mine[0];
      return ok({
        orders: { total: mine.length, delivered: mine.filter((o) => o.status === 'delivered').length, active: mine.filter((o) => OPEN_STATUSES.includes(o.status)).length },
        wishlist_count: db.wishlist.filter((w) => w.user_id === user.id).length,
        unread_notifications: db.notifs.filter((n) => n.user_id === user.id && !n.read_at).length,
        last_order: last ? { order_number: last.order_number, status: last.status, grand_total: last.grand_total, placed_at: last.placed_at, branch_name: branchOf(last.branch_id).name_ar } : null,
        loyalty_points: user.loyalty_points, wallet_balance: user.wallet_balance,
      });
    }
    if (method === 'GET' && path === '/users/wallet') {
      return ok({ balance: user.wallet_balance, transactions: user.id === 1 ? db.walletTx : db.walletTx.filter((t) => t.user_id === user.id) });
    }
    if (method === 'GET' && path === '/loyalty') {
      const tx = db.loyaltyTx.filter((t) => t.user_id === undefined ? user.id === 1 : t.user_id === user.id);
      const idx = TIERS.findIndex((t) => t.key === user.loyalty_tier);
      return ok({
        balance: user.loyalty_points, value_egp: +(user.loyalty_points * POINT_VALUE).toFixed(2), tier: TIERS[idx], next_tier: TIERS[idx + 1] || null,
        stats: { total_earned: tx.filter((t) => t.points > 0).reduce((a, t) => a + t.points, 0), total_redeemed: tx.filter((t) => t.points < 0).reduce((a, t) => a - t.points, 0) },
        transactions: tx,
      });
    }

    /* --- العناوين --- */
    if (path === '/addresses' || /^\/addresses\/\d+$/.test(path)) {
      const mine = () => db.addresses.filter((a) => a.user_id === user.id && !a.deleted_at);
      if (method === 'GET' && path === '/addresses') return ok(mine().sort((a, c) => c.is_default - a.is_default));
      if (method === 'POST' && path === '/addresses') {
        if (!b.recipient_name || !b.street || !b.phone) return fail(422, 'اكمل بيانات العنوان', 'VALIDATION');
        const first = mine().length === 0;
        const a = { id: Math.max(0, ...db.addresses.map((x) => x.id)) + 1, user_id: user.id, label: b.label || 'المنزل', recipient_name: b.recipient_name, phone: b.phone, governorate: b.governorate || 'القاهرة', city: b.city || '', area: b.area || null, street: b.street, building: b.building || null, floor: b.floor || null, apartment: b.apartment || null, landmark: b.landmark || null, latitude: b.latitude || null, longitude: b.longitude || null, is_default: first || b.is_default ? 1 : 0, created_at: H.iso(H.now()), deleted_at: null };
        if (a.is_default) mine().forEach((x) => { x.is_default = 0; });
        db.addresses.push(a);
        return created(a, 'أُضيف العنوان');
      }
      const mm = /^\/addresses\/(\d+)$/.exec(path);
      const a = mm ? mine().find((x) => x.id === Number(mm[1])) : null;
      if (mm && !a) return fail(404, 'العنوان غير موجود');
      if (mm && method === 'PATCH') {
        Object.keys(b).forEach((k) => { if (k in a && k !== 'id' && k !== 'user_id') a[k] = b[k]; });
        if (b.is_default) mine().forEach((x) => { x.is_default = x.id === a.id ? 1 : 0; });
        return ok(a, { message: 'تم تحديث العنوان' });
      }
      if (mm && method === 'DELETE') {
        a.deleted_at = H.iso(H.now());
        return ok(null, { message: 'حُذف العنوان' });
      }
    }

    /* --- المفضلة --- */
    if (method === 'GET' && path === '/wishlist/ids') return ok(db.wishlist.filter((w) => w.user_id === user.id).map((w) => w.product_id));
    if (method === 'GET' && path === '/wishlist') {
      const bid = num(query.branch_id);
      return ok(db.wishlist.filter((w) => w.user_id === user.id).map((w) => prod(w.product_id)).filter(Boolean).map((p) => cardOf(p, bid)));
    }
    if (method === 'POST' && path === '/wishlist/toggle') {
      const pid = Number(b.product_id);
      const i = db.wishlist.findIndex((w) => w.user_id === user.id && w.product_id === pid);
      if (i >= 0) { db.wishlist.splice(i, 1); return ok({ in_wishlist: false }, { message: 'أُزيل من المفضّلة' }); }
      db.wishlist.push({ user_id: user.id, product_id: pid });
      return ok({ in_wishlist: true }, { message: 'أُضيف إلى المفضّلة' });
    }
    m = /^\/wishlist\/(\d+)$/.exec(path);
    if (method === 'DELETE' && m) {
      db.wishlist = db.wishlist.filter((w) => !(w.user_id === user.id && w.product_id === Number(m[1])));
      return ok(null, { message: 'أُزيل من المفضّلة' });
    }

    /* --- الإشعارات --- */
    if (method === 'GET' && path === '/notifications') {
      const mine = db.notifs.filter((n) => n.user_id === user.id).sort((a, c) => c.id - a.id);
      return ok({ items: mine.slice(0, 50), unread_count: mine.filter((n) => !n.read_at).length });
    }
    if (method === 'POST' && path === '/notifications/read-all') {
      db.notifs.forEach((n) => { if (n.user_id === user.id) n.read_at = n.read_at || H.iso(H.now()); });
      return ok(null, { message: 'تم تعليم الكل كمقروء' });
    }
    m = /^\/notifications\/(\d+)\/read$/.exec(path);
    if (method === 'POST' && m) {
      const n = db.notifs.find((x) => x.id === Number(m[1]) && x.user_id === user.id);
      if (n) n.read_at = n.read_at || H.iso(H.now());
      return ok(null);
    }

    /* --- التقييمات --- */
    if (method === 'GET' && path === '/reviews/pending') return ok([]);
    if (method === 'POST' && path === '/reviews') {
      if (!b.product_id || !b.rating) return fail(422, 'التقييم مطلوب', 'VALIDATION');
      const r = { id: db.reviews.length + 1, product_id: Number(b.product_id), user_id: user.id, rating: Number(b.rating), title: b.title || null, body: b.body || null, is_verified: 1, helpful_count: 0, status: 'published', created_at: H.iso(H.now()) };
      db.reviews.push(r);
      return created(r, 'شكرًا — نُشر تقييمك');
    }
    m = /^\/reviews\/(\d+)(?:\/(helpful))?$/.exec(path);
    if (m) {
      const r = db.reviews.find((x) => x.id === Number(m[1]));
      if (!r) return fail(404, 'التقييم غير موجود');
      if (method === 'POST' && m[2]) { r.helpful_count += 1; return ok({ voted: true }); }
      if (method === 'PATCH') { Object.assign(r, { rating: b.rating || r.rating, title: b.title ?? r.title, body: b.body ?? r.body }); return ok(null, { message: 'تم تحديث تقييمك' }); }
      if (method === 'DELETE') { db.reviews = db.reviews.filter((x) => x.id !== r.id); return ok(null, { message: 'حُذف تقييمك' }); }
    }

    /* --- الكوبونات --- */
    if (method === 'GET' && path === '/coupons') {
      return ok(db.coupons.filter((c) => c.status === 'active' && (c.usage_limit === null || c.used_count < c.usage_limit)).map((c) => ({ code: c.code, title_ar: c.title_ar, type: c.type, value: c.value, min_order_amount: c.min_order_amount, max_discount: c.max_discount, ends_at: c.ends_at })));
    }

    /* --- السلة (للمستخدم المسجّل) --- */
    const cartOf = (branchId) => {
      const key = user.id + ':' + branchId;
      if (!db.carts[key]) db.carts[key] = { items: [], coupon_code: null };
      return db.carts[key];
    };
    function snapshot(branchId) {
      const br = branchOf(branchId);
      const cart = cartOf(branchId);
      const items = cart.items.map((it) => {
        const p = prod(it.product_id);
        const c = cat(p.category_id);
        const i = inv(branchId, p.id);
        const stock = i ? Math.max(i.quantity - i.reserved, 0) : 0;
        const unit = i && i.price_override ? i.price_override : p.price;
        const issues = [];
        if (stock <= 0) issues.push({ type: 'out_of_stock', message: 'نفد من هذا الفرع' });
        else if (it.quantity > stock) issues.push({ type: 'insufficient', message: 'المتاح ' + stock + ' فقط' });
        if (it.quantity > p.max_per_order) issues.push({ type: 'max_per_order', message: 'الحد الأقصى ' + p.max_per_order + ' للطلب' });
        return { cart_item_id: it.id, quantity: it.quantity, note: it.note || null, product_id: p.id, slug: p.slug, name_ar: p.name_ar, unit: p.unit, unit_size: p.unit_size, max_per_order: p.max_per_order, compare_at_price: p.compare_at_price, tax_rate: p.tax_rate, category_id: c.id, category_name: c.name_ar, category_motif: c.motif, category_accent: c.accent_color, unit_price: unit, stock, line_total: r2(Number(unit) * it.quantity), issues };
      });
      const subtotal = r2(items.reduce((a, it) => a + Number(it.unit_price) * it.quantity, 0));
      let discount = 0;
      let freeDelivery = false;
      let coupon = null;
      if (cart.coupon_code) {
        const v = validateCoupon(cart.coupon_code, subtotal, br.delivery_fee, items);
        if (v.error) cart.coupon_code = null;
        else { discount = v.discount; freeDelivery = v.freeDelivery; coupon = v.coupon; }
      }
      return {
        cart_id: user.id * 1000 + Number(branchId), branch: { id: br.id, name_ar: br.name_ar, slug: br.slug, delivery_fee: br.delivery_fee }, items,
        items_count: items.reduce((a, it) => a + it.quantity, 0), coupon, totals: totalsOf(items, br, { discount, freeDelivery }), has_issues: items.some((it) => it.issues.length),
      };
    }
    function totalsOf(items, br, { discount = 0, freeDelivery = false, pointsValue = 0 } = {}) {
      const subtotal = r2(items.reduce((a, it) => a + Number(it.unit_price) * it.quantity, 0));
      const qualifies = subtotal >= Number(br.free_delivery_over);
      const delivery = freeDelivery || qualifies ? 0 : r2(br.delivery_fee);
      const grand = Math.max(0, r2(subtotal - discount - pointsValue + delivery));
      return {
        subtotal, discount_total: r2(discount), points_value: r2(pointsValue), delivery_fee: delivery, tax_total: 0, grand_total: grand,
        free_delivery_applied: delivery === 0, amount_to_free_delivery: qualifies ? 0 : r2(Number(br.free_delivery_over) - subtotal),
        meets_minimum: subtotal >= Number(br.min_order_amount), minimum_required: r2(br.min_order_amount),
      };
    }
    function validateCoupon(code, subtotal, deliveryFee, items) {
      const c = db.coupons.find((x) => x.code === String(code).trim().toUpperCase());
      if (!c) return { error: fail(400, 'كود الخصم غير صحيح', 'COUPON_NOT_FOUND') };
      if (c.status !== 'active') return { error: fail(400, 'هذا الكود غير مفعّل حاليًا', 'COUPON_INACTIVE') };
      if (new Date(c.ends_at) < new Date()) return { error: fail(400, 'انتهت صلاحية هذا الكود', 'COUPON_EXPIRED') };
      if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { error: fail(400, 'استُنفد هذا العرض بالكامل', 'COUPON_EXHAUSTED') };
      if (subtotal < Number(c.min_order_amount)) return { error: fail(400, 'الحد الأدنى لاستخدام هذا الكود ' + Number(c.min_order_amount) + ' ج.م', 'COUPON_MIN_ORDER') };
      const isFirst = !db.orders.some((o) => o.user_id === user.id && o.status !== 'cancelled');
      if (c.first_order_only && !isFirst) return { error: fail(400, 'هذا الكود مخصّص للطلب الأول فقط', 'COUPON_FIRST_ONLY') };
      let eligible = subtotal;
      if (c.applies_to === 'category') eligible = r2(items.filter((it) => Number(it.category_id) === Number(c.applies_value)).reduce((a, it) => a + Number(it.unit_price) * it.quantity, 0));
      if (eligible <= 0) return { error: fail(400, 'لا توجد أصناف مؤهّلة لهذا الكود في سلتك', 'COUPON_NO_ELIGIBLE') };
      let discount = 0;
      let freeDelivery = false;
      if (c.type === 'percentage') { discount = r2(eligible * Number(c.value) / 100); if (c.max_discount) discount = Math.min(discount, Number(c.max_discount)); }
      else if (c.type === 'fixed') discount = Math.min(Number(c.value), eligible);
      else if (c.type === 'free_delivery') { freeDelivery = true; discount = r2(deliveryFee); }
      return { coupon: { id: c.id, code: c.code, title_ar: c.title_ar, type: c.type, value: c.value }, discount: r2(discount), freeDelivery };
    }
    function branchCheck(id) {
      const br = branchOf(id);
      if (!br) return { error: fail(404, 'الفرع غير موجود') };
      if (br.status !== 'active') return { error: fail(400, 'هذا الفرع لا يستقبل طلبات حاليًا') };
      return { br };
    }

    if (method === 'GET' && path === '/cart') {
      const c = branchCheck(num(query.branch_id));
      return c.error || ok(snapshot(c.br.id));
    }
    if (method === 'POST' && path === '/cart/items') {
      const c = branchCheck(num(b.branch_id));
      if (c.error) return c.error;
      const p = prod(b.product_id);
      if (!p || p.status !== 'active') return fail(404, 'المنتج غير متاح');
      const i = inv(c.br.id, p.id);
      const stock = i ? Math.max(i.quantity - i.reserved, 0) : 0;
      if (stock <= 0) return fail(400, '«' + p.name_ar + '» نفد من هذا الفرع', 'OUT_OF_STOCK');
      const cart = cartOf(c.br.id);
      const ex = cart.items.find((x) => x.product_id === p.id);
      const desired = (ex ? ex.quantity : 0) + (Number(b.quantity) || 1);
      if (desired > stock) return fail(400, 'المتاح من «' + p.name_ar + '» هو ' + stock + ' فقط', 'INSUFFICIENT_STOCK');
      if (desired > p.max_per_order) return fail(400, 'الحد الأقصى ' + p.max_per_order + ' من «' + p.name_ar + '» في الطلب الواحد', 'MAX_PER_ORDER');
      if (ex) { ex.quantity = desired; if (b.note) ex.note = b.note; }
      else cart.items.push({ id: H.seq(db, 'cartItem'), product_id: p.id, quantity: desired, note: b.note || null });
      return ok(snapshot(c.br.id));
    }
    if (method === 'POST' && path === '/cart/merge') {
      const c = branchCheck(num(b.branch_id));
      if (c.error) return c.error;
      (b.items || []).forEach((g) => {
        const p = prod(g.product_id);
        const i = p && inv(c.br.id, p.id);
        if (!p || !i || i.quantity - i.reserved <= 0) return;
        const cart = cartOf(c.br.id);
        const ex = cart.items.find((x) => x.product_id === p.id);
        const q = Math.min((ex ? ex.quantity : 0) + (Number(g.quantity) || 1), p.max_per_order, i.quantity - i.reserved);
        if (ex) ex.quantity = q; else cart.items.push({ id: H.seq(db, 'cartItem'), product_id: p.id, quantity: q, note: null });
      });
      return ok(snapshot(c.br.id));
    }
    m = /^\/cart\/items\/(\d+)$/.exec(path);
    if (m && (method === 'PATCH' || method === 'DELETE')) {
      const bid = method === 'PATCH' ? num(b.branch_id) : num(query.branch_id);
      const c = branchCheck(bid);
      if (c.error) return c.error;
      const cart = cartOf(c.br.id);
      const pid = Number(m[1]);
      if (method === 'DELETE' || Number(b.quantity) <= 0) {
        cart.items = cart.items.filter((x) => x.product_id !== pid);
        return ok(snapshot(c.br.id));
      }
      const ex = cart.items.find((x) => x.product_id === pid);
      if (!ex) return fail(404, 'الصنف غير موجود في سلتك');
      const p = prod(pid);
      const i = inv(c.br.id, pid);
      const stock = i ? Math.max(i.quantity - i.reserved, 0) : 0;
      if (Number(b.quantity) > stock) return fail(400, 'المتاح ' + stock + ' فقط', 'INSUFFICIENT_STOCK');
      if (Number(b.quantity) > p.max_per_order) return fail(400, 'الحد الأقصى ' + p.max_per_order, 'MAX_PER_ORDER');
      ex.quantity = Number(b.quantity);
      return ok(snapshot(c.br.id));
    }
    if (method === 'DELETE' && path === '/cart') {
      const c = branchCheck(num(query.branch_id));
      if (c.error) return c.error;
      const cart = cartOf(c.br.id);
      cart.items = [];
      cart.coupon_code = null;
      return ok(snapshot(c.br.id));
    }
    if ((method === 'POST' && (path === '/cart/coupon' || path === '/coupons/validate')) || (method === 'DELETE' && path === '/cart/coupon')) {
      const bid = method === 'DELETE' ? num(query.branch_id) : num(b.branch_id);
      const c = branchCheck(bid);
      if (c.error) return c.error;
      const cart = cartOf(c.br.id);
      if (method === 'DELETE') { cart.coupon_code = null; return ok(snapshot(c.br.id)); }
      const snap = snapshot(c.br.id);
      if (!snap.items.length) return fail(400, 'سلتك فارغة');
      const v = validateCoupon(b.code, snap.totals.subtotal, c.br.delivery_fee, snap.items);
      if (v.error) return v.error;
      cart.coupon_code = String(b.code).trim().toUpperCase();
      return ok(snapshot(c.br.id), { message: 'تم تطبيق الكود' });
    }

    /* --- الطلبات --- */
    function orderView(o, withDetail) {
      const br = branchOf(o.branch_id);
      const base = {
        id: o.id, order_number: o.order_number, status: o.status, fulfillment_type: o.fulfillment_type, payment_method: o.payment_method, payment_status: o.payment_status,
        subtotal: o.subtotal, discount_total: o.discount_total, delivery_fee: o.delivery_fee, tax_total: o.tax_total, points_redeemed: o.points_redeemed,
        points_value: o.points_value, grand_total: o.grand_total, points_earned: o.points_earned, coupon_code: o.coupon_code, slot_date: o.slot_date,
        slot_from: o.slot_from, slot_to: o.slot_to, customer_note: o.customer_note, cancel_reason: o.cancel_reason, placed_at: o.placed_at, delivered_at: o.delivered_at,
        rating: o.rating, branch_name: br.name_ar, branch_slug: br.slug, branch_phone: br.phone, branch_address: br.address_ar, avg_prep_minutes: br.avg_prep_minutes,
      };
      if (!withDetail) return { ...base, items_count: o.items.length, preview_items: o.items.slice(0, 3).map((i) => ({ name_snapshot: i.name_snapshot, quantity: i.quantity })) };
      const cu = db.users.find((u) => u.id === o.user_id);
      const addr = db.addresses.find((a) => a.id === o.address_id) || null;
      const pay = {
        provider: o.payment_method, amount: o.grand_total, status: o.payment_status === 'paid' ? 'succeeded' : o.payment_method === 'instapay' ? 'awaiting_proof' : 'pending',
        transaction_ref: null, fawry_reference: null, expires_at: null, proof_url: null, proof_uploaded_at: null, sender_name: null, review_note: null, reviewed_at: null, created_at: o.placed_at,
      };
      return {
        ...base, user_id: o.user_id, branch_id: o.branch_id, address_id: o.address_id, customer_name: cu ? cu.full_name : 'عميل', customer_phone: cu ? cu.phone : null,
        items: o.items.map((i) => { const p = prod(i.product_id); const c = p ? cat(p.category_id) : null; return { ...i, order_id: o.id, slug: p ? p.slug : null, category_motif: c ? c.motif : null, category_accent: c ? c.accent_color : null }; }),
        timeline: o.timeline, address: addr, payment: pay, can_cancel: ['pending', 'confirmed'].includes(o.status), can_reorder: ['delivered', 'cancelled'].includes(o.status),
      };
    }
    function setStatus(o, next, note) {
      if (!(TRANSITIONS[o.status] || []).includes(next)) return fail(400, 'لا يمكن الانتقال من «' + o.status + '» إلى «' + next + '»', 'INVALID_TRANSITION');
      o.status = next;
      o.timeline.push({ status: next, note: note || STATUS_NOTES[next], created_at: H.iso(H.now()) });
      if (next === 'delivered') {
        o.delivered_at = H.iso(H.now());
        if (o.payment_method === 'cod') o.payment_status = 'paid';
        const cu = db.users.find((u) => u.id === o.user_id);
        if (cu) {
          cu.loyalty_points += o.points_earned;
          cu.total_spent = money(Number(cu.total_spent) + Number(o.grand_total));
          cu.orders_count += 1;
          const tier = [...TIERS].reverse().find((t) => Number(cu.total_spent) >= t.minSpent);
          cu.loyalty_tier = tier.key;
          db.loyaltyTx.unshift({ user_id: cu.id, type: 'earn', points: o.points_earned, balance_after: cu.loyalty_points, note: 'نقاط الطلب ' + o.order_number, created_at: H.iso(H.now()), order_number: o.order_number });
        }
      }
      if (next === 'cancelled') {
        o.cancel_reason = o.cancel_reason || note || 'إلغاء';
        o.items.forEach((it) => { const i = inv(o.branch_id, it.product_id); if (i) i.reserved = Math.max(i.reserved - it.quantity, 0); });
      }
      db.notifs.push({ id: db.notifs.length + 1, user_id: o.user_id, type: 'order', title: STATUS_NOTES[next], body: 'الطلب ' + o.order_number + ' — ' + STATUS_NOTES[next], link: '/account/orders/' + o.order_number, read_at: null, created_at: H.iso(H.now()) });
      return null;
    }

    if (method === 'GET' && path === '/orders/slots') {
      const date = query.date;
      const now = new Date();
      const isToday = date === H.localDay(0);
      const booked = db.orders.filter((o) => o.branch_id === Number(query.branch_id) && o.slot_date === date && o.status !== 'cancelled');
      return ok(SLOTS.map((s) => {
        const used = booked.filter((o) => String(o.slot_from).slice(0, 5) === s.from).length;
        const passed = isToday && now.getHours() >= Number(s.from.split(':')[0]) - 1;
        return { ...s, date, capacity: 25, remaining: Math.max(25 - used, 0), available: !passed && used < 25, reason: passed ? 'انتهى وقت الحجز لهذه الشريحة' : used >= 25 ? 'الشريحة مكتملة' : null };
      }));
    }
    if (method === 'POST' && path === '/orders') {
      const c = branchCheck(num(b.branch_id));
      if (c.error) return c.error;
      const snap = snapshot(c.br.id);
      if (!snap.items.length) return fail(400, 'سلتك فارغة');
      if (snap.has_issues) return fail(400, 'راجع سلتك — بعض الأصناف لم تعد متاحة بالكمية المطلوبة', 'CART_ISSUES');
      if (!snap.totals.meets_minimum) return fail(400, 'الحد الأدنى للطلب ' + snap.totals.minimum_required + ' ج.م', 'BELOW_MINIMUM');
      const fulfil = b.fulfillment_type || 'delivery';
      const method_ = b.payment_method || 'cod';
      if (!['cod', 'instapay', 'wallet'].includes(method_)) return fail(400, 'وسيلة الدفع هذه غير متاحة حاليًا', 'PAYMENT_METHOD_UNAVAILABLE');
      const addr = db.addresses.find((a) => a.id === Number(b.address_id) && a.user_id === user.id && !a.deleted_at);
      if (fulfil === 'delivery' && !addr) return fail(400, 'اختر عنوان توصيل صحيحًا', 'ADDRESS_REQUIRED');
      const maxRedeem = Math.min(user.loyalty_points, Math.floor((snap.totals.subtotal * 0.5) / POINT_VALUE));
      const redeem = Math.max(0, Math.min(Number(b.use_points) || 0, maxRedeem));
      const pointsValue = r2(redeem * POINT_VALUE);
      const t = totalsOf(snap.items, { ...c.br, delivery_fee: fulfil === 'pickup' ? 0 : c.br.delivery_fee }, { discount: snap.totals.discount_total, freeDelivery: fulfil === 'pickup' || (snap.coupon && snap.coupon.type === 'free_delivery'), pointsValue });
      if (method_ === 'wallet' && Number(user.wallet_balance) < t.grand_total) return fail(400, 'رصيد المحفظة لا يكفي لإتمام الطلب', 'INSUFFICIENT_WALLET');
      const placed = H.now();
      const stamp = new Date(placed);
      const seqToday = db.orders.filter((o) => o.branch_id === c.br.id && o.placed_at.slice(0, 10) === H.day(placed)).length + 1;
      const number = 'RMN-' + c.br.code + '-' + String(stamp.getFullYear()).slice(2) + String(stamp.getMonth() + 1).padStart(2, '0') + String(stamp.getDate()).padStart(2, '0') + '-' + String(seqToday).padStart(4, '0');
      const tier = [...TIERS].reverse().find((x) => Number(user.total_spent) >= x.minSpent) || TIERS[0];
      const order = {
        id: db.orders.length + 1, order_number: number, user_id: user.id, branch_id: c.br.id, address_id: fulfil === 'delivery' ? addr.id : null, fulfillment_type: fulfil,
        status: 'pending', payment_method: method_, payment_status: method_ === 'wallet' ? 'paid' : method_ === 'cod' ? 'unpaid' : 'awaiting_payment',
        subtotal: money(t.subtotal), discount_total: money(t.discount_total), delivery_fee: money(t.delivery_fee), tax_total: '0.00', points_redeemed: redeem,
        points_value: money(pointsValue), grand_total: money(t.grand_total), points_earned: Math.floor(t.subtotal * POINTS_PER_EGP * tier.multiplier),
        coupon_code: snap.coupon ? snap.coupon.code : null, slot_date: b.slot_date || null, slot_from: b.slot_from || null, slot_to: b.slot_to || null,
        customer_note: b.customer_note || null, cancel_reason: null, placed_at: H.iso(placed), delivered_at: null, rating: null,
        items: snap.items.map((it) => ({ id: H.seq(db, 'item'), product_id: it.product_id, name_snapshot: it.name_ar, unit_snapshot: it.unit_size, sku_snapshot: (prod(it.product_id) || {}).sku, unit_price: it.unit_price, quantity: it.quantity, line_total: money(it.line_total) })),
        timeline: [{ status: 'pending', note: 'تم استلام الطلب', created_at: H.iso(placed) }],
      };
      db.orders.unshift(order);
      snap.items.forEach((it) => { const i = inv(c.br.id, it.product_id); if (i) i.reserved += it.quantity; });
      if (redeem) { user.loyalty_points -= redeem; db.loyaltyTx.unshift({ user_id: user.id, type: 'redeem', points: -redeem, balance_after: user.loyalty_points, note: 'استبدال في الطلب ' + number, created_at: H.iso(placed), order_number: number }); }
      if (method_ === 'wallet') {
        user.wallet_balance = money(Number(user.wallet_balance) - t.grand_total);
        db.walletTx.unshift({ user_id: user.id, type: 'debit', amount: money(t.grand_total), balance_after: user.wallet_balance, reason: 'دفع طلب', reference: number, created_at: H.iso(placed) });
      }
      const cart = cartOf(c.br.id);
      cart.items = [];
      cart.coupon_code = null;
      db.notifs.push({ id: db.notifs.length + 1, user_id: user.id, type: 'order', title: 'استلمنا طلبك', body: 'طلبك ' + number + ' قيد المراجعة وسنبدأ التجهيز فورًا.', link: '/account/orders/' + number, read_at: null, created_at: H.iso(placed) });
      return created({
        ...orderView(order, true),
        payment_instructions: method_ === 'instapay' ? { method: 'instapay', address: 'rumman@instapay', account_name: 'رُمّان للتجارة', amount: order.grand_total, window_hours: 24 } : null,
        payment_error: null,
      }, 'تم تأكيد طلبك ' + number);
    }
    if (method === 'GET' && path === '/orders') {
      let list = db.orders.filter((o) => o.user_id === user.id);
      if (query.status) list = list.filter((o) => o.status === query.status);
      list.sort((a, c) => (a.placed_at < c.placed_at ? 1 : -1));
      const limit = Math.min(num(query.limit) || 10, 50);
      const page = Math.max(num(query.page) || 1, 1);
      return paged(list.slice((page - 1) * limit, page * limit).map((o) => orderView(o, false)), page, limit, list.length);
    }
    m = /^\/orders\/([A-Z0-9-]+)(?:\/(cancel|reorder|rate|status))?$/i.exec(path);
    if (m) {
      const o = db.orders.find((x) => x.order_number === m[1]);
      if (!o) return fail(404, 'الطلب غير موجود');
      if (!isStaff && o.user_id !== user.id) return fail(403, 'هذا الطلب لا يخصّك', 'FORBIDDEN');
      if (method === 'GET' && !m[2]) return ok(orderView(o, true));
      if (method === 'POST' && m[2] === 'cancel') {
        if (!['pending', 'confirmed'].includes(o.status)) return fail(400, 'بدأ تجهيز الطلب — تواصل مع خدمة العملاء للإلغاء', 'TOO_LATE_TO_CANCEL');
        o.cancel_reason = b.reason || 'إلغاء من العميل';
        const e = setStatus(o, 'cancelled', b.reason);
        return e || ok(orderView(o, true), { message: 'تم إلغاء الطلب' });
      }
      if (method === 'POST' && m[2] === 'reorder') {
        const cart = cartOf(o.branch_id);
        const skipped = [];
        o.items.forEach((it) => {
          const i = inv(o.branch_id, it.product_id);
          if (!it.product_id || !i || i.quantity - i.reserved <= 0) { skipped.push(it.name_snapshot); return; }
          const ex = cart.items.find((x) => x.product_id === it.product_id);
          if (ex) ex.quantity += it.quantity; else cart.items.push({ id: H.seq(db, 'cartItem'), product_id: it.product_id, quantity: it.quantity, note: null });
        });
        return ok({ cart: snapshot(o.branch_id), skipped }, { message: skipped.length ? 'أُضيفت الأصناف المتاحة. تعذّر إضافة: ' + skipped.join('، ') : 'أُضيفت كل أصناف الطلب إلى سلتك' });
      }
      if (method === 'POST' && m[2] === 'rate') {
        if (o.status !== 'delivered') return fail(400, 'يمكن التقييم بعد التسليم فقط');
        o.rating = Number(b.rating);
        return ok({ rated: true }, { message: 'شكرًا لتقييمك' });
      }
      if (method === 'PATCH' && m[2] === 'status') {
        if (!isStaff) return fail(403, 'هذه العملية لفريق العمل فقط', 'FORBIDDEN');
        const e = setStatus(o, b.status, b.note);
        return e || ok(orderView(o, true), { message: 'تم تحديث حالة الطلب' });
      }
    }
    m = /^\/payments\/instapay\/([A-Z0-9-]+)\/(proof|review)$/i.exec(path);
    if (method === 'POST' && m) {
      const o = db.orders.find((x) => x.order_number === m[1]);
      if (!o) return fail(404, 'الطلب غير موجود');
      o.payment_status = m[2] === 'review' ? (b.approved ? 'paid' : 'failed') : 'under_review';
      return ok({ ok: true }, { message: 'تم الاستلام' });
    }
    m = /^\/payments\/cod\/([A-Z0-9-]+)\/collect$/i.exec(path);
    if (method === 'POST' && m) {
      const o = db.orders.find((x) => x.order_number === m[1]);
      if (o) o.payment_status = 'paid';
      return ok({ ok: true });
    }
    if (method === 'GET' && path === '/payments/review-queue') {
      return ok(db.orders.filter((o) => o.payment_method === 'instapay' && ['awaiting_payment', 'under_review'].includes(o.payment_status)).slice(0, 20).map((o) => ({ order_number: o.order_number, grand_total: o.grand_total, placed_at: o.placed_at, payment_status: o.payment_status, customer_name: (db.users.find((u) => u.id === o.user_id) || {}).full_name, sender_name: null, proof_url: null })));
    }

    /* ============ الإدارة والتحليلات ============ */
    if (path.startsWith('/analytics/')) {
      const g = needManager();
      if (g) return g;
      const days = Math.min(num(query.days) || 30, 365);
      const since = H.now() - days * DAY;
      const bidQ = num(query.branch_id);
      const scope = db.orders.filter((o) => (!bidQ || o.branch_id === bidQ));
      const valid = (o) => !['cancelled', 'refunded'].includes(o.status);
      if (path === '/analytics/overview') {
        const cur = scope.filter((o) => valid(o) && new Date(o.placed_at).getTime() >= since);
        const prev = scope.filter((o) => valid(o) && new Date(o.placed_at).getTime() < since && new Date(o.placed_at).getTime() >= since - days * DAY);
        const rev = (l) => l.reduce((a, o) => a + Number(o.grand_total), 0);
        const growth = (n, p) => (p > 0 ? +(((n - p) / p) * 100).toFixed(1) : null);
        const daily = {};
        cur.forEach((o) => { const d = o.placed_at.slice(0, 10); daily[d] = daily[d] || { day: d, orders: 0, revenue: 0 }; daily[d].orders += 1; daily[d].revenue += Number(o.grand_total); });
        const topMap = {};
        const catMap = {};
        cur.forEach((o) => o.items.forEach((it) => {
          const p = prod(it.product_id);
          if (!p) return;
          const c = cat(p.category_id);
          topMap[p.id] = topMap[p.id] || { name_ar: p.name_ar, slug: p.slug, category_name: c.name_ar, units: 0, revenue: 0 };
          topMap[p.id].units += it.quantity; topMap[p.id].revenue += Number(it.line_total);
          catMap[c.id] = catMap[c.id] || { category: c.name_ar, color: c.accent_color, revenue: 0, units: 0 };
          catMap[c.id].revenue += Number(it.line_total); catMap[c.id].units += it.quantity;
        }));
        const statusMap = {};
        scope.filter((o) => new Date(o.placed_at).getTime() >= since).forEach((o) => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
        const low = db.inventory.filter((i) => (!bidQ || i.branch_id === bidQ) && i.quantity - i.reserved <= i.low_stock_threshold).sort((a, c) => a.quantity - c.quantity).slice(0, 20).map((i) => ({ name_ar: prod(i.product_id).name_ar, sku: prod(i.product_id).sku, branch_name: branchOf(i.branch_id).name_ar, available: i.quantity - i.reserved, low_stock_threshold: i.low_stock_threshold }));
        return ok({
          range_days: days,
          kpis: { revenue: r2(rev(cur)), revenue_growth: growth(rev(cur), rev(prev)), orders: cur.length, orders_growth: growth(cur.length, prev.length), avg_order_value: cur.length ? r2(rev(cur) / cur.length) : 0, customers: new Set(cur.map((o) => o.user_id)).size },
          daily_trend: Object.values(daily).sort((a, c) => (a.day < c.day ? -1 : 1)).map((d) => ({ ...d, revenue: r2(d.revenue) })),
          top_products: Object.values(topMap).sort((a, c) => c.revenue - a.revenue).slice(0, 10).map((x) => ({ ...x, revenue: r2(x.revenue) })),
          by_category: Object.values(catMap).sort((a, c) => c.revenue - a.revenue).map((x) => ({ ...x, revenue: r2(x.revenue) })),
          status_breakdown: Object.keys(statusMap).map((k) => ({ status: k, total: statusMap[k] })), low_stock: low,
        });
      }
      if (path === '/analytics/branches') {
        const recent = db.orders.filter((o) => valid(o) && new Date(o.placed_at).getTime() >= H.now() - 30 * DAY);
        return ok(db.branches.map((x) => {
          const l = recent.filter((o) => o.branch_id === x.id);
          const rated = l.filter((o) => o.rating);
          const revenue = l.reduce((a, o) => a + Number(o.grand_total), 0);
          return { id: x.id, name_ar: x.name_ar, city: x.city, orders: l.length, revenue: r2(revenue), avg_order_value: l.length ? r2(revenue / l.length) : 0, avg_rating: rated.length ? +(rated.reduce((a, o) => a + o.rating, 0) / rated.length).toFixed(2) : 0 };
        }).sort((a, c) => c.revenue - a.revenue));
      }
      if (path === '/analytics/queue') {
        return ok(db.orders.filter((o) => o.branch_id === num(query.branch_id) && OPEN_STATUSES.includes(o.status)).sort((a, c) => (a.placed_at < c.placed_at ? -1 : 1)).map((o) => {
          const u = db.users.find((x) => x.id === o.user_id) || {};
          return { order_number: o.order_number, status: o.status, fulfillment_type: o.fulfillment_type, grand_total: o.grand_total, placed_at: o.placed_at, slot_from: o.slot_from, slot_to: o.slot_to, customer_name: u.full_name, customer_phone: u.phone, items_count: o.items.length, minutes_waiting: Math.max(0, Math.round((H.now() - new Date(o.placed_at).getTime()) / 60000)) };
        }));
      }
    }

    if (path.startsWith('/admin')) {
      const sub = path.slice('/admin'.length);
      const idOf = (s) => Number(s);
      const strip = (o) => { const c = { ...o }; delete c.password; return c; };
      if (sub === '/readiness') {
        const g = needManager();
        if (g) return g;
        const counts = { branches: db.branches.length, categories: db.categories.length, products: live().length, stocked: db.inventory.filter((i) => i.quantity > 0).length, brands: db.brands.length, coupons: db.coupons.length, promotions: db.promotions.length, staff: db.users.filter((u) => u.role !== 'customer').length, orders: db.orders.length };
        const steps = [
          { key: 'branches', label: 'أضف فرعًا واحدًا على الأقل', note: 'الفرع يحدّد السعر والمخزون ورسوم التوصيل — لا بيع بدونه.', done: true, count: counts.branches, href: '/admin/branches' },
          { key: 'categories', label: 'أنشئ أقسام المتجر', note: 'كل قسم بلونه وزخرفته — منه تُبنى الصفحة الرئيسية.', done: true, count: counts.categories, href: '/admin/categories' },
          { key: 'products', label: 'أضف منتجات منشورة', note: 'المنتج بحالة «مسوّدة» لا يظهر للعملاء.', done: true, count: counts.products, href: '/admin/products' },
          { key: 'stocked', label: 'سجّل المخزون في الفروع', note: 'منتج بلا مخزون في فرعٍ لا يمكن إضافته للسلة هناك.', done: true, count: counts.stocked, href: '/admin/inventory' },
        ];
        return ok({ counts, steps, ready: true, completed: 4, total: 4 });
      }
      if (sub === '/health') {
        const g = needAdmin();
        if (g) return g;
        return ok({ mail: { provider: 'resend', configured: false, from: 'demo@rumman.demo' }, payments: { cod: true, instapay: true, fawry: false, fawry_environment: 'اختبار' }, uploads: { max_file_mb: 5, cdn: false }, app_url: location.origin, api_public_url: location.origin + '/api', environment: 'demo' });
      }
      if (sub === '/orders') {
        const g = needManager();
        if (g) return g;
        let list = db.orders.slice();
        if (query.status) list = list.filter((o) => o.status === query.status);
        if (query.payment_status) list = list.filter((o) => o.payment_status === query.payment_status);
        if (num(query.branch_id)) list = list.filter((o) => o.branch_id === num(query.branch_id));
        if (query.q) list = list.filter((o) => o.order_number.includes(query.q) || ((db.users.find((u) => u.id === o.user_id) || {}).full_name || '').includes(query.q));
        list.sort((a, c) => (a.placed_at < c.placed_at ? 1 : -1));
        const limit = Math.min(num(query.limit) || 24, 100);
        const page = Math.max(num(query.page) || 1, 1);
        return paged(list.slice((page - 1) * limit, page * limit).map((o) => {
          const u = db.users.find((x) => x.id === o.user_id) || {};
          const br = branchOf(o.branch_id);
          return { order_number: o.order_number, status: o.status, payment_method: o.payment_method, payment_status: o.payment_status, fulfillment_type: o.fulfillment_type, grand_total: o.grand_total, placed_at: o.placed_at, delivered_at: o.delivered_at, customer_name: u.full_name, customer_phone: u.phone, branch_name: br.name_ar, branch_code: br.code, items_count: o.items.length };
        }), page, limit, list.length);
      }
      if (sub.startsWith('/inventory')) {
        const g = needManager();
        if (g) return g;
        const bid = isAdmin ? num(query.branch_id) || num(b.branch_id) : user.default_branch_id;
        if (method === 'GET' && sub === '/inventory') {
          if (!bid) return fail(400, 'اختر الفرع', 'BRANCH_REQUIRED');
          let list = db.inventory.filter((i) => i.branch_id === bid && prod(i.product_id) && !prod(i.product_id).deleted_at);
          if (query.q) list = list.filter((i) => prod(i.product_id).name_ar.includes(query.q) || prod(i.product_id).sku.includes(query.q));
          if (query.low === '1') list = list.filter((i) => i.quantity - i.reserved <= i.low_stock_threshold);
          list.sort((a, c) => a.quantity - a.reserved - (c.quantity - c.reserved));
          const limit = Math.min(num(query.limit) || 50, 100);
          const page = Math.max(num(query.page) || 1, 1);
          return paged(list.slice((page - 1) * limit, page * limit).map((i) => {
            const p = prod(i.product_id);
            const c = cat(p.category_id);
            return { id: i.id, product_id: i.product_id, name_ar: p.name_ar, sku: p.sku, unit: p.unit, unit_size: p.unit_size, price: p.price, category_name: c.name_ar, category_accent: c.accent_color, quantity: i.quantity, reserved: i.reserved, available: Math.max(i.quantity - i.reserved, 0), low_stock_threshold: i.low_stock_threshold, aisle: i.aisle, price_override: i.price_override, restock_at: i.restock_at, updated_at: i.updated_at };
          }), page, limit, list.length);
        }
        if (method === 'PUT' && sub === '/inventory') {
          const i = inv(bid, b.product_id);
          if (i) { i.quantity = Number(b.quantity); i.low_stock_threshold = b.low_stock_threshold ?? i.low_stock_threshold; i.aisle = b.aisle ?? i.aisle; i.price_override = b.price_override ?? null; i.updated_at = H.iso(H.now()); }
          else db.inventory.push({ id: db.inventory.length + 1, branch_id: bid, product_id: Number(b.product_id), quantity: Number(b.quantity), reserved: 0, low_stock_threshold: b.low_stock_threshold ?? 10, aisle: b.aisle || null, price_override: b.price_override ?? null, restock_at: null, updated_at: H.iso(H.now()) });
          return ok({ ok: true }, { message: 'تم تحديث المخزون' });
        }
        if (method === 'POST' && sub === '/inventory/adjust') {
          const i = inv(bid, b.product_id);
          if (!i) return fail(404, 'هذا المنتج غير مُدرج في مخزون هذا الفرع بعد');
          if (i.quantity + Number(b.delta) < 0) return fail(400, 'الرصيد الحالي ' + i.quantity + ' — لا يمكن خصم ' + Math.abs(b.delta), 'NEGATIVE_STOCK');
          i.quantity += Number(b.delta);
          return ok({ id: i.id, quantity: i.quantity }, { message: 'تم تسجيل الحركة' });
        }
        if (method === 'POST' && sub === '/inventory/bulk') {
          (b.branches || []).forEach((row) => {
            const i = inv(row.branch_id, b.product_id);
            if (i) i.quantity = Number(row.quantity);
            else db.inventory.push({ id: db.inventory.length + 1, branch_id: row.branch_id, product_id: Number(b.product_id), quantity: Number(row.quantity), reserved: 0, low_stock_threshold: row.low_stock_threshold || 10, aisle: row.aisle || null, price_override: row.price_override ?? null, restock_at: null, updated_at: H.iso(H.now()) });
          });
          return ok({ applied: [] }, { message: 'تم نشر المنتج على الفروع' });
        }
        if (method === 'GET' && sub === '/inventory/movements') return ok([]);
      }
      if (sub.startsWith('/import')) return fail(400, 'الاستيراد غير متاح في النسخة التجريبية', 'DEMO');
      if (sub === '/settings') {
        const g = needAdmin();
        if (g) return g;
        if (method === 'GET') return ok(db.settings.reduce((acc, r) => { (acc[r.group] = acc[r.group] || []).push(r); return acc; }, {}));
        if (method === 'PUT') {
          (b.settings || []).forEach((s) => { const r = db.settings.find((x) => x.key === s.key); if (r) { r.value = String(s.value); r.updated_at = H.iso(H.now()); } else db.settings.push({ key: s.key, value: String(s.value), group: s.group || 'general', updated_at: H.iso(H.now()) }); });
          return ok(db.settings.reduce((acc, r) => { (acc[r.group] = acc[r.group] || []).push(r); return acc; }, {}), { message: 'تم حفظ الإعدادات' });
        }
      }
      if (sub === '/audit') {
        const g = needAdmin();
        if (g) return g;
        return ok(db.audit.filter((a) => !query.entity || a.entity === query.entity).slice(0, 60));
      }
      if (sub === '/users' || sub === '/users/staff' || /^\/users\/\d+$/.test(sub)) {
        const g = needAdmin();
        if (g) return g;
        if (method === 'GET') {
          let list = db.users.slice();
          if (query.role) list = list.filter((u) => u.role === query.role);
          if (query.status) list = list.filter((u) => u.status === query.status);
          if (query.q) list = list.filter((u) => u.full_name.includes(query.q) || u.email.includes(query.q) || (u.phone || '').includes(query.q));
          list.sort((a, c) => (a.created_at < c.created_at ? 1 : -1));
          const limit = Math.min(num(query.limit) || 24, 100);
          const page = Math.max(num(query.page) || 1, 1);
          return paged(list.slice((page - 1) * limit, page * limit).map((u) => ({ id: u.id, full_name: u.full_name, email: u.email, phone: u.phone, role: u.role, status: u.status, loyalty_points: u.loyalty_points, loyalty_tier: u.loyalty_tier, total_spent: u.total_spent, orders_count: u.orders_count, email_verified_at: u.email_verified_at, created_at: u.created_at, branch_name: (branchOf(u.default_branch_id) || {}).name_ar || null })), page, limit, list.length);
        }
        if (method === 'POST' && sub === '/users/staff') {
          if (db.users.some((u) => u.email === String(b.email).toLowerCase())) return fail(409, 'البريد أو رقم الهاتف مستخدم بالفعل', 'ACCOUNT_EXISTS');
          const u = { id: Math.max(...db.users.map((x) => x.id)) + 1, uuid: 'demo-new', full_name: b.full_name, email: String(b.email).toLowerCase(), phone: b.phone, role: b.role, status: 'active', avatar_url: null, gender: 'unspecified', birth_date: null, preferred_lang: 'ar', default_branch_id: b.default_branch_id || null, loyalty_points: 0, loyalty_tier: 'silver', wallet_balance: '0.00', total_spent: '0.00', orders_count: 0, email_verified_at: H.iso(H.now()), created_at: H.iso(H.now()), password: b.password || DEMO_PASSWORD };
          db.users.push(u);
          return created(strip(u), 'تم إنشاء حساب الفريق');
        }
        const mu = /^\/users\/(\d+)$/.exec(sub);
        if (mu && method === 'PATCH') {
          const u = db.users.find((x) => x.id === idOf(mu[1]));
          if (!u) return fail(404, 'الحساب غير موجود');
          if (u.id === user.id) return fail(400, 'لا يمكن تعديل صلاحيات حسابك أو حالته من هنا', 'SELF_EDIT');
          ['full_name', 'role', 'default_branch_id', 'status'].forEach((k) => { if (b[k] !== undefined) u[k] = b[k]; });
          return ok(strip(u), { message: 'تم تحديث الحساب' });
        }
      }

      /* كيانات CRUD العامة: الفروع، الأقسام، العلامات، المنتجات، الكوبونات، العروض */
      const defs = {
        branches: { list: () => db.branches, label: 'الفرع', extras: (x) => ({ manager_name: (db.users.find((u) => u.id === x.manager_id) || {}).full_name || null, products_count: db.inventory.filter((i) => i.branch_id === x.id).length, orders_count: db.orders.filter((o) => o.branch_id === x.id && !['cancelled', 'refunded'].includes(o.status)).length, low_stock_count: db.inventory.filter((i) => i.branch_id === x.id && i.quantity - i.reserved <= i.low_stock_threshold).length }) },
        categories: { list: () => db.categories, label: 'القسم' },
        brands: { list: () => db.brands, label: 'العلامة التجارية' },
        coupons: { list: () => db.coupons, label: 'كود الخصم' },
        promotions: { list: () => db.promotions, label: 'العرض' },
        products: { list: () => db.products, label: 'المنتج' },
      };
      const mc = /^\/(branches|categories|brands|coupons|promotions|products)(?:\/(\d+))?(?:\/(restore|hours|zones|images|reorder|meta\/motifs))?(?:\/(\d+))?(?:\/(primary))?$/.exec(sub) || /^\/(categories)\/(meta\/motifs)$/.exec(sub);
      if (mc) {
        const g = needAdmin();
        if (g) return g;
        const entity = mc[1];
        const def = defs[entity];
        const coll = def.list();
        const id = mc[2] && /^\d+$/.test(mc[2]) ? Number(mc[2]) : null;
        if (entity === 'categories' && (mc[2] === 'meta/motifs' || mc[3] === 'meta/motifs')) {
          return ok({ motifs: ['leaf', 'cleaver', 'wave', 'drop', 'wheat', 'cake', 'jar', 'olive', 'bean', 'bottle', 'snack', 'freeze', 'sparkle', 'baby', 'paw', 'sprout'] });
        }
        if (mc[3] === 'reorder' && method === 'POST') {
          (b.order || []).forEach((oid, idx) => { const r = coll.find((x) => x.id === Number(oid)); if (r) r.sort_order = idx + 1; });
          return ok({ ok: true }, { message: 'تم تحديث الترتيب' });
        }
        if (entity === 'branches' && id && mc[3] === 'hours') {
          if (method === 'GET') return ok(db.hours.filter((h) => h.branch_id === id));
          if (method === 'PUT') {
            db.hours = db.hours.filter((h) => h.branch_id !== id).concat((b.hours || []).map((h) => ({ branch_id: id, weekday: h.weekday, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed ? 1 : 0 })));
            return ok(db.hours.filter((h) => h.branch_id === id), { message: 'تم تحديث مواعيد العمل' });
          }
        }
        if (entity === 'branches' && id && mc[3] === 'zones') {
          if (method === 'GET') return ok(db.zones.filter((z) => z.branch_id === id));
          if (method === 'POST') { const z = { id: Math.max(0, ...db.zones.map((x) => x.id)) + 1, branch_id: id, name_ar: b.name_ar, name_en: b.name_en || null, delivery_fee: money(b.delivery_fee || 0), min_order: money(b.min_order || 0), eta_minutes: b.eta_minutes || 45, status: b.status || 'active' }; db.zones.push(z); return created(z, 'تمت إضافة منطقة التوصيل'); }
        }
        if (entity === 'products' && method === 'GET' && !id) {
          let list = db.products.filter((p) => !p.deleted_at);
          if (query.q) list = list.filter((p) => p.name_ar.includes(query.q) || p.sku.includes(query.q));
          if (num(query.category_id)) list = list.filter((p) => p.category_id === num(query.category_id));
          if (num(query.brand_id)) list = list.filter((p) => p.brand_id === num(query.brand_id));
          if (query.status) list = list.filter((p) => p.status === query.status);
          list.sort((a, c) => (a.updated_at < c.updated_at ? 1 : -1));
          const limit = Math.min(num(query.limit) || 24, 100);
          const page = Math.max(num(query.page) || 1, 1);
          return paged(list.slice((page - 1) * limit, page * limit).map((p) => {
            const c = cat(p.category_id);
            const st = db.inventory.filter((i) => i.product_id === p.id);
            return { id: p.id, sku: p.sku, slug: p.slug, name_ar: p.name_ar, name_en: p.name_en, price: p.price, compare_at_price: p.compare_at_price, unit: p.unit, unit_size: p.unit_size, status: p.status, badge: p.badge, is_featured: p.is_featured, is_organic: p.is_organic, rating_avg: p.rating_avg, rating_count: p.rating_count, sold_count: p.sold_count, updated_at: p.updated_at, category_name: c.name_ar, category_accent: c.accent_color, brand_name: (brand(p.brand_id) || {}).name_ar || null, total_available: st.reduce((a, i) => a + Math.max(i.quantity - i.reserved, 0), 0), branches_count: st.length, image_url: null };
          }), page, limit, list.length);
        }
        if (entity === 'products' && id && method === 'GET' && !mc[3]) {
          const p = prod(id);
          if (!p) return fail(404, 'المنتج غير موجود');
          return ok({ ...p, images: [], stock: db.inventory.filter((i) => i.product_id === id).map((i) => ({ branch_id: i.branch_id, branch_name: branchOf(i.branch_id).name_ar, branch_code: branchOf(i.branch_id).code, quantity: i.quantity, reserved: i.reserved, available: Math.max(i.quantity - i.reserved, 0), low_stock_threshold: i.low_stock_threshold, aisle: i.aisle, price_override: i.price_override, restock_at: i.restock_at, updated_at: i.updated_at })) });
        }
        if (entity === 'products' && mc[3] === 'images') return fail(400, 'رفع الصور غير متاح في النسخة التجريبية', 'DEMO');
        if (method === 'GET' && !id) {
          let rows = coll.filter((x) => !x.deleted_at);
          if (def.extras) rows = rows.map((x) => ({ ...x, ...def.extras(x) }));
          return ok(rows);
        }
        if (method === 'GET' && id) {
          const r = coll.find((x) => x.id === id);
          return r ? ok(r) : fail(404, def.label + ' غير موجود');
        }
        if (method === 'POST' && !id) {
          const r = { id: Math.max(0, ...coll.map((x) => x.id)) + 1, status: 'active', created_at: H.iso(H.now()), updated_at: H.iso(H.now()), deleted_at: null, ...b };
          if (entity === 'products') Object.assign(r, { sku: b.sku || 'RMN-' + (1000 + r.id), slug: b.slug || 'p' + r.id, tags: b.tags || [], allergens: b.allergens || [], rating_avg: '0.00', rating_count: 0, sold_count: 0, view_count: 0, max_per_order: b.max_per_order || 12, price: money(b.price || 0) });
          coll.push(r);
          return created(r, 'تم إنشاء ' + def.label);
        }
        if (method === 'PATCH' && id) {
          const r = coll.find((x) => x.id === id);
          if (!r) return fail(404, def.label + ' غير موجود');
          Object.assign(r, b, { updated_at: H.iso(H.now()) });
          return ok(r, { message: 'تم تحديث ' + def.label });
        }
        if (method === 'DELETE' && id) {
          const r = coll.find((x) => x.id === id);
          if (!r) return fail(404, def.label + ' غير موجود');
          if (['branches', 'categories', 'products'].includes(entity)) r.deleted_at = H.iso(H.now()); else coll.splice(coll.indexOf(r), 1);
          return ok({ deleted: true }, { message: 'تم حذف ' + def.label });
        }
        if (method === 'POST' && id && mc[3] === 'restore') {
          const r = coll.find((x) => x.id === id);
          if (r) r.deleted_at = null;
          return ok(r, { message: 'تم استرجاع ' + def.label });
        }
      }
      const mz = /^\/delivery-zones\/(\d+)$/.exec(sub);
      if (mz) {
        const g = needAdmin();
        if (g) return g;
        const z = db.zones.find((x) => x.id === Number(mz[1]));
        if (!z) return fail(404, 'المنطقة غير موجودة');
        if (method === 'PATCH') { Object.assign(z, b); return ok(z, { message: 'تم تحديث المنطقة' }); }
        if (method === 'DELETE') { db.zones = db.zones.filter((x) => x.id !== z.id); return ok({ deleted: true }, { message: 'تم حذف المنطقة' }); }
      }
    }

    return null;
  }

  createDemo({
    key: 'rumman_demo_db',
    version: 1,
    prefix: '/api/v1',
    seed,
    handle,
    notFound: () => ({ success: false, message: 'المسار ده مش موجود في النسخة التجريبية', code: 'NOT_FOUND' }),
    serverError: () => ({ success: false, message: 'حصل خطأ في النسخة التجريبية', code: 'DEMO_ERROR' }),
    onReset: () => {
      try {
        Object.keys(localStorage).filter((k) => k.indexOf('rumman:') === 0).forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* لا شيء */ }
    },
    bar: {
      label: 'نسخة تجريبية',
      openFirst: true,
      intro: 'ده عرض لمتجر رُمّان ببيانات وهمية متخزنة على جهازك بس. جرّب كعميل أو كمدير:',
      actions: [
        { label: 'ادخل كعميلة (منى السيد)', primary: true, run: (a) => setSession(a, 1, '/account') },
        { label: 'ادخل كمدير المتجر (لوحة الإدارة)', run: (a) => setSession(a, 2, '/admin') },
      ],
      note: 'للدخول بنفسك: mona@rumman.demo (عميل) أو admin@rumman.demo (مدير) وكلمة المرور Demo@1234. تصفّح المتجر والسلة من غير تسجيل.',
    },
  });

  function setSession(api, userId, to) {
    try {
      const rand = (n) => Math.random().toString(36).slice(2, 2 + n);
      localStorage.setItem('rumman:access_token', JSON.stringify('demo.' + userId + '.' + rand(10)));
      localStorage.setItem('rumman:refresh_token', JSON.stringify('demo-r.' + userId + '.' + rand(12)));
    } catch (e) { /* لا شيء */ }
    api.go(to);
  }
})();
