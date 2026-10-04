import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Screen from '@/components/shell/Screen.jsx';
import ProductRow from '@/components/product/ProductRow.jsx';
import { IconClose, IconSearch, IconChevronLeft } from '@/lib/icons.jsx';
import { getArt } from '@/lib/art.jsx';
import { catalogService } from '@/services/index.js';
import { api } from '@/lib/api.js';
import { useDebounce } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { storage, KEYS } from '@/lib/storage.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  البحث — شاشة كاملة لا قائمة منسدلة
 *
 *  على الهاتف تغطّي لوحة المفاتيح نصف الشاشة، فالاقتراحات تحتاج ما
 *  بقي منها كلّه. نؤخّر الطلب 260ms بعد آخر حرف، ونعرض قبل الكتابة
 *  سجلّ العميل وما يبحث عنه الناس فعلًا (من الخادم). لا «عبارات
 *  رائجة» مكتوبة في الكود: إن لم يرجع الخادم شيئًا، لا نعرض شيئًا.
 * ═══════════════════════════════════════════════════════════════
 */
export default function SearchScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { branchId, categories } = useBranch();
  const inputRef = useRef(null);

  const [term, setTerm] = useState(params.get('q') ?? '');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState(() => storage.get(KEYS.recentSearches, []));

  const debounced = useDebounce(term.trim(), 260);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // «الأكثر بحثًا» من مسارها المخصّص؛ مسار الاقتراحات يرفض استعلامًا فارغًا
  useEffect(() => {
    let alive = true;
    api.get('/products/trending', undefined, { auth: false })
      .then((list) => alive && setTrending(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (debounced.length < 2) { setResults([]); return undefined; }
    let alive = true;
    setSearching(true);
    catalogService.suggest(debounced, branchId)
      .then((payload) => {
        if (!alive) return;
        setResults(payload?.items ?? []);
        if (payload?.trending?.length) setTrending(payload.trending);
      })
      .catch(() => alive && setResults([]))
      .finally(() => alive && setSearching(false));
    return () => { alive = false; };
  }, [debounced, branchId]);

  /** آخر خمس عمليات بحث — على هذا الجهاز وحده */
  const remember = (value) => {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((item) => item !== clean)].slice(0, 5);
    setRecent(next);
    storage.set(KEYS.recentSearches, next);
  };

  const submit = (event) => {
    event?.preventDefault();
    const query = term.trim();
    if (!query) return;
    remember(query);
    inputRef.current?.blur();
    navigate(`/shop?search=${encodeURIComponent(query)}`);
  };

  const clearRecent = () => {
    setRecent([]);
    storage.remove(KEYS.recentSearches);
  };

  const showIdle = term.trim().length < 2;

  return (
    <Screen
      back
      stack
      center={(
        <form className="search-field" role="search" onSubmit={submit}>
          <IconSearch size={18} className="muted" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="ابحث عن منتج أو قسم أو مُنتِج…"
            aria-label="البحث في متجر رُمّان"
            autoComplete="off"
          />
          {term && (
            <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => { setTerm(''); inputRef.current?.focus(); }} aria-label="مسح البحث">
              <IconClose size={16} />
            </button>
          )}
        </form>
      )}
    >
      {showIdle && recent.length > 0 && (
        <section>
          <div className="row row--between">
            <h2 className="list-caption" style={{ margin: 0 }}>بحثك الأخير</h2>
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearRecent}>مسح</button>
          </div>
          <div className="row row--wrap" style={{ gap: 'var(--s-2)', marginBlockStart: 'var(--s-2)' }}>
            {recent.map((item) => (
              <button key={item} type="button" className="chip" onClick={() => setTerm(item)}>{item}</button>
            ))}
          </div>
        </section>
      )}

      {showIdle && trending.length > 0 && (
        <section style={{ marginBlockStart: 'var(--s-5)' }}>
          <h2 className="list-caption" style={{ marginBlockStart: 0 }}>يبحث عنه الناس الآن</h2>
          <div className="row row--wrap" style={{ gap: 'var(--s-2)' }}>
            {trending.map((row) => (
              <button key={row.term} type="button" className="chip" onClick={() => setTerm(row.term)}>{row.term}</button>
            ))}
          </div>
        </section>
      )}

      {/* ممرّات المتجر الفعلية — تصفّح بلا كتابة، ومن بيانات المتجر لا من الكود */}
      {showIdle && categories.length > 0 && (
        <section style={{ marginBlockStart: 'var(--s-5)' }}>
          <h2 className="list-caption" style={{ marginBlockStart: 0 }}>أو تجوّل بين الممرّات</h2>
          <div className="aisle-chips">
            {categories.map((category) => {
              const Art = getArt(category.motif);
              return (
                <Link key={category.slug} to={`/category/${category.slug}`} className="aisle-chip" style={{ '--cat': category.accent_color || undefined }}>
                  <span className="aisle-chip__art" aria-hidden="true"><Art className="die-cut" /></span>
                  {category.name_ar}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!showIdle && (
        <section aria-live="polite">
          {searching && results.length === 0 && <p className="muted text-sm" style={{ paddingBlock: 'var(--s-4)' }}>جارٍ البحث…</p>}
          {!searching && results.length === 0 && (
            <p className="muted text-sm" style={{ paddingBlock: 'var(--s-4)' }}>لا اقتراحات لـ «{term.trim()}». اضغط بحث لعرض كل النتائج.</p>
          )}
          {results.map((product) => (
            <ProductRow key={product.id} product={product} onSelect={() => remember(term)} />
          ))}
          <button type="button" className="list-row" style={{ paddingInline: 0 }} onClick={submit}>
            <span className="list-row__body">
              <span className="list-row__title text-brand">كل النتائج لـ «{term.trim()}»</span>
            </span>
            <span className="list-row__trail"><IconChevronLeft size={18} /></span>
          </button>
        </section>
      )}
    </Screen>
  );
}
