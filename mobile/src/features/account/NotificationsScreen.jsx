import { useNavigate } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import { EmptyState, Skeleton } from '@/components/ui/Feedback.jsx';
import { IconBell } from '@/lib/icons.jsx';
import { notificationService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { timeAgo } from '@/lib/format.js';

const TYPE_LABELS = { order: 'طلب', promo: 'عرض', loyalty: 'نقاط', stock: 'توفّر', system: 'رُمّان' };
const TYPE_TONES = { order: 'active', promo: 'warn', loyalty: 'done', stock: 'pending', system: 'active' };

/**
 * الإشعارات — الأحدث أولًا، وغير المقروء بحافّة ذهبية. النقر يعلّمه
 * مقروءًا ويفتح رابطه إن كان له رابط (طلب، عرض…). روابط الخادم مكتوبة
 * بمسارات الواجهة المكتبية، والتطبيق يفهمها كما هي.
 */
export default function NotificationsScreen() {
  const navigate = useNavigate();
  const notifications = useAsync(() => notificationService.list({ limit: 40 }), []);

  const open = async (item) => {
    if (!item.read_at) notificationService.markRead(item.id).catch(() => {});
    if (item.link) navigate(item.link);
    else notifications.reload();
  };

  const markAll = async () => {
    await notificationService.markAllRead().catch(() => {});
    notifications.reload();
  };

  const items = notifications.data?.items ?? [];
  const unread = notifications.data?.unread_count ?? 0;

  return (
    <Screen
      title="الإشعارات"
      subtitle={unread > 0 ? `${unread} غير مقروء` : undefined}
      back="/account"
      trailing={unread > 0 && <button type="button" className="btn btn--ghost btn--sm" onClick={markAll}>قراءة الكل</button>}
      onRefresh={notifications.reload}
    >
      {notifications.loading && <Skeleton height={240} radius="var(--r-lg)" />}

      {!notifications.loading && items.length === 0 && (
        <EmptyState icon={<IconBell size={34} />} title="لا توجد إشعارات" text="سنُعلمك هنا بحالة طلباتك وعروضنا الخاصة." />
      )}

      <div className="stack--tight">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="card card--pad"
            onClick={() => open(item)}
            style={{
              textAlign: 'start',
              width: '100%',
              borderInlineStartWidth: 3,
              borderInlineStartColor: item.read_at ? 'var(--line-soft)' : 'var(--lux)',
            }}
          >
            <span className="row row--between">
              <span className={`pill pill--${TYPE_TONES[item.type] ?? 'active'}`}>{TYPE_LABELS[item.type] ?? item.type}</span>
              <span className="text-xs muted">{timeAgo(item.created_at)}</span>
            </span>
            <strong style={{ display: 'block', marginBlockStart: 'var(--s-2)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{item.title}</strong>
            {item.body && <span className="text-sm soft" style={{ display: 'block', marginBlockStart: 2 }}>{item.body}</span>}
          </button>
        ))}
      </div>
    </Screen>
  );
}
