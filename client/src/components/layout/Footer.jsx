import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Fruit } from '@/lib/art.jsx';
import { IconPhone, IconMail, IconPin } from '@/lib/icons.jsx';
import { contentService } from '@/services/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { useBranch } from '@/context/BranchContext.jsx';
import { FOOTER_COLUMNS } from '@/data/content.js';
import { useSite } from '@/context/SiteContext.jsx';
import { num } from '@/lib/format.js';

export default function Footer() {
  const toast = useToast();
  const { branches } = useBranch();
  const { support, brand } = useSite();

  /** المدن من الفروع الفعلية، بلا تكرار — لا قائمة مكتوبة يدويًا */
  const cities = [...new Set(branches.map((item) => item.governorate || item.city).filter(Boolean))];
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const subscribe = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await contentService.newsletter(email.trim());
      toast.success('اشتركت في نشرة رُمّان — أهلًا بك');
      setEmail('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__hero">
          <div className="footer__brand">
            <Fruit size={96} />
            <div>
              <div className="footer__word">رُمّان</div>
              {brand.tagline && <div className="footer__hand">{brand.tagline}</div>}
              <p className="footer__note">
                سوبر ماركت انتقائي{branches.length > 0 ? ` في ${num(branches.length)} ${branches.length === 1 ? 'فرع' : 'فروع'}` : ''}.
                نختار المنتج قبل أن نعرضه، ونكتب مصدره على البطاقة — لأن معرفة ما تأكله جزء من جودته.
              </p>
            </div>
          </div>

          <form className="newsletter-stub" onSubmit={subscribe}>
            <h4>قسيمة النشرة</h4>
            <p>عروض الأسبوع تصلك على بريدك، ولا شيء غيرها.</p>
            <div className="newsletter">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="بريدك الإلكتروني"
                aria-label="اشترك في النشرة البريدية"
                required
              />
              <button type="submit" className="btn btn--primary btn--sm" disabled={sending}>
                {sending ? '…' : 'اشترك'}
              </button>
            </div>
          </form>
        </div>

        <div className="footer__top">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="footer__title">{column.title}</h4>
              <ul className="footer__list">
                {column.links.map(([to, label]) => (
                  <li key={label}><Link to={to}>{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {brand.name} — كل الحقوق محفوظة.</span>
          <div style={{ display: 'flex', gap: 'var(--s-5)', flexWrap: 'wrap' }}>
            {support.phone && (
              <a href={`tel:${support.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconPhone size={14} /> <span className="numeral" dir="ltr">{support.phone}</span>
              </a>
            )}
            {support.email && (
              <a href={`mailto:${support.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconMail size={14} /> <span dir="ltr">{support.email}</span>
              </a>
            )}
            {cities.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconPin size={14} /> {cities.join(' · ')}
              </span>
            )}
          </div>
          <span className="footer__bar" aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
}
