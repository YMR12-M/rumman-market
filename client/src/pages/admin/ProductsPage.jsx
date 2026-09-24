/**
 * المنتجات.
 *
 * الشاشة الأكثر استعمالًا في اللوحة، فبُنيت حول ثلاث حاجات متكرّرة:
 *  ١) البحث والتصفية بسرعة في كتالوج بمئات الأصناف.
 *  ٢) رؤية المخزون عبر كل الفروع من الصفّ نفسه — لا في شاشة أخرى.
 *  ٣) نشر منتج جديد على الفروع دفعةً واحدة، لأنه أوّل ما يُفعل بعد
 *     إضافة أي صنف، وفعله فرعًا فرعًا يقتل الإنتاجية.
 */
import { useState } from 'react';
import DataTable from '@/components/admin/DataTable.jsx';
import ResourceForm from '@/components/admin/ResourceForm.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import Modal, { ConfirmDialog } from '@/components/ui/Modal.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import {
  IconPlus, IconEdit, IconTrash, IconSearch, IconImage, IconBox, IconEye, IconUpload,
} from '@/lib/icons.jsx';
import { adminService } from '@/services/index.js';
import { useAsync, useDebounce } from '@/hooks/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num } from '@/lib/format.js';

const UNITS = [
  { value: 'piece', label: 'قطعة' }, { value: 'kg', label: 'كيلوجرام' },
  { value: 'gram', label: 'جرام' }, { value: 'pack', label: 'عبوة' },
  { value: 'bundle', label: 'حزمة' }, { value: 'liter', label: 'لتر' },
  { value: 'ml', label: 'مليلتر' }, { value: 'dozen', label: 'دستة' },
];

const BADGES = [
  { value: 'none', label: 'بلا شارة' }, { value: 'new', label: 'جديد' },
  { value: 'best_seller', label: 'الأكثر مبيعًا' }, { value: 'limited', label: 'كمية محدودة' },
  { value: 'deal', label: 'عرض' },
];

const STATUS = [
  { value: 'draft', label: 'مسوّدة — لا تظهر للعملاء' },
  { value: 'active', label: 'منشور' },
  { value: 'archived', label: 'مؤرشف' },
];

const STATUS_BADGE = {
  active: ['badge--organic', 'منشور'],
  draft: ['badge--gold', 'مسوّدة'],
  archived: ['badge--outline', 'مؤرشف'],
};

/* ── لوحة الصور ─────────────────────────────────────────────── */

function ImagesPanel({ product, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      await adminService.products.uploadImage(product.id, file, {
        alt_ar: product.name_ar,
        is_primary: (product.images?.length ?? 0) === 0,
      });
      toast.success('تم رفع الصورة');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const remove = async (imageId) => {
    try {
      await adminService.products.removeImage(product.id, imageId);
      toast.success('تم حذف الصورة');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const makePrimary = async (imageId) => {
    try {
      await adminService.products.primaryImage(product.id, imageId);
      onChanged();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-4)' }}>
        الصور اختيارية — بدونها يرسم الموقع لوحةً بلون القسم وزخرفته. الصيغ: JPG · PNG · WEBP.
      </p>

      <div className="img-grid">
        {(product.images ?? []).map((image) => (
          <figure key={image.id} className={`img-tile${image.is_primary ? ' is-primary' : ''}`}>
            <img src={image.url} alt={image.alt_ar || product.name_ar} loading="lazy" />
            <figcaption>
              {image.is_primary ? (
                <span className="badge badge--gold">رئيسية</span>
              ) : (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => makePrimary(image.id)}>
                  اجعلها رئيسية
                </button>
              )}
              <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => remove(image.id)} aria-label="حذف الصورة">
                <IconTrash size={15} />
              </button>
            </figcaption>
          </figure>
        ))}

        <label className={`img-drop${busy ? ' is-busy' : ''}`}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} disabled={busy} hidden />
          <IconUpload size={22} />
          <span>{busy ? 'جارٍ الرفع…' : 'أضف صورة'}</span>
        </label>
      </div>
    </div>
  );
}

/* ── لوحة المخزون عبر الفروع ────────────────────────────────── */

