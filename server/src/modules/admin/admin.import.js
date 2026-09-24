/**
 * ═══════════════════════════════════════════════════════════════
 *  استيراد المنتجات من CSV
 *
 *  إدخال كتالوج سوبر ماركت صنفًا صنفًا من نموذج ويب غير عملي. هذا
 *  المسار يحوّل ملف Excel (محفوظًا CSV) إلى منتجات حقيقية.
 *
 *  ثلاثة قرارات تصميمية تستحقّ التوضيح:
 *
 *  ١) **معاينة إلزامية قبل التطبيق.** `commit=false` يفحص كل سطر
 *     ويُرجع تقريرًا بالأخطاء مرقّمةً بالسطر بلا كتابة حرف واحد.
 *     الاستيراد الأعمى لـ 800 صنف ثم اكتشاف خطأ كارثة.
 *
 *  ٢) **إمّا الكل أو لا شيء.** التطبيق يجري في معاملة واحدة: ملفٌّ
 *     فيه سطر خاطئ لا يترك نصف كتالوج في القاعدة.
 *
 *  ٣) **الأقسام والعلامات تُنشأ تلقائيًا بالاسم.** يكتب المدير
 *     «الخضار والفاكهة» في العمود فنجد القسم أو نُنشئه — فلا يُطلب
 *     منه معرفة أرقام داخلية.
 * ═══════════════════════════════════════════════════════════════
 */
