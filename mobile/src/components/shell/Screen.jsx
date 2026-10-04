import AppBar from './AppBar.jsx';
import { IconRefresh } from '@/lib/icons.jsx';
import { usePullToRefresh } from '@/hooks/usePullToRefresh.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  شاشة واحدة: شريطها العلوي، وجسمها، والسحب للتحديث
 *
 *  كل شاشة ترسم واحدةً من هذه، فيبقى عنوان الشريط وحالة الشاشة في
 *  الملف نفسه بدل جدول عناوين في مكان آخر يجب أن يواكب الموجّه.
 *
 *  • `onRefresh`: إن مُرّر، يُجاب السحب من الأعلى بتشغيله.
 *  • `stack`: شاشة مكدّسة فوق التبويبات (لا شريط تبويبات تحتها).
 *  • `actionbar`: الشاشة لها شريط إجراء ثابت في الأسفل، فيُترك له مكان.
 *  • `awning`: مظلّة المحلّ تتدلّى تحت الشريط العلوي (الرئيسية فقط).
 * ═══════════════════════════════════════════════════════════════
 */
export default function Screen({
  title, subtitle, back, lead, center, trailing, onRefresh,
  stack = false, actionbar = false, bare = false, awning = false, className = '', children,
}) {
  const { distance, refreshing, armed } = usePullToRefresh(onRefresh, { enabled: Boolean(onRefresh) });

  const classes = [
    'screen',
    stack && 'screen--stack',
    actionbar && 'screen--with-actionbar',
    bare && 'screen--bare',
    awning && 'screen--awning',
    className,
  ].filter(Boolean).join(' ');

  return (
    <>
      {!bare && <AppBar title={title} subtitle={subtitle} back={back} lead={lead} center={center} trailing={trailing} />}

      {awning && !bare && <div className="appbar-awning" aria-hidden="true"><div className="awning" /></div>}

      {distance > 0 && (
        <div className="ptr" style={{ translate: `0 ${distance * 0.6}px` }} aria-hidden="true">
          <div className={`ptr__dial${armed || refreshing ? ' is-armed' : ''}`}>
            {refreshing
              ? <span className="spinner" />
              : <IconRefresh size={16} style={{ rotate: `${distance * 3}deg` }} />}
          </div>
        </div>
      )}

      <main className={classes}>{children}</main>
    </>
  );
}