function StockPanel({ product, branches, onChanged }) {
  const toast = useToast();
  const [rows, setRows] = useState(() => branches.map((branch) => {
    const found = product.stock?.find((item) => Number(item.branch_id) === Number(branch.id));
    return {
      branch_id: branch.id,
      name: branch.name_ar,
      enabled: Boolean(found),
      quantity: found?.quantity ?? 0,
      low_stock_threshold: found?.low_stock_threshold ?? 10,
      price_override: found?.price_override ?? '',
      aisle: found?.aisle ?? '',
      available: found?.available ?? 0,
      reserved: found?.reserved ?? 0,
    };
  }));
  const [busy, setBusy] = useState(false);

  const patch = (branchId, changes) =>
    setRows(rows.map((row) => (row.branch_id === branchId ? { ...row, ...changes } : row)));

  const save = async () => {
    const selected = rows.filter((row) => row.enabled);
    if (selected.length === 0) {
      toast.error('اختر فرعًا واحدًا على الأقل');
      return;
    }

    setBusy(true);
    try {
      await adminService.inventory.bulk({
        product_id: product.id,
        branches: selected.map((row) => ({
          branch_id: row.branch_id,
          quantity: Number(row.quantity) || 0,
          low_stock_threshold: Number(row.low_stock_threshold) || 10,
          price_override: row.price_override === '' ? null : Number(row.price_override),
          aisle: row.aisle || null,
        })),
      });
      toast.success('تم تحديث المخزون في الفروع');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (branches.length === 0) {
    return <p className="muted">أضف فرعًا أولًا من «الفروع» ليصبح للمخزون معنى.</p>;
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-4)' }}>
        المنتج لا يُباع في فرع إلّا إن كان مُدرجًا في مخزونه. سعر الفرع اختياري — يُترك فارغًا ليُستخدم السعر العامّ
        (<span className="numeral">{money(product.price)}</span>).
      </p>

      <div className="stock-rows">
        {rows.map((row) => (
          <div key={row.branch_id} className={`stock-row${row.enabled ? ' is-on' : ''}`}>
            <label className="checkbox stock-row__toggle">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(event) => patch(row.branch_id, { enabled: event.target.checked })}
              />
              <span><strong>{row.name}</strong></span>
            </label>

            <div className="stock-row__inputs">
              <label className="mini-field">
                <span>الكمية</span>
                <input
                  type="number" min="0" className="input input--sm numeral"
                  value={row.quantity} disabled={!row.enabled}
                  onChange={(event) => patch(row.branch_id, { quantity: event.target.value })}
                />
              </label>

              <label className="mini-field">
                <span>حدّ التنبيه</span>
                <input
                  type="number" min="0" className="input input--sm numeral"
                  value={row.low_stock_threshold} disabled={!row.enabled}
                  onChange={(event) => patch(row.branch_id, { low_stock_threshold: event.target.value })}
                />
              </label>

              <label className="mini-field">
                <span>سعر الفرع</span>
                <input
                  type="number" min="0" step="0.01" className="input input--sm numeral"
                  placeholder="عامّ" value={row.price_override} disabled={!row.enabled}
                  onChange={(event) => patch(row.branch_id, { price_override: event.target.value })}
                />
              </label>

              <label className="mini-field">
                <span>الممر</span>
                <input
                  className="input input--sm" dir="ltr"
                  value={row.aisle} disabled={!row.enabled}
                  onChange={(event) => patch(row.branch_id, { aisle: event.target.value })}
                />
              </label>
            </div>

            {row.enabled && row.reserved > 0 && (
              <span className="stock-row__note">محجوز لطلبات جارية: <span className="numeral">{num(row.reserved)}</span></span>
            )}
          </div>
        ))}
      </div>

      <div className="res-form__actions">
        <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ المخزون'}
        </button>
      </div>
    </div>
  );
}

/* ── الشاشة ─────────────────────────────────────────────────── */

