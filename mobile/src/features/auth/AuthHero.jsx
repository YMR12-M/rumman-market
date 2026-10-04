import { BrandMark } from '@/lib/motifs.jsx';

/**
 * رأس شاشات الدخول: السطح الليلي بعلامة البراند وسطرٍ واحد يقول لماذا.
 * نفس روح الجانب المظلم في صفحات الدخول المكتبية، مطويًّا فوق النموذج.
 */
export default function AuthHero({ title, text }) {
  return (
    <header className="card card--noir auth-hero">
      <BrandMark size={44} className="auth-hero__mark" seedColor="var(--gold-300)" />
      <h1 className="auth-hero__title">{title}</h1>
      {text && <p className="auth-hero__text">{text}</p>}
    </header>
  );
}
