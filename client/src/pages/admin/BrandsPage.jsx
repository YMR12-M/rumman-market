/**
 * العلامات التجارية للموردين + علامة المتجر الخاصة.
 * العلامة ليست حقلًا شكليًا: اسم المُنتِج على البطاقة هو ما يجعل
 * الكتالوج قابلًا للتصفية والمقارنة.
 */
import CrudPage from '@/components/admin/CrudPage.jsx';
import { adminService } from '@/services/index.js';

const fields = [
  { name: 'name_ar', label: 'اسم العلامة', required: true, span: 6 },
  { name: 'name_en', label: 'الاسم بالإنجليزية', required: true, span: 6, dir: 'ltr' },
  { name: 'slug', label: 'مُعرِّف الرابط', required: true, span: 6, dir: 'ltr' },
  { name: 'country', label: 'بلد المنشأ', span: 6 },
  { name: 'is_house_label', label: 'علامة المتجر الخاصة', type: 'switch', span: 6,
    hint: 'تظهر بشارة مميّزة على منتجاتها' },
  { name: 'status', label: 'الحالة', type: 'select', required: true, span: 6, default: 'active',
    options: [{ value: 'active', label: 'منشورة' }, { value: 'hidden', label: 'مخفية' }] },
];

const columns = [
  {
    key: 'name_ar', label: 'العلامة',
    render: (row) => (
      <div>
        <strong>{row.name_ar}</strong>
        {row.is_house_label === 1 && <span className="badge badge--lux" style={{ marginInlineStart: 8 }}>علامتنا</span>}
        <div className="cell-sub" dir="ltr">{row.name_en}</div>
      </div>
    ),
  },
  { key: 'country', label: 'المنشأ', hideOnMobile: true, render: (row) => row.country || '—' },
  {
    key: 'status', label: 'الحالة', align: 'center',
    render: (row) => (
      <span className={`badge ${row.status === 'active' ? 'badge--organic' : 'badge--outline'}`}>
        {row.status === 'active' ? 'منشورة' : 'مخفية'}
      </span>
    ),
  },
];

export default function BrandsPage() {
  return (
    <CrudPage
      title="العلامات التجارية"
      subtitle="المزارع والمصانع والموردون — واسم المُنتِج الذي يظهر على كل بطاقة منتج."
      singular="علامة"
      service={adminService.brands}
      fields={fields}
      columns={columns}
      modalSize="sm"
      empty={{ title: 'لا علامات بعد', description: 'العلامة اختيارية للمنتج، لكنها تُثري الكتالوج وتتيح التصفية.' }}
    />
  );
}