export default function ProductsPage() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);

  const categories = useAsync(() => adminService.categories.list(), []);
  const brands = useAsync(() => adminService.brands.list(), []);
  const branches = useAsync(() => adminService.branches.list(), []);

  const products = useAsync(
    () => adminService.products.page({
      q: debounced || undefined,
      category_id: category || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
    [debounced, category, status, page],
  );

  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);   // {product, tab}
  const [deleting, setDeleting] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const fields = [
    { name: 'name_ar', label: 'اسم المنتج', required: true, span: 8, group: 'الأساسيات' },
    { name: 'name_en', label: 'الاسم بالإنجليزية', required: true, span: 4, dir: 'ltr', group: 'الأساسيات' },
    { name: 'sku', label: 'كود المنتج (SKU)', required: true, span: 4, dir: 'ltr',
      hint: 'مُعرِّف داخلي فريد', group: 'الأساسيات' },
    { name: 'slug', label: 'مُعرِّف الرابط', required: true, span: 4, dir: 'ltr', group: 'الأساسيات' },
    { name: 'barcode', label: 'الباركود', span: 4, dir: 'ltr', group: 'الأساسيات' },
    { name: 'category_id', label: 'القسم', type: 'select', required: true, span: 6, group: 'الأساسيات',
      options: (categories.data ?? []).map((item) => ({ value: item.id, label: item.name_ar })) },
    { name: 'brand_id', label: 'العلامة', type: 'select', span: 6, group: 'الأساسيات',
      options: (brands.data ?? []).map((item) => ({ value: item.id, label: item.name_ar })) },
    { name: 'short_desc_ar', label: 'سطر تحريري', span: 12,
      placeholder: 'حبّات مُنتقاة بحجم واحد، حلاوة طبيعية دون إضافات.', group: 'الأساسيات' },
    { name: 'description_ar', label: 'الوصف الكامل', type: 'textarea', rows: 4, span: 12, group: 'الأساسيات' },

    { name: 'price', label: 'السعر', type: 'number', required: true, span: 4, min: 0, step: '0.01', group: 'السعر والقياس' },
    { name: 'compare_at_price', label: 'السعر قبل الخصم', type: 'number', span: 4, min: 0, step: '0.01',
      hint: 'يُشطب في الواجهة — يجب أن يكون أعلى', group: 'السعر والقياس' },
    { name: 'cost_price', label: 'سعر التكلفة', type: 'number', span: 4, min: 0, step: '0.01',
      hint: 'داخلي — لا يظهر للعميل', group: 'السعر والقياس' },
    { name: 'tax_rate', label: 'نسبة الضريبة %', type: 'number', span: 4, min: 0, max: 100, step: '0.01', group: 'السعر والقياس' },
    { name: 'unit', label: 'الوحدة', type: 'select', options: UNITS, required: true, span: 4, default: 'piece', group: 'السعر والقياس' },
    { name: 'unit_size', label: 'حجم الوحدة', span: 4, placeholder: 'عبوة 500 جم', group: 'السعر والقياس' },
    { name: 'max_per_order', label: 'أقصى كمية في الطلب', type: 'number', span: 4, min: 1, group: 'السعر والقياس' },

    { name: 'origin_country', label: 'بلد/محافظة المنشأ', span: 4, group: 'المصدر' },
    { name: 'farm_or_maker', label: 'المزرعة أو المُنتِج', span: 4, group: 'المصدر' },
    { name: 'shelf_life_days', label: 'مدّة الصلاحية (يوم)', type: 'number', span: 4, min: 0, group: 'المصدر' },
    { name: 'storage_ar', label: 'شروط الحفظ', span: 12, placeholder: 'يُحفظ مبرّدًا من 2 إلى 6 مئوية', group: 'المصدر' },
    { name: 'allergens', label: 'مسبّبات الحساسية', type: 'tags', span: 6,
      hint: 'مفصولة بفواصل: لبن، جلوتين', group: 'المصدر' },
    { name: 'tags', label: 'كلمات مفتاحية', type: 'tags', span: 6, group: 'المصدر' },

    { name: 'is_organic', label: 'عضوي معتمد', type: 'switch', span: 3, group: 'الخصائص والنشر' },
    { name: 'is_fresh', label: 'طازج يومي', type: 'switch', span: 3, group: 'الخصائص والنشر' },
    { name: 'is_exclusive', label: 'حصري', type: 'switch', span: 3, group: 'الخصائص والنشر' },
    { name: 'is_featured', label: 'مميّز', type: 'switch', span: 3, group: 'الخصائص والنشر' },
    { name: 'badge', label: 'الشارة', type: 'select', options: BADGES, required: true, span: 6, default: 'none', group: 'الخصائص والنشر' },
    { name: 'status', label: 'الحالة', type: 'select', options: STATUS, required: true, span: 6, default: 'draft', group: 'الخصائص والنشر' },
  ];

  const save = async (payload) => {
    setBusy(true);
    setErrors({});
    try {
      if (editing?.id) {
        await adminService.products.update(editing.id, payload);
        toast.success('تم تحديث المنتج');
      } else {
        const fresh = await adminService.products.create(payload);
        toast.success('تم إنشاء المنتج — سجّل مخزونه في الفروع الآن');
        // الخطوة التالية طبعًا هي المخزون، فنفتحها بأنفسنا
        const full = await adminService.products.get(fresh.id);
        setDetail({ product: full, tab: 'stock' });
      }
      setEditing(null);
      products.reload();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (row, tab) => {
    try {
      const full = await adminService.products.get(row.id);
      setDetail({ product: full, tab });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const full = await adminService.products.get(detail.product.id);
    setDetail({ ...detail, product: full });
    products.reload();
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminService.products.remove(deleting.id);
      toast.success('تم حذف المنتج');
      setDeleting(null);
      products.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const noCategories = !categories.loading && (categories.data?.length ?? 0) === 0;

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">المنتجات</h2>
          <p className="admin-page__sub">
            {products.data?.meta
              ? <><span className="numeral">{num(products.data.meta.total)}</span> صنفًا في الكتالوج.</>
              : 'الكتالوج الكامل — بحث وتصفية ومخزون عبر الفروع.'}
          </p>
        </div>
        <div className="admin-page__tools">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => { setErrors({}); setEditing({}); }}
            disabled={noCategories}
            title={noCategories ? 'أنشئ قسمًا أولًا' : undefined}
          >
            <IconPlus size={15} /> إضافة منتج
          </button>
        </div>
      </header>

      {noCategories && (
        <div className="notice notice--warn">
          لا يمكن إضافة منتج قبل إنشاء قسم واحد على الأقل — القسم يحدّد لون المنتج وموضعه في المتجر.
        </div>
      )}

      {/* ── شريط التصفية ─────────────────────────────────── */}
      <div className="filter-bar">
        <div className="filter-bar__search">
          <IconSearch size={17} />
          <input
            className="input"
            placeholder="ابحث باسم المنتج أو الكود أو الباركود…"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        </div>

        <select className="select select--inline" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="">كل الأقسام</option>
          {(categories.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}
        </select>

        <select className="select select--inline" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          {STATUS.map((item) => <option key={item.value} value={item.value}>{item.label.split(' — ')[0]}</option>)}
        </select>
      </div>

      <DataTable
        loading={products.loading}
        rows={products.data?.items ?? []}
        empty={{
          title: debounced ? 'لا نتائج لبحثك' : 'لا منتجات بعد',
          description: debounced
            ? 'جرّب كلمة أخرى أو امسح التصفية.'
            : 'أضف منتجًا واحدًا، أو استورد كتالوجك كاملًا من ملف Excel.',
          actionLabel: debounced ? undefined : 'إضافة منتج',
          onAction: () => setEditing({}),
        }}
        columns={[
          {
            key: 'name_ar', label: 'المنتج',
            render: (row) => (
              <div className="cell-lead">
                {row.image_url
                  ? <img className="cell-thumb" src={row.image_url} alt="" loading="lazy" />
                  : (
                    <span className="cell-chip" style={{ background: `${row.category_accent}1f`, color: row.category_accent }} aria-hidden="true">
                      <IconImage size={17} />
                    </span>
                  )}
                <div>
                  <strong>{row.name_ar}</strong>
                  <div className="cell-sub">
                    <span className="numeral" dir="ltr">{row.sku}</span> · {row.category_name}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'price', label: 'السعر', align: 'center',
            render: (row) => (
              <div>
                <strong className="numeral">{money(row.price)}</strong>
                {Number(row.compare_at_price) > 0 && (
                  <div className="cell-sub numeral" style={{ textDecoration: 'line-through' }}>{money(row.compare_at_price)}</div>
                )}
              </div>
            ),
          },
          {
            key: 'total_available', label: 'المخزون', align: 'center',
            render: (row) => (
              <div>
                <span className="numeral" style={{ color: row.total_available > 0 ? 'var(--text)' : 'var(--danger-text)', fontWeight: 600 }}>
                  {num(row.total_available)}
                </span>
                <div className="cell-sub">
                  {row.branches_count > 0 ? `${num(row.branches_count)} فرع` : 'غير مُدرج'}
                </div>
              </div>
            ),
          },
          {
            key: 'status', label: 'الحالة', align: 'center',
            render: (row) => {
              const [cls, label] = STATUS_BADGE[row.status] ?? STATUS_BADGE.draft;
              return <span className={`badge ${cls}`}>{label}</span>;
            },
          },
          {
            key: 'actions', label: '', align: 'end', width: 170,
            render: (row) => (
              <div className="row-actions">
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => openDetail(row, 'stock')} title="المخزون" aria-label="المخزون">
                  <IconBox size={16} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => openDetail(row, 'images')} title="الصور" aria-label="الصور">
                  <IconImage size={16} />
                </button>
                <a
                  href={`/product/${row.slug}`} target="_blank" rel="noreferrer"
                  className="icon-btn icon-btn--sm" title="معاينة في المتجر" aria-label="معاينة"
                >
                  <IconEye size={16} />
                </a>
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => { setErrors({}); setEditing(row); }} title="تعديل" aria-label="تعديل">
                  <IconEdit size={16} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => setDeleting(row)} title="حذف" aria-label="حذف">
                  <IconTrash size={16} />
                </button>
              </div>
            ),
          },
        ]}
        footer={
          products.data?.meta && products.data.meta.totalPages > 1 && (
            <Pagination
              page={products.data.meta.page}
              totalPages={products.data.meta.totalPages}
              onChange={setPage}
            />
          )
        }
      />

      {/* نموذج المنتج */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'تعديل المنتج' : 'منتج جديد'}
        subtitle={editing?.id ? editing.name_ar : 'بعد الحفظ نفتح لك المخزون لتسجّل الكميات في الفروع.'}
        size="lg"
      >
        <ResourceForm
          fields={fields}
          initial={editing?.id ? editing : null}
          errors={errors}
          busy={busy}
          submitLabel={editing?.id ? 'حفظ التعديلات' : 'إنشاء المنتج'}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      </Modal>

      {/* الصور والمخزون */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.tab === 'images' ? 'صور المنتج' : 'المخزون في الفروع'}
        subtitle={detail?.product?.name_ar}
        size="md"
      >
        {detail && (
          <>
            <div className="utabs">
              <button
                type="button"
                className={`utabs__item${detail.tab === 'stock' ? ' is-active' : ''}`}
                onClick={() => setDetail({ ...detail, tab: 'stock' })}
              >
                <IconBox size={15} /> المخزون
              </button>
              <button
                type="button"
                className={`utabs__item${detail.tab === 'images' ? ' is-active' : ''}`}
                onClick={() => setDetail({ ...detail, tab: 'images' })}
              >
                <IconImage size={15} /> الصور
              </button>
            </div>

            {detail.tab === 'stock'
              ? (branches.loading
                ? <Skeleton height={200} />
                : <StockPanel product={detail.product} branches={branches.data ?? []} onChanged={refreshDetail} />)
              : <ImagesPanel product={detail.product} onChanged={refreshDetail} />}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title="حذف المنتج"
        message={`سيُخفى «${deleting?.name_ar ?? ''}» من المتجر. الطلبات السابقة تحتفظ ببياناته كما كانت وقت البيع.`}
        confirmLabel="حذف المنتج"
      />
    </section>
  );
}