import { queryOne, transaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { audit } from './admin.repo.js';

/** أعمدة الملف: الاسم في الترويسة ← الحقل عندنا */
export const IMPORT_COLUMNS = [
  { header: 'الاسم',        field: 'name_ar',          required: true,  note: 'اسم المنتج كما يظهر للعميل' },
  { header: 'الاسم بالإنجليزية', field: 'name_en',     required: false, note: 'يُستخدم في البحث — يُنسخ من العربي إن تُرك فارغًا' },
  { header: 'القسم',        field: 'category',         required: true,  note: 'يُنشأ تلقائيًا إن لم يكن موجودًا' },
  { header: 'العلامة',      field: 'brand',            required: false, note: 'يُنشأ تلقائيًا إن لم يكن موجودًا' },
  { header: 'الكود',        field: 'sku',              required: false, note: 'يُولَّد تلقائيًا إن تُرك فارغًا' },
  { header: 'الباركود',     field: 'barcode',          required: false },
  { header: 'السعر',        field: 'price',            required: true,  note: 'بالجنيه — أرقام فقط' },
  { header: 'السعر قبل الخصم', field: 'compare_at_price', required: false, note: 'يجب أن يكون أعلى من السعر' },
  { header: 'سعر التكلفة',  field: 'cost_price',       required: false, note: 'داخلي — لا يظهر للعميل' },
  { header: 'الضريبة %',    field: 'tax_rate',         required: false, note: 'نسبة مئوية — اتركها فارغة لصفر' },
  { header: 'الوحدة',       field: 'unit',             required: false, note: 'كجم · جرام · قطعة · عبوة · لتر · مل · دستة' },
  { header: 'حجم الوحدة',   field: 'unit_size',        required: false, note: 'مثال: عبوة 500 جم' },
  { header: 'الوصف',        field: 'short_desc_ar',    required: false },
  { header: 'المنشأ',       field: 'origin_country',   required: false },
  { header: 'المزرعة',      field: 'farm_or_maker',    required: false },
  { header: 'التخزين',      field: 'storage_ar',       required: false },
  { header: 'عضوي',         field: 'is_organic',       required: false, note: 'نعم / لا' },
  { header: 'طازج',         field: 'is_fresh',         required: false, note: 'نعم / لا' },
  { header: 'حصري',         field: 'is_exclusive',     required: false, note: 'نعم / لا' },
  { header: 'مميّز',        field: 'is_featured',      required: false, note: 'نعم / لا' },
  { header: 'الكمية',       field: 'quantity',         required: false, note: 'المخزون الابتدائي في الفرع المختار' },
];

const UNIT_MAP = {
  'كجم': 'kg', 'كيلو': 'kg', 'كيلوجرام': 'kg', kg: 'kg',
  'جرام': 'gram', 'جم': 'gram', gram: 'gram', g: 'gram',
  'قطعة': 'piece', 'حبة': 'piece', piece: 'piece', pc: 'piece',
  'عبوة': 'pack', 'علبة': 'pack', pack: 'pack',
  'حزمة': 'bundle', bundle: 'bundle',
  'لتر': 'liter', liter: 'liter', l: 'liter',
  'مل': 'ml', ml: 'ml',
  'دستة': 'dozen', dozen: 'dozen',
};

const TRUTHY = new Set(['نعم', 'صح', 'ايوه', 'أيوه', 'true', 'yes', 'y', '1', '✓']);

/**
 * محلّل CSV يتعامل مع الاقتباس المزدوج والفواصل داخل النصّ.
 * لماذا لا مكتبة؟ لأن المطلوب هنا محدّد ومعروف، وإضافة اعتماد
 * خارجي لأربعين سطرًا مقروءًا ليست مقايضة جيّدة.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  // نحذف علامة BOM التي يضيفها Excel — وإلّا صار أول عمود لا يُطابق
  const input = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') { cell += '"'; index += 1; }
        else inQuotes = false;
      } else cell += char;
      continue;
    }

    if (char === '"') { inQuotes = true; continue; }
    if (char === ',') { row.push(cell); cell = ''; continue; }
    if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += char;
  }

  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((line) => line.some((value) => String(value).trim() !== ''));
}

/**
 * نقحرة العربية إلى لاتينية للاستخدام في الروابط.
 *
 * لماذا لا نترك المُعرِّف عربيًا؟ لأن الرابط العربي يُرمَّز إلى
 * `%D8%A7%D9%84...` في المشاركة والبريد وتحليلات الزيارات، فيصير
 * غير مقروء. ولماذا لا `item-14`؟ لأن `/category/alkhdar-walfakha`
 * يخبر القارئ ومحرّك البحث ما في الصفحة.
 *
 * الجدول مضبوط على العربية المصرية: الهمزات تُبسَّط، والتاء المربوطة
 * تصير `a`، والحركات والتطويل يُحذفان.
 */
const AR_TO_LATIN = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ٱ': 'a', 'ء': '', 'ؤ': 'o', 'ئ': 'e',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'g', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/** الحركات والتنوين والشدّة والتطويل — تُحذف قبل النقحرة */
const AR_DIACRITICS = /[ً-ْٰـ‌-‏ۖ-ۭ]/g;

const transliterate = (value) => String(value)
  .replace(AR_DIACRITICS, '')
  .split('')
  .map((char) => (AR_TO_LATIN[char] !== undefined ? AR_TO_LATIN[char] : char))
  .join('');

/** مُعرِّف نصّي صالح للرابط، من اسم عربي أو لاتيني */
export function slugify(value, fallbackSeed = 1) {
  const latin = transliterate(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return latin.length >= 2 ? latin.slice(0, 80).replace(/-+$/, '') : `item-${fallbackSeed}`;
}

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  // نحوّل الأرقام العربية-الهندية ونحذف الفواصل الألفية
  const normalized = String(value)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[,\s]/g, '')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const toBool = (value) => TRUTHY.has(String(value).trim().toLowerCase());

/**
 * تحليل الملف وفحص كل سطر.
 * @returns {{rows: Array, errors: Array, headers: string[]}}
 */
export function analyze(csv) {
  const table = parseCsv(csv);
  if (table.length < 2) {
    throw ApiError.badRequest('الملف يحتاج سطر ترويسة وسطر بيانات واحدًا على الأقل', { code: 'CSV_EMPTY' });
  }

  const headers = table[0].map((header) => String(header).trim());
  const indexOf = {};
  for (const column of IMPORT_COLUMNS) {
    const position = headers.findIndex((header) => header === column.header);
    if (position !== -1) indexOf[column.field] = position;
  }

  const missing = IMPORT_COLUMNS
    .filter((column) => column.required && indexOf[column.field] === undefined)
    .map((column) => column.header);

  if (missing.length > 0) {
    throw ApiError.badRequest(`الملف ينقصه عمود: ${missing.join(' · ')}`, {
      code: 'CSV_MISSING_COLUMNS',
      details: { missing, expected: IMPORT_COLUMNS.map((column) => column.header) },
    });
  }

  const rows = [];
  const errors = [];
  const seenSku = new Set();
  const seenName = new Set();

  for (let index = 1; index < table.length; index += 1) {
    const line = table[index];
    const lineNumber = index + 1; // كما يراه المستخدم في Excel
    const get = (field) => (indexOf[field] === undefined ? '' : String(line[indexOf[field]] ?? '').trim());

    const rowErrors = [];
    const nameAr = get('name_ar');
    const category = get('category');
    const price = toNumber(get('price'));
    const compareAt = toNumber(get('compare_at_price'));
    const quantity = toNumber(get('quantity'));

    if (!nameAr) rowErrors.push('الاسم مطلوب');
    if (!category) rowErrors.push('القسم مطلوب');
    if (price === null) rowErrors.push('السعر مطلوب');
    else if (Number.isNaN(price)) rowErrors.push('السعر ليس رقمًا');
    else if (price <= 0) rowErrors.push('السعر يجب أن يكون أكبر من صفر');

    if (compareAt !== null && Number.isNaN(compareAt)) rowErrors.push('السعر قبل الخصم ليس رقمًا');
    else if (compareAt !== null && price !== null && !Number.isNaN(price) && compareAt <= price) {
      rowErrors.push('السعر قبل الخصم يجب أن يكون أعلى من السعر');
    }

    if (quantity !== null && (Number.isNaN(quantity) || quantity < 0)) rowErrors.push('الكمية غير صالحة');

    const taxRate = toNumber(get('tax_rate'));
    if (taxRate !== null && (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100)) {
      rowErrors.push('نسبة الضريبة بين 0 و100');
    }

    const unitRaw = get('unit');
    const unit = unitRaw ? UNIT_MAP[unitRaw.toLowerCase()] : 'piece';
    if (unitRaw && !unit) rowErrors.push(`وحدة غير معروفة: «${unitRaw}»`);

    let sku = get('sku').toUpperCase();
    if (sku && !/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(sku)) rowErrors.push('الكود يقبل حروفًا لاتينية كبيرة وأرقامًا وشرطات');

    // تكرار داخل نفس الملف — خطأ شائع جدًا عند النسخ في Excel
    if (sku) {
      if (seenSku.has(sku)) rowErrors.push(`الكود «${sku}» مكرّر في الملف`);
      seenSku.add(sku);
    }
    if (nameAr) {
      if (seenName.has(nameAr)) rowErrors.push(`الاسم «${nameAr}» مكرّر في الملف`);
      seenName.add(nameAr);
    }

    if (rowErrors.length > 0) {
      errors.push({ line: lineNumber, name: nameAr || '—', problems: rowErrors });
      continue;
    }

    if (!sku) sku = `SKU-${String(lineNumber).padStart(4, '0')}-${slugify(nameAr, lineNumber).slice(0, 12).toUpperCase()}`;

    rows.push({
      line: lineNumber,
      sku,
      slug: slugify(nameAr, lineNumber),
      name_ar: nameAr,
      name_en: get('name_en') || nameAr,
      category,
      brand: get('brand') || null,
      barcode: get('barcode') || null,
      price,
      compare_at_price: compareAt,
      cost_price: toNumber(get('cost_price')),
      tax_rate: taxRate ?? 0,
      unit: unit || 'piece',
      unit_size: get('unit_size') || null,
      short_desc_ar: get('short_desc_ar') || null,
      origin_country: get('origin_country') || null,
      farm_or_maker: get('farm_or_maker') || null,
      storage_ar: get('storage_ar') || null,
      is_organic: toBool(get('is_organic')),
      is_fresh: toBool(get('is_fresh')),
      is_exclusive: toBool(get('is_exclusive')),
      is_featured: toBool(get('is_featured')),
      quantity: quantity ?? 0,
    });
  }

  return { rows, errors, headers };
}

/**
 * تطبيق الاستيراد.
 * كلّه في معاملة واحدة: أي فشل يُرجع القاعدة كما كانت تمامًا.
 */
export async function apply({ rows, branchId, actorId, ip }) {
  return transaction(async (cx) => {
    const categoryCache = new Map();
    const brandCache = new Map();
    const result = { created: 0, updated: 0, stocked: 0, categoriesCreated: 0, brandsCreated: 0 };

    /** يجد القسم بالاسم أو يُنشئه */
    const resolveCategory = async (name) => {
      if (categoryCache.has(name)) return categoryCache.get(name);

      const [[found]] = await cx.execute(
        'SELECT id FROM categories WHERE name_ar = ? AND deleted_at IS NULL LIMIT 1',
        [name],
      );
      if (found) { categoryCache.set(name, found.id); return found.id; }

      // ألوان الأقسام الجديدة تُوزَّع على طيف الهوية بالترتيب
      const PALETTE = ['#17C077', '#D81E4A', '#14B8C4', '#F59E0B', '#8B5CF6', '#FB6E52', '#3B82F6', '#84CC16', '#C026D3'];
      const [[{ total }]] = await cx.execute('SELECT COUNT(*) AS total FROM categories');

      let slug = slugify(name, Number(total) + 1);
      const [[slugClash]] = await cx.execute('SELECT id FROM categories WHERE slug = ?', [slug]);
      if (slugClash) slug = `${slug}-${Number(total) + 1}`;

      const [inserted] = await cx.execute(
        `INSERT INTO categories (slug, name_ar, name_en, accent_color, sort_order, status)
         VALUES (?,?,?,?,?, 'active')`,
        [slug, name, name, PALETTE[Number(total) % PALETTE.length], Number(total)],
      );
      result.categoriesCreated += 1;
      categoryCache.set(name, inserted.insertId);
      return inserted.insertId;
    };

    /** يجد العلامة بالاسم أو يُنشئها */
    const resolveBrand = async (name) => {
      if (!name) return null;
      if (brandCache.has(name)) return brandCache.get(name);

      const [[found]] = await cx.execute('SELECT id FROM brands WHERE name_ar = ? LIMIT 1', [name]);
      if (found) { brandCache.set(name, found.id); return found.id; }

      const [[{ total }]] = await cx.execute('SELECT COUNT(*) AS total FROM brands');
      let slug = slugify(name, Number(total) + 1);
      const [[slugClash]] = await cx.execute('SELECT id FROM brands WHERE slug = ?', [slug]);
      if (slugClash) slug = `${slug}-${Number(total) + 1}`;

      const [inserted] = await cx.execute(
        "INSERT INTO brands (slug, name_ar, name_en, status) VALUES (?,?,?, 'active')",
        [slug, name, name],
      );
      result.brandsCreated += 1;
      brandCache.set(name, inserted.insertId);
      return inserted.insertId;
    };

    for (const row of rows) {
      const categoryId = await resolveCategory(row.category);
      const brandId = await resolveBrand(row.brand);

      // تفادي تعارض المُعرِّف مع منتج قائم باسم مشابه
      let slug = row.slug;
      const [[slugClash]] = await cx.execute('SELECT id, sku FROM products WHERE slug = ?', [slug]);
      if (slugClash && slugClash.sku !== row.sku) slug = `${slug}-${row.line}`;

      /**
       * الكود (SKU) هو المفتاح: موجود ⇒ تحديث، جديد ⇒ إنشاء.
       * فيصير الملف نفسه قابلًا لإعادة الرفع بعد تعديل الأسعار.
       */
      const [[existing]] = await cx.execute('SELECT id FROM products WHERE sku = ?', [row.sku]);

      const values = [
        categoryId, brandId, row.name_ar, row.name_en, row.short_desc_ar,
        row.unit, row.unit_size, row.price, row.compare_at_price, row.cost_price,
        row.tax_rate, row.barcode, row.origin_country, row.farm_or_maker, row.storage_ar,
        row.is_organic ? 1 : 0, row.is_fresh ? 1 : 0, row.is_exclusive ? 1 : 0, row.is_featured ? 1 : 0,
      ];

      let productId;
      if (existing) {
        await cx.execute(`
          UPDATE products SET
            category_id = ?, brand_id = ?, name_ar = ?, name_en = ?, short_desc_ar = ?,
            unit = ?, unit_size = ?, price = ?, compare_at_price = ?, cost_price = ?,
            tax_rate = ?, barcode = ?, origin_country = ?, farm_or_maker = ?, storage_ar = ?,
            is_organic = ?, is_fresh = ?, is_exclusive = ?, is_featured = ?,
            deleted_at = NULL
          WHERE id = ?`, [...values, existing.id]);
        productId = existing.id;
        result.updated += 1;
      } else {
        const [inserted] = await cx.execute(`
          INSERT INTO products
            (sku, slug, category_id, brand_id, name_ar, name_en, short_desc_ar,
             unit, unit_size, price, compare_at_price, cost_price, tax_rate, barcode,
             origin_country, farm_or_maker, storage_ar,
             is_organic, is_fresh, is_exclusive, is_featured, status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'active')`,
        [row.sku, slug, ...values]);
        productId = inserted.insertId;
        result.created += 1;
      }

      // المخزون الابتدائي — فقط إن اختار المدير فرعًا
      if (branchId && row.quantity > 0) {
        const [[inv]] = await cx.execute(
          'SELECT id, quantity FROM inventory WHERE branch_id = ? AND product_id = ?',
          [branchId, productId],
        );

        if (inv) {
          await cx.execute('UPDATE inventory SET quantity = ? WHERE id = ?', [row.quantity, inv.id]);
          await cx.execute(
            `INSERT INTO inventory_movements (inventory_id, type, quantity, balance_after, reference_type, note, created_by)
             VALUES (?, 'adjustment', ?, ?, 'import', 'ضبط من ملف الاستيراد', ?)`,
            [inv.id, row.quantity - inv.quantity, row.quantity, actorId],
          );
        } else {
          const [insertedInv] = await cx.execute(
            'INSERT INTO inventory (branch_id, product_id, quantity, low_stock_threshold) VALUES (?,?,?,10)',
            [branchId, productId, row.quantity],
          );
          await cx.execute(
            `INSERT INTO inventory_movements (inventory_id, type, quantity, balance_after, reference_type, note, created_by)
             VALUES (?, 'restock', ?, ?, 'import', 'رصيد ابتدائي من ملف الاستيراد', ?)`,
            [insertedInv.insertId, row.quantity, row.quantity, actorId],
          );
        }
        result.stocked += 1;
      }
    }

    await audit({ actorId, ip, action: 'products.import', entity: 'product', meta: result });
    return result;
  });
}

/** ملفّ قالب جاهز للتنزيل — بترويسة صحيحة وسطر مثال */
export function templateCsv() {
  const headers = IMPORT_COLUMNS.map((column) => column.header).join(',');
  const example = [
    'فراولة طازجة', 'Fresh Strawberry', 'الخضار والفاكهة', '', '', '',
    '89', '110', '62', '0', 'عبوة', 'عبوة 500 جم',
    'حبّات مُنتقاة بحجم واحد', 'مصر', 'مزرعة الفيوم', 'يُحفظ مبرّدًا',
    'نعم', 'نعم', 'لا', 'نعم', '40',
  ].map((cell) => (String(cell).includes(',') ? `"${cell}"` : cell)).join(',');

  // BOM حتى يفتح Excel العربية بترميز صحيح
  return `﻿${headers}\n${example}\n`;
}
