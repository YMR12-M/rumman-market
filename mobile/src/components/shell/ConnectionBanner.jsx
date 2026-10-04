import { IconAlert } from '@/lib/icons.jsx';
import { useConnection } from '@/hooks/useMobile.js';

/**
 * تنبيه الاتصال — رسالتان لحالتين مختلفتين، لأن الحلّ مختلف:
 * لا شبكة على الجهاز (المشكلة عند العميل)، أو شبكة سليمة وخادمٌ لا
 * يردّ (المشكلة عندنا). طبقة الـ API تعيد المحاولة مع كل طلب تالٍ،
 * فيختفي التنبيه وحده متى عاد الاتصال.
 */
export default function ConnectionBanner() {
  const { online, apiReachable } = useConnection();
  if (online && apiReachable) return null;

  return (
    <div className="conn-banner" role="status">
      <IconAlert size={16} />
      <span>
        {online
          ? 'تعذّر الوصول إلى رُمّان الآن — سنعيد المحاولة تلقائيًا.'
          : 'لا اتصال بالإنترنت. الأسعار والتوفّر تحتاج اتصالًا لتكون صحيحة.'}
      </span>
    </div>
  );
}
