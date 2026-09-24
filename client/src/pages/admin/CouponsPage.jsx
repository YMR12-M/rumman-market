/**
 * أكواد الخصم.
 * عدّاد الاستخدام معروض ولا يُحرَّر — يزيد بالبيع الفعلي وحده، فتبقى
 * أرقام حملات الخصم صحيحة.
 */
import CrudPage from '@/components/admin/CrudPage.jsx';
import { adminService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { money, num } from '@/lib/format.js';

const TYPES = [
  { value: 'percentage',    label: 'نسبة مئوية' },
  { value: 'fixed',         label: 'مبلغ ثابت' },
  { value: 'free_delivery', label: 'توصيل مجاني' },
];

const TYPE_LABEL = Object.fromEntries(TYPES.map((type) => [type.value, type.label]));

const columns = [
  {
    key: 'code', label: 'الكود',
    render: (row) => (
      <div>
        <strong className="numeral" dir="ltr">{row.code}</strong>
        <div className="cell-sub">{row.title_ar}</div>
      </div>
    ),
  },
  {
    key: 'type', label: 'الخصم',
    render: (row) => (
      <span>
        {TYPE_LABEL[row.type]}
        {row.type === 'percentage' && <strong className="numeral"> {num(row.value)}%</strong>}
        {row.type === 'fixed' && <strong className="numeral"> {money(row.value)}</strong>}
      </span>
    ),
  },
  {
    key: 'used_count', label: 'الاستخدام', align: 'center', hideOnMobile: true,
    render: (row) => (
      <span className="numeral">
        {num(row.used_count)}{row.usage_limit ? ` / ${num(row.usage_limit)}` : ''}
      </span>
    ),
  },
  {
    key: 'ends_at', label: 'ينتهي', hideOnMobile: true,
    render: (row) => <span className="numeral cell-sub">{new Date(row.ends_at).toLocaleDateString('ar-EG')}</span>,
  },
  {
    key: 'status', label: 'الحالة', align: 'center',
    render: (row) => {
      const expired = new Date(row.ends_at) < new Date();
      const label = expired ? 'منتهٍ' : { active: 'نشط', paused: 'موقوف', expired: 'منتهٍ' }[row.status];
      return <span className={`badge ${!expired && row.status === 'active' ? 'badge--organic' : 'badge--outline'}`}>{label}</span>;
    },
  },
];

export default function CouponsPage() {
  const categories = useAsync(() => adminService.categories.list(), []);
  const products = useAsync(() => adminService.products.page({ limit: 100 }), []);

  const fields = [
    { name: 'code', label: 'الكود', required: true, span: 6, dir: 'ltr',
      hint: 'ما يكتبه العميل — حروف لاتينية كبيرة وأرقام', group: 'الأساسيات' },
    { name: 'title_ar', label: 'وصف يظهر للعميل', required: true, span: 6,
      placeholder: 'خصم 10% على أول طلب', group: 'الأساسيات' },

    { name: 'type', label: 'نوع الخصم', type: 'select', options: TYPES, required: true, span: 4, group: 'قيمة الخصم' },
    { name: 'value', label: 'القيمة', type: 'number', span: 4, min: 0, step: '0.01',
      hint: 'نسبة (1–100) أو مبلغ — تُهمل مع التوصيل المجاني', group: 'قيمة الخصم' },
    { name: 'max_discount', label: 'سقف الخصم', type: 'number', span: 4, min: 0, step: '0.01',
      hint: 'للنسب المئوية', group: 'قيمة الخصم' },

    { name: 'min_order_amount', label: 'أقلّ قيمة سلة', type: 'number', span: 4, min: 0, step: '0.01', group: 'الشروط' },
    { name: 'usage_limit', label: 'حدّ الاستخدام الكلّي', type: 'number', span: 4, min: 1,
      hint: 'اتركه فارغًا لبلا حدّ', group: 'الشروط' },
    { name: 'per_user_limit', label: 'لكل عميل', type: 'number', span: 4, min: 1, group: 'الشروط' },
    { name: 'first_order_only', label: 'للطلب الأول فقط', type: 'switch', span: 12, group: 'الشروط' },

    { name: 'applies_to', label: 'ينطبق على', type: 'select', required: true, span: 4, default: 'all', group: 'النطاق',
      options: [
        { value: 'all', label: 'كل المنتجات' },
        { value: 'category', label: 'قسم محدّد' },
        { value: 'product', label: 'منتج محدّد' },
      ] },
    { name: 'applies_value', label: 'القسم أو المنتج', type: 'select', span: 8, group: 'النطاق',
      hint: 'مطلوب إن اخترت قسمًا أو منتجًا',
      options: [
        ...(categories.data ?? []).map((category) => ({ value: category.id, label: `قسم: ${category.name_ar}` })),
        ...(products.data?.items ?? []).map((product) => ({ value: product.id, label: `منتج: ${product.name_ar}` })),
      ] },

    { name: 'starts_at', label: 'يبدأ', type: 'datetime-local', required: true, span: 6, group: 'الفترة' },
    { name: 'ends_at', label: 'ينتهي', type: 'datetime-local', required: true, span: 6, group: 'الفترة' },
    { name: 'status', label: 'الحالة', type: 'select', required: true, span: 6, default: 'active', group: 'الفترة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'paused', label: 'موقوف' },
        { value: 'expired', label: 'منتهٍ' },
      ] },
  ];

  return (
    <CrudPage
      title="أكواد الخصم"
      subtitle="بأربعة أنواع وسقوف وحدود استخدام لكل عميل. عدّاد الاستخدام يزيد بالبيع وحده."
      singular="كود خصم"
      service={adminService.coupons}
      fields={fields}
      columns={columns}
      empty={{ title: 'لا أكواد خصم', description: 'أنشئ كودًا لحملة أو لترحيب العملاء الجدد.' }}
    />
  );
}
