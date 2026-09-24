/**
 * العروض التحريرية — المساحات التي تظهر في الصفحة الرئيسية.
 * `hero` يشغل صدر الصفحة، و`strip` شريطًا عرضيًا، و`flash` عرضًا
 * محدّد المدّة، و`category_spotlight` إبرازًا لقسم.
 */
import CrudPage from '@/components/admin/CrudPage.jsx';
import { adminService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { contrastText } from '@/lib/color.js';

const KINDS = [
  { value: 'hero',               label: 'صدر الصفحة' },
  { value: 'strip',              label: 'شريط عرضي' },
  { value: 'flash',              label: 'عرض سريع' },
  { value: 'category_spotlight', label: 'إبراز قسم' },
];

const KIND_LABEL = Object.fromEntries(KINDS.map((kind) => [kind.value, kind.label]));

const columns = [
  {
    key: 'title_ar', label: 'العرض',
    render: (row) => (
      <div className="cell-lead">
        <span className="cell-chip" style={{ background: row.accent, color: contrastText(row.accent) }} aria-hidden="true" />
        <div>
          <strong>{row.title_ar}</strong>
          {row.subtitle_ar && <div className="cell-sub">{row.subtitle_ar}</div>}
        </div>
      </div>
    ),
  },
  { key: 'kind', label: 'الموضع', hideOnMobile: true, render: (row) => KIND_LABEL[row.kind] ?? row.kind },
  {
    key: 'ends_at', label: 'الفترة', hideOnMobile: true,
    render: (row) => (
      <span className="numeral cell-sub">
        {new Date(row.starts_at).toLocaleDateString('ar-EG')} — {new Date(row.ends_at).toLocaleDateString('ar-EG')}
      </span>
    ),
  },
  {
    key: 'status', label: 'الحالة', align: 'center',
    render: (row) => {
      const live = row.status === 'active' && new Date(row.starts_at) <= new Date() && new Date(row.ends_at) >= new Date();
      return (
        <span className={`badge ${live ? 'badge--organic' : 'badge--outline'}`}>
          {live ? 'معروض' : row.status === 'active' ? 'خارج الفترة' : 'مخفي'}
        </span>
      );
    },
  },
];

export default function PromotionsPage() {
  const categories = useAsync(() => adminService.categories.list(), []);

  const fields = [
    { name: 'title_ar', label: 'العنوان', required: true, span: 8, group: 'المحتوى' },
    { name: 'slug', label: 'مُعرِّف', required: true, span: 4, dir: 'ltr', group: 'المحتوى' },
    { name: 'subtitle_ar', label: 'العنوان الفرعي', span: 12, group: 'المحتوى' },
    { name: 'cta_label', label: 'نصّ الزرّ', span: 6, placeholder: 'تسوّق الآن', group: 'المحتوى' },
    { name: 'cta_href', label: 'رابط الزرّ', span: 6, dir: 'ltr', placeholder: '/category/produce', group: 'المحتوى' },

    { name: 'kind', label: 'الموضع', type: 'select', options: KINDS, required: true, span: 6, default: 'strip', group: 'العرض' },
    { name: 'category_id', label: 'القسم المرتبط', type: 'select', span: 6, group: 'العرض',
      options: (categories.data ?? []).map((category) => ({ value: category.id, label: category.name_ar })) },
    { name: 'accent', label: 'اللون', type: 'color', required: true, span: 6, default: '#D81E4A', group: 'العرض' },
    { name: 'sort_order', label: 'الترتيب', type: 'number', span: 6, min: 0, group: 'العرض' },

    { name: 'starts_at', label: 'يبدأ', type: 'datetime-local', required: true, span: 6, group: 'الفترة' },
    { name: 'ends_at', label: 'ينتهي', type: 'datetime-local', required: true, span: 6, group: 'الفترة' },
    { name: 'status', label: 'الحالة', type: 'select', required: true, span: 6, default: 'active', group: 'الفترة',
      options: [{ value: 'active', label: 'معروض' }, { value: 'hidden', label: 'مخفي' }] },
  ];

  return (
    <CrudPage
      title="العروض"
      subtitle="المساحات التحريرية في الصفحة الرئيسية. ما خرج عن فترته يختفي تلقائيًا."
      singular="عرض"
      service={adminService.promotions}
      fields={fields}
      columns={columns}
      empty={{ title: 'لا عروض معروضة', description: 'العروض اختيارية — الصفحة الرئيسية تعمل بدونها.' }}
    />
  );
}
