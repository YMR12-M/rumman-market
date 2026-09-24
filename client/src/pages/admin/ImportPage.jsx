/**
 * استيراد الكتالوج من ملف Excel/CSV.
 *
 * التدفّق ثلاث خطوات مقصودة بهذا الترتيب:
 *   ١) نزّل القالب — فلا يخمّن أحد أسماء الأعمدة.
 *   ٢) ارفع الملف واقرأ تقرير المعاينة — الأخطاء مرقّمة بالسطر كما
 *      يراها في Excel، فيصحّحها في مكانها.
 *   ٣) طبّق — والتطبيق ممنوع ما لم يخلُ الملف من الأخطاء.
 *
 * لا يوجد «تطبيق مباشر» عمدًا. استيراد ثمانمئة صنف ثم اكتشاف خطأ في
 * العمود الرابع كارثة تستحقّ خطوةً إضافية لمنعها.
 */
import { useState } from 'react';
import { adminService } from '@/services/index.js';
import { useAsync } from '@/hooks/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import {
  IconDownload, IconUpload, IconCheck, IconAlert, IconFile, IconRefresh,
} from '@/lib/icons.jsx';
import { money, num } from '@/lib/format.js';

export default function ImportPage() {
  const toast = useToast();
  const columns = useAsync(() => adminService.import.columns(), []);
  const branches = useAsync(() => adminService.branches.list(), []);

  const [file, setFile] = useState(null);
  const [csv, setCsv] = useState('');
  const [branchId, setBranchId] = useState('');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const reset = () => {
    setFile(null); setCsv(''); setReport(null); setDone(null);
  };

  const pick = async (event) => {
    const picked = event.target.files?.[0];
    if (!picked) return;

    setDone(null);
    setReport(null);
    setFile(picked);

    try {
      const text = await picked.text();
      setCsv(text);
    } catch {
      toast.error('تعذّر قراءة الملف');
      setFile(null);
    }
    event.target.value = '';
  };

  const preview = async () => {
    setBusy(true);
    try {
      const result = await adminService.import.preview(csv, branchId || undefined);
      setReport(result);
      if (result.error_count > 0) toast.error(`${result.error_count} سطرًا يحتاج تصحيحًا`);
      else toast.success(`${result.valid_count} صنفًا جاهزًا`);
    } catch (error) {
      toast.error(error.message);
      setReport(null);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const result = await adminService.import.commit(csv, branchId || undefined);
      setDone(result);
      setReport(null);
      toast.success('تم الاستيراد بنجاح');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      await adminService.import.template();
    } catch {
      toast.error('تعذّر تنزيل القالب');
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h2 className="admin-page__title">استيراد المنتجات</h2>
          <p className="admin-page__sub">
            ارفع كتالوجك من ملف واحد. الأقسام والعلامات تُنشأ تلقائيًا بأسمائها، والكود (SKU) هو المفتاح —
            فإعادة رفع نفس الملف بعد تعديل الأسعار تُحدّث ولا تُكرّر.
          </p>
        </div>
      </header>

      {/* ── خطوة ١: القالب ─────────────────────────────────── */}
      <div className="step-card">
        <span className="step-card__num numeral">١</span>
        <div className="step-card__body">
          <h3>نزّل القالب</h3>
          <p className="muted">
            ملف CSV بترميز عربي صحيح وسطر مثال. افتحه في Excel، املأ أصنافك، واحفظه بصيغة
            <strong> CSV UTF-8</strong>.
          </p>

          {columns.loading ? <Skeleton height={90} /> : (
            <details className="cols-help">
              <summary>الأعمدة المتوقّعة ({columns.data?.columns?.length ?? 0})</summary>
              <ul>
                {(columns.data?.columns ?? []).map((column) => (
                  <li key={column.field}>
                    <strong>{column.header}</strong>
                    {column.required && <span className="badge badge--sale">مطلوب</span>}
                    {column.note && <span className="muted"> — {column.note}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <button type="button" className="btn btn--outline btn--sm" onClick={download}>
            <IconDownload size={15} /> تنزيل القالب
          </button>
        </div>
      </div>

      {/* ── خطوة ٢: الرفع والمعاينة ────────────────────────── */}
      <div className="step-card">
        <span className="step-card__num numeral">٢</span>
        <div className="step-card__body">
          <h3>ارفع الملف واقرأ التقرير</h3>

          <div className="import-controls">
            <label className={`file-drop${file ? ' is-filled' : ''}`}>
              <input type="file" accept=".csv,text/csv" onChange={pick} hidden />
              {file ? <IconFile size={22} /> : <IconUpload size={22} />}
              <span>
                {file ? file.name : 'اختر ملف CSV'}
                {file && <em className="muted"> — {num(Math.round(file.size / 1024))} ك.ب</em>}
              </span>
            </label>

            <label className="field" style={{ margin: 0, minInlineSize: 200 }}>
              <span className="field__label">الفرع للمخزون الابتدائي</span>
              <select className="select" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="">بلا مخزون — أسجّله لاحقًا</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="res-form__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={preview} disabled={!csv || busy}>
              {busy ? 'جارٍ الفحص…' : 'فحص الملف'}
            </button>
            {file && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={reset} disabled={busy}>
                <IconRefresh size={14} /> ابدأ من جديد
              </button>
            )}
          </div>

          {/* تقرير المعاينة */}
          {report && (
            <div className="report">
              <div className="report__stats">
                <div className={`report__stat${report.valid_count > 0 ? ' is-ok' : ''}`}>
                  <strong className="numeral">{num(report.valid_count)}</strong>
                  <span>صنفًا صالحًا</span>
                </div>
                <div className={`report__stat${report.error_count > 0 ? ' is-bad' : ''}`}>
                  <strong className="numeral">{num(report.error_count)}</strong>
                  <span>سطرًا به خطأ</span>
                </div>
              </div>

              {report.error_count > 0 && (
                <div className="report__errors">
                  <h4><IconAlert size={15} /> صحّح هذه الأسطر في الملف ثم أعد الفحص</h4>
                  <ul>
                    {report.errors.map((error) => (
                      <li key={error.line}>
                        <span className="report__line numeral">سطر {num(error.line)}</span>
                        <span className="report__name">{error.name}</span>
                        <span className="report__why">{error.problems.join(' · ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.error_count === 0 && report.sample?.length > 0 && (
                <div className="report__sample">
                  <h4><IconCheck size={15} /> معاينة أول {report.sample.length} أصناف</h4>
                  <div className="table-wrap">
                    <table className="table admin-table">
                      <thead><tr><th>الاسم</th><th>القسم</th><th>السعر</th><th>الكمية</th></tr></thead>
                      <tbody>
                        {report.sample.map((row) => (
                          <tr key={row.sku}>
                            <td>
                              <strong>{row.name_ar}</strong>
                              <div className="cell-sub numeral" dir="ltr">{row.sku}</div>
                            </td>
                            <td>{row.category}</td>
                            <td className="numeral">{money(row.price)}</td>
                            <td className="numeral">{num(row.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── خطوة ٣: التطبيق ────────────────────────────────── */}
      <div className={`step-card${report?.error_count === 0 && report.valid_count > 0 ? ' is-ready' : ' is-locked'}`}>
        <span className="step-card__num numeral">٣</span>
        <div className="step-card__body">
          <h3>طبّق الاستيراد</h3>

          {done ? (
            <div className="report__done">
              <IconCheck size={20} />
              <div>
                <strong>اكتمل الاستيراد</strong>
                <p className="muted">
                  <span className="numeral">{num(done.created)}</span> صنفًا جديدًا ·
                  <span className="numeral"> {num(done.updated)}</span> تحديثًا ·
                  <span className="numeral"> {num(done.categoriesCreated)}</span> قسمًا جديدًا ·
                  <span className="numeral"> {num(done.brandsCreated)}</span> علامة جديدة
                  {done.stocked > 0 && <> · مخزون في <span className="numeral">{num(done.stocked)}</span> صنفًا</>}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="muted">
                يُطبَّق كله في معاملة واحدة — إن فشل أي سطر لا يُكتب شيء. لا يُفتح هذا الزرّ إلّا بعد فحصٍ نظيف.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={commit}
                disabled={busy || !report || report.error_count > 0 || report.valid_count === 0}
              >
                {busy ? 'جارٍ الاستيراد…' : report ? `استورد ${num(report.valid_count)} صنفًا` : 'افحص الملف أولًا'}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
