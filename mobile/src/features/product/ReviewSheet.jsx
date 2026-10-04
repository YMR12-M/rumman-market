import { useEffect, useState } from 'react';
import Sheet from '@/components/ui/Sheet.jsx';
import Field from '@/components/ui/Field.jsx';
import { IconStar } from '@/lib/icons.jsx';
import { reviewService } from '@/services/index.js';
import { useToast } from '@/context/ToastContext.jsx';
import { haptic } from '@/lib/haptics.js';

const LABELS = ['', 'لم يعجبني', 'مقبول', 'جيد', 'جيد جدًا', 'ممتاز'];

/**
 * كتابة تقييم لمنتج اشتراه العميل واستلمه.
 * الخادم هو من يقرّر الأهلية (شراء مُسلَّم، وتقييم واحد لكل منتج)،
 * والشاشة تعرض الزرّ لمن يستحقّه فقط — فرفضٌ هنا حالة نادرة نعرض
 * رسالتها كما هي.
 */
export default function ReviewSheet({ open, onClose, product, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setRating(0); setTitle(''); setBody(''); setErrors({}); }
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) { setErrors({ rating: 'اختر عدد النجوم' }); return; }
    setBusy(true);
    setErrors({});
    try {
      await reviewService.create({
        product_id: product.id,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      });
      toast.success('شكرًا — نُشر تقييمك');
      onDone?.();
      onClose();
    } catch (error) {
      setErrors(error.errors ?? {});
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="قيّم المنتج"
      footer={(
        <button type="submit" form="review-form" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? <span className="spinner" /> : 'أرسل التقييم'}
        </button>
      )}
    >
      <form id="review-form" onSubmit={submit} noValidate>
        <p className="lede" style={{ marginBlockEnd: 'var(--s-3)' }}>{product?.name_ar}</p>

        <div role="radiogroup" aria-label="عدد النجوم" className="row" style={{ gap: 0, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} من 5 — ${LABELS[value]}`}
              className={`star-btn${value <= rating ? ' is-on' : ''}`}
              onClick={() => { haptic('tap'); setRating(value); }}
            >
              <IconStar size={32} filled={value <= rating} />
            </button>
          ))}
        </div>
        <p className="text-sm" style={{ textAlign: 'center', minHeight: '1.6em', marginBlockEnd: 'var(--s-4)' }}>
          {rating ? LABELS[rating] : <span className="muted">اضغط على النجوم</span>}
        </p>
        {errors.rating && <p className="field__error" role="alert" style={{ textAlign: 'center' }}>{errors.rating}</p>}

        <Field label="عنوان قصير (اختياري)" name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} error={errors.title} />
        <Field
          label="رأيك (اختياري)"
          name="body"
          as="textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          error={errors.body}
          placeholder="ما الذي أعجبك أو لم يعجبك؟"
        />
      </form>
    </Sheet>
  );
}
