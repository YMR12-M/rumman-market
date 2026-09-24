import { Link } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { IconBell } from '@/lib/icons.jsx';
import { notificationService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { timeAgo } from '@/lib/format.js';

const TYPE_TONE = { order: 'forest', promo: 'gold', loyalty: 'gold', stock: 'sale', system: 'outline' };

export default function NotificationsPage() {
  const notifications = useAsync(() => notificationService.list({ limit: 30 }), []);

  const markAll = async () => {
    await notificationService.markAllRead();
    notifications.reload();
  };

  if (notifications.loading) return <Skeleton height={280} />;

  const items = notifications.data?.items ?? [];

  if (items.length === 0) {
    return <EmptyState title="لا توجد إشعارات" description="سنُعلمك هنا بحالة طلباتك وعروضنا الخاصة." icon={<IconBell size={44} />} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-4)' }}>
        <h2 style={{ fontSize: 'var(--t-md)' }}>
          الإشعارات
          {notifications.data.unread_count > 0 && (
            <span className="badge badge--saffron" style={{ marginInlineStart: 8 }}>{notifications.data.unread_count} جديد</span>
          )}
        </h2>
        {notifications.data.unread_count > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={markAll}>تعليم الكل كمقروء</button>
        )}
      </div>

      <div className="stack">
        {items.map((item) => {
          const Wrapper = item.link ? Link : 'div';
          return (
            <Wrapper
              key={item.id}
              {...(item.link ? { to: item.link } : {})}
              className="panel"
              style={{
                display: 'block',
                borderInlineStartWidth: 2,
                borderInlineStartColor: item.read_at ? 'var(--line-soft)' : 'var(--gold-400)',
              }}
              onClick={() => !item.read_at && notificationService.markRead(item.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-3)', alignItems: 'flex-start' }}>
                <div>
                  <span className={`badge badge--${TYPE_TONE[item.type] ?? 'outline'}`}>{item.type}</span>
                  <strong style={{ display: 'block', marginTop: 8, fontFamily: 'var(--font-display)' }}>{item.title}</strong>
                  <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 4 }}>{item.body}</p>
                </div>
                <span className="muted" style={{ fontSize: 'var(--t-xs)', whiteSpace: 'nowrap' }}>{timeAgo(item.created_at)}</span>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
