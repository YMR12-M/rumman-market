/**
 * شريط الإجراء الثابت في أسفل الشاشة — حيث يصل الإبهام دون تمدّد.
 * يعلو شريط التبويبات في الشاشات التي داخل الهيكل (`aboveTabs`)، ويلتصق
 * بالحافّة الآمنة في الشاشات المكدّسة.
 */
export default function ActionBar({ aboveTabs = false, children }) {
  return (
    <div className={`actionbar${aboveTabs ? ' actionbar--above-tabs' : ''}`}>
      {children}
    </div>
  );
}
