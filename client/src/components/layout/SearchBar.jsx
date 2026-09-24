import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch } from '@/lib/icons.jsx';
import ProductPlate from '@/components/product/ProductPlate.jsx';
import { catalogService } from '@/services/index.js';
import { useDebounce, useClickOutside } from '@/hooks/index.js';
import { useBranch } from '@/context/BranchContext.jsx';
import { money } from '@/lib/format.js';
import { storage, KEYS } from '@/lib/storage.js';

/**
 * بحث فوري مع لوحة اقتراحات.
 * نؤخّر الطلب 260ms بعد آخر حرف، ونعرض «الأكثر بحثًا» وسجلّ العميل
 * حين يكون الحقل فارغًا — فلا تبدو اللوحة خالية أبدًا.
 */
export default function SearchBar({ onNavigate }) {
  const navigate = useNavigate();
  const { branchId } = useBranch();

  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState(() => storage.get(KEYS.recentSearches, []));

  const debouncedTerm = useDebounce(term, 260);
  const containerRef = useClickOutside(useCallback(() => setOpen(false), []));

  useEffect(() => {
    if (debouncedTerm.trim().length < 2) { setResults([]); return; }
    let cancelled = false;

    catalogService.suggest(debouncedTerm.trim(), branchId)
      .then((payload) => {
        if (cancelled) return;
        setResults(payload.items ?? []);
        setTrending(payload.trending ?? []);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [debouncedTerm, branchId]);

  /** حفظ آخر خمس عمليات بحث محليًا */
  const remember = (value) => {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 5);
    setRecent(next);
    storage.set(KEYS.recentSearches, next);
  };

  const submit = (event) => {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    remember(query);
    setOpen(false);
    onNavigate?.();
    navigate(`/shop?search=${encodeURIComponent(query)}`);
  };

  const goToProduct = (product) => {
    remember(term.trim() || product.name_ar);
    setOpen(false);
    setTerm('');
    onNavigate?.();
    navigate(`/product/${product.slug}`);
  };

  const showPanel = open && (results.length > 0 || term.trim().length < 2);

  return (
    <div className="search" ref={containerRef}>
      <form onSubmit={submit} role="search">
        <IconSearch size={18} className="search__icon" />
        <input
          type="search"
          className="search__input"
          placeholder="ابحث عن منتج، قسم، أو مُنتِج…"
          value={term}
          onChange={(event) => { setTerm(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          aria-label="البحث في متجر رُمّان"
          autoComplete="off"
        />
      </form>

      {showPanel && (
        <div className="search__panel">
          {results.length > 0 && (
            <>
              <div className="search__section-title">منتجات</div>
              {results.map((product) => (
                <button key={product.id} type="button" className="search__result" onClick={() => goToProduct(product)}>
                  <div style={{ width: 42, flexShrink: 0, containerType: 'inline-size' }}>
                    <ProductPlate name={product.name_ar} motif={product.category_motif} accent={product.category_accent} compact />
                  </div>
                  <span style={{ flex: 1 }}>
                    <span className="search__result-name">{product.name_ar}</span>
                    <span className="search__result-meta" style={{ display: 'block' }}>
                      {product.category_name} · {product.unit_size}
                    </span>
                  </span>
                  <span className="numeral" style={{ fontSize: 'var(--t-sm)' }}>
                    {money(product.effective_price ?? product.price)}
                  </span>
                </button>
              ))}
            </>
          )}

          {term.trim().length < 2 && recent.length > 0 && (
            <>
              <div className="search__section-title">بحثك الأخير</div>
              <div className="search__chips">
                {recent.map((item) => (
                  <button key={item} type="button" className="search__chip" onClick={() => setTerm(item)}>{item}</button>
                ))}
              </div>
            </>
          )}

          {term.trim().length < 2 && (
            <>
              <div className="search__section-title">يبحث عنه الناس الآن</div>
              <div className="search__chips">
                {(trending.length > 0
                  ? trending.map((row) => row.term)
                  : ['زيت زيتون', 'فراولة', 'قهوة إثيوبية', 'جبنة رومي', 'عسل سدر', 'سالمون']
                ).map((item) => (
                  <button key={item} type="button" className="search__chip" onClick={() => setTerm(item)}>{item}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
