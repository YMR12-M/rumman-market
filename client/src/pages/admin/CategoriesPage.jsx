/**
 * الأقسام.
 * لون القسم وزخرفته ليسا تجميلًا: منهما تُبنى بطاقة القسم ولوحة
 * منتجاته ورأس صفحته وشريطه في التقارير — فتعديلهما هنا ينعكس
 * على كل الموقع في الحال.
 */
import CrudPage from '@/components/admin/CrudPage.jsx';
import { MOTIFS } from '@/lib/motifs.jsx';
import { contrastText } from '@/lib/color.js';
import { adminService } from '@/services/index.js';
import { num } from '@/lib/format.js';

const MOTIF_OPTIONS = Object.keys(MOTIFS).map((key) => ({ value: key, label: key }));

const fields = [
  { name: 'name_ar', label: 'اسم القسم', required: true, span: 6, group: 'الأساسيات' },
  { name: 'name_en', label: 'الاسم بالإنجليزية', required: true, span: 6, dir: 'ltr', group: 'الأساسيات' },
  { name: 'slug', label: 'مُعرِّف الرابط', required: true, span: 6, dir: 'ltr',
    hint: 'يظهر في /category/… — حروف لاتينية صغيرة وشرطات', group: 'الأساسيات' },
  { name: 'aisle_code', label: 'رقم الممر', span: 3, dir: 'ltr', hint: 'داخل الفرع', group: 'الأساسيات' },
  { name: 'sort_order', label: 'الترتيب', type: 'number', span: 3, min: 0, group: 'الأساسيات' },
  { name: 'tagline_ar', label: 'جملة تعريفية', span: 12, placeholder: 'يُقطف فجرًا، ويصلك قبل الظهيرة.', group: 'الأساسيات' },
  { name: 'description_ar', label: 'الوصف', type: 'textarea', span: 12, rows: 3, group: 'الأساسيات' },

  { name: 'accent_color', label: 'لون القسم', type: 'color', span: 6, required: true, default: '#D81E4A',
    hint: 'يلوّن البطاقة ولوحات المنتجات والتقارير', group: 'الهوية البصرية' },
  { name: 'motif', label: 'الزخرفة', type: 'select', options: MOTIF_OPTIONS, required: true, span: 6, default: 'wheat',
    hint: 'رسم خطّي يظهر على لوحة المنتج', group: 'الهوية البصرية' },

  { name: 'is_featured', label: 'قسم مميّز', type: 'switch', span: 6,
    hint: 'يظهر في الصفحة الرئيسية', group: 'النشر' },
  { name: 'status', label: 'الحالة', type: 'select', required: true, span: 6, default: 'active', group: 'النشر',
    options: [{ value: 'active', label: 'منشور' }, { value: 'hidden', label: 'مخفي' }] },
];

const columns = [
  {
    key: 'name_ar', label: 'القسم',
    render: (row) => {
      const Motif = MOTIFS[row.motif] ?? MOTIFS.wheat;
      return (
        <div className="cell-lead">
          <span
            className="cell-chip"
            style={{ background: row.accent_color, color: contrastText(row.accent_color) }}
          >
            <Motif size={18} />
          </span>
          <div>
            <strong>{row.name_ar}</strong>
            <div className="cell-sub" dir="ltr">/{row.slug}</div>
          </div>
        </div>
      );
    },
  },
  { key: 'aisle_code', label: 'الممر', align: 'center', hideOnMobile: true, render: (row) => row.aisle_code || '—' },
  { key: 'sort_order', label: 'الترتيب', align: 'center', hideOnMobile: true, render: (row) => <span className="numeral">{num(row.sort_order)}</span> },
  {
    key: 'status', label: 'الحالة', align: 'center',
    render: (row) => (
      <span className={`badge ${row.status === 'active' ? 'badge--organic' : 'badge--outline'}`}>
        {row.status === 'active' ? 'منشور' : 'مخفي'}
      </span>
    ),
  },
];

export default function CategoriesPage() {
  return (
    <CrudPage
      title="الأقسام"
      subtitle="لكل قسم لونه وزخرفته — منها تُبنى الصفحة الرئيسية وصفحات التصفّح."
      singular="قسم"
      service={adminService.categories}
      fields={fields}
      columns={columns}
      empty={{ title: 'لا أقسام بعد', description: 'القسم هو الوعاء الذي تسكنه المنتجات. أنشئ أول قسم لتبدأ.' }}
    />
  );
}
