/**
 * تفعيل البريد الإلكتروني.
 * صفحة تُفتح من الرابط في الرسالة، تعمل فورًا وتقول النتيجة بوضوح.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Logo from '@/components/brand/Logo.jsx';
import { BrandMark } from '@/lib/motifs.jsx';
import { IconCheck, IconAlert } from '@/lib/icons.jsx';
import { authService } from '@/services/index.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [state, setState] = useState({ status: 'working', message: '' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'الرابط ناقص أو تالف.' });
      return;
    }

    let alive = true;
    authService.verifyEmail(token)
      .then(() => alive && setState({ status: 'done', message: 'تم تفعيل بريدك بنجاح.' }))
      .catch((error) => alive && setState({ status: 'error', message: error.message }));

    return () => { alive = false; };
  }, [token]);

  return (
    <div className="auth">
      <aside className="auth__aside">
        <Logo inverse size={38} asLink={false} />
        <div style={{ marginTop: 'var(--s-8)' }}>
          <BrandMark size={90} style={{ color: 'var(--gold-400)' }} />
          <h2 style={{ color: 'var(--ivory)', marginTop: 'var(--s-5)', fontSize: 'var(--t-xl)' }}>
            بريدٌ مفعّل يعني أننا نصل إليك حين يهمّك الأمر.
          </h2>
        </div>
      </aside>

      <div className="auth__form">
        <div className="auth__form-inner" style={{ textAlign: 'center' }}>
          <div
            className="empty__mark"
            style={{
              margin: '0 auto var(--s-4)',
              background: state.status === 'done' ? 'var(--success-tint)' : undefined,
              color: state.status === 'done' ? 'var(--success-text)' : undefined,
            }}
          >
            {state.status === 'working' ? <BrandMark size={44} /> : state.status === 'done' ? <IconCheck size={40} /> : <IconAlert size={36} />}
          </div>

          <h1 style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s-3)' }}>
            {state.status === 'working' ? 'جارٍ التفعيل…' : state.status === 'done' ? 'أهلًا بك' : 'تعذّر التفعيل'}
          </h1>

          {state.message && (
            <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>{state.message}</p>
          )}

          {state.status !== 'working' && (
            <Link
              to={state.status === 'done' ? '/shop' : '/account'}
              className="btn btn--primary"
              style={{ marginTop: 'var(--s-5)' }}
            >
              {state.status === 'done' ? 'ابدأ التسوّق' : 'اذهب إلى حسابك'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
