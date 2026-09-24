/**
 * نظرة عامة.
 *
 * ترتيب الشاشة مقصود: ما لم يكتمل إعداد المتجر بعد، فقائمة التحقّق
 * أهمّ من أي رقم — لأن كل المؤشّرات ستكون أصفارًا ولن تفيد. وحين
 * يكتمل الإعداد تتقلّص القائمة وتتقدّم الأرقام.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import KpiGrid from '@/components/admin/KpiGrid.jsx';
import RevenueChart from '@/components/admin/RevenueChart.jsx';
import CategoryBars from '@/components/admin/CategoryBars.jsx';
import QueueCard from '@/components/admin/QueueCard.jsx';
import { IconCheck, IconRefresh, IconAlert, IconExternal } from '@/lib/icons.jsx';
import { adminService, analyticsService, orderService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { money, num } from '@/lib/format.js';

const RANGES = [[7, 'أسبوع'], [30, 'شهر'], [90, '٣ شهور'], [365, 'سنة']];

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { branches } = useBranch();
  const toast = useToast();

  const [days, setDays] = useState(30);
  const [scope, setScope] = useState(isAdmin ? '' : String(user.default_branch_id ?? ''));

  const readiness = useAsync(() => adminService.readiness(), []);
  const overview = useAsync(() => analyticsService.overview({ days, branch_id: scope || undefined }), [days, scope]);
  const branchStats = useAsync(() => (isAdmin ? analyticsService.branches() : Promise.resolve([])), [isAdmin]);

  // طابور التجهيز يحتاج فرعًا محدّدًا — لا معنى له عبر كل الفروع
  const queueBranch = scope || user.default_branch_id || branches[0]?.id;
  const queue = useAsync(
    () => (queueBranch ? analyticsService.queue(Number(queueBranch)) : Promise.resolve([])),
    [queueBranch],
  );

  const advance = async (orderNumber, status) => {
    try {
      await orderService.updateStatus(orderNumber, status);
      toast.success('تم تحديث حالة الطلب');
      queue.reload();
      overview.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const setup = readiness.data;
  const showChecklist = setup && !setup.ready;

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">نظرة عامة</h2>
          <p className="admin-page__sub">
            {showChecklist ? 'أكمِل الخطوات التالية ليصير المتجر جاهزًا للبيع.' : 'أداء المتجر والطلبات النشطة.'}
          </p>
        </div>

        <div className="admin-page__tools">
          {isAdmin && branches.length > 0 && (
            <select className="select select--inline" value={scope} onChange={(event) => setScope(event.target.value)}>
              <option value="">كل الفروع</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar}</option>)}
            </select>
          )}
          <div className="seg">
            {RANGES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`seg__item${days === value ? ' is-active' : ''}`}
                onClick={() => setDays(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── قائمة تحقّق الجاهزية ───────────────────────────── */}
      {readiness.loading && <Skeleton height={180} />}

      {showChecklist && (
        <div className="setup noir">
          <div className="setup__head">
            <div>
              <span className="eyebrow eyebrow--onDark">إعداد المتجر</span>
              <h3 className="setup__title">خطوتان أو ثلاث ويبدأ البيع</h3>
            </div>
            <div className="setup__count numeral">
              <strong>{setup.completed}</strong><span>/{setup.total}</span>
            </div>
          </div>

          <div className="setup__bar" role="progressbar" aria-valuenow={setup.completed} aria-valuemin={0} aria-valuemax={setup.total}>
            <span style={{ inlineSize: `${(setup.completed / setup.total) * 100}%` }} />
          </div>

          <ol className="setup__steps">
            {setup.steps.map((step) => (
              <li key={step.key} className={`setup__step${step.done ? ' is-done' : ''}`}>
                <span className="setup__tick">{step.done ? <IconCheck size={14} /> : null}</span>
                <div className="setup__text">
                  <Link to={step.href} className="setup__label">
                    {step.label}
                    {!step.done && <IconExternal size={13} />}
                  </Link>
                  <span className="setup__note">{step.note}</span>
                </div>
                <span className="setup__badge numeral">{num(step.count)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── المؤشّرات ───────────────────────────────────────── */}
      {overview.loading ? <Skeleton height={140} /> : <KpiGrid kpis={overview.data?.kpis} />}

      {!overview.loading && (overview.data?.kpis?.orders ?? 0) === 0 && !showChecklist && (
        <div className="panel">
          <EmptyState
            title="لا طلبات في هذه الفترة"
            description="المتجر جاهز — شارك رابطه وابدأ استقبال الطلبات."
            actionLabel="افتح المتجر"
            actionTo="/"
          />
        </div>
      )}

      {(overview.data?.kpis?.orders ?? 0) > 0 && (
        <>
          <RevenueChart data={overview.data?.daily_trend ?? []} days={days} />

          <div className="admin-cols">
            <CategoryBars data={overview.data?.by_category ?? []} />

            <div className="panel">
              <h3 className="panel__title">الأكثر مبيعًا</h3>
              <div className="table-wrap">
                <table className="table admin-table">
                  <thead><tr><th>المنتج</th><th>وحدات</th><th>إيراد</th></tr></thead>
                  <tbody>
                    {(overview.data?.top_products ?? []).map((row) => (
                      <tr key={row.slug}>
                        <td>
                          <Link to={`/product/${row.slug}`} className="link-underline">{row.name_ar}</Link>
                          <div className="cell-sub">{row.category_name}</div>
                        </td>
                        <td className="numeral">{num(row.units)}</td>
                        <td className="numeral">{money(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── تنبيهات المخزون ─────────────────────────────────── */}
      {(overview.data?.low_stock?.length ?? 0) > 0 && (
        <div className="panel panel--warn">
          <h3 className="panel__title">
            <IconAlert size={16} style={{ color: 'var(--warn)' }} />
            مخزون يقترب من النفاد
            <span className="badge badge--sale">{overview.data.low_stock.length}</span>
          </h3>

          <div className="table-wrap">
            <table className="table admin-table">
              <thead><tr><th>المنتج</th><th className="is-optional">الكود</th><th>الفرع</th><th>المتاح</th><th className="is-optional">حدّ التنبيه</th></tr></thead>
              <tbody>
                {overview.data.low_stock.map((row, index) => (
                  <tr key={index}>
                    <td>{row.name_ar}</td>
                    <td className="numeral cell-sub is-optional" dir="ltr">{row.sku}</td>
                    <td className="cell-sub">{row.branch_name}</td>
                    <td className="numeral" style={{ color: row.available <= 0 ? 'var(--danger-text)' : 'var(--warn-text)', fontWeight: 600 }}>
                      {num(row.available)}
                    </td>
                    <td className="numeral cell-sub is-optional">{num(row.low_stock_threshold)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── طابور التجهيز ───────────────────────────────────── */}
      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">طابور التجهيز</h3>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => queue.reload()}>
            <IconRefresh size={14} /> تحديث
          </button>
        </div>

        {queue.loading && <Skeleton height={180} />}

        {!queue.loading && (queue.data?.length ?? 0) === 0 && (
          <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
            {queueBranch ? 'لا طلبات قيد التنفيذ الآن.' : 'أضف فرعًا أولًا ليظهر طابور التجهيز.'}
          </p>
        )}

        {(queue.data ?? []).map((order) => (
          <QueueCard key={order.order_number} order={order} onAdvance={advance} />
        ))}
      </div>

      {/* ── مقارنة الفروع ───────────────────────────────────── */}
      {isAdmin && (branchStats.data?.length ?? 0) > 1 && (
        <div className="panel">
          <h3 className="panel__title">أداء الفروع — آخر ٣٠ يومًا</h3>
          <div className="table-wrap">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th>الفرع</th><th className="is-optional">المدينة</th><th>طلبات</th>
                  <th>إيراد</th><th className="is-optional">متوسّط الطلب</th><th className="is-optional">تقييم التوصيل</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.data.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.name_ar}</strong></td>
                    <td className="cell-sub is-optional">{row.city}</td>
                    <td className="numeral">{num(row.orders)}</td>
                    <td className="numeral">{money(row.revenue)}</td>
                    <td className="numeral is-optional">{money(row.avg_order_value)}</td>
                    <td className="numeral is-optional">{Number(row.avg_rating) > 0 ? Number(row.avg_rating).toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
