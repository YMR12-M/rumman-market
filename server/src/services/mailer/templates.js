/**
 * ═══════════════════════════════════════════════════════════════
 *  قوالب البريد — عربية RTL بهوية رُمّان
 *
 *  لماذا HTML مكتوب يدويًا بلا مكتبة؟ لأن عملاء البريد (خاصة
 *  Outlook) لا يدعمون CSS الحديث: لا flex ولا grid ولا متغيّرات.
 *  الطريقة الوحيدة الآمنة هي جداول وأنماط سطرية — وهذا ما نفعله.
 *
 *  الهوية هنا هي هوية «السوق المطبوع» مبسّطة: ورق كريمي وحبر خمري
 *  وأحمر الرمّان وأصفر الهايلايتر، ومظلّة المحلّ شرائطَ من خلايا جدول
 *  (لأن التدرّجات تُحذف في البريد). لا ظلال ولا تدرّجات.
 * ═══════════════════════════════════════════════════════════════
 */

const INK = '#1D0B15';
const RUBY = '#D5233F';
const GOLD = '#FFC533';
const IVORY = '#FBF2DF';      // ورق
const PAPER_DEEP = '#F1E4C6'; // خلفية الصفحة حول البطاقة
const CARD = '#FFFDF6';
const MUTED = '#6E5360';
const LINE = '#E5D6B8';

/** مظلّة المحلّ: شرائط أحمر وكريمي من خلايا جدول — تعمل في كل العملاء */
const AWNING_STRIPES = 22;
const awning = () => `<tr><td style="padding:0;font-size:0;line-height:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${
  Array.from({ length: AWNING_STRIPES }, (_, i) => `<td height="14" style="height:14px;font-size:0;line-height:0;background:${i % 2 ? IVORY : RUBY};">&nbsp;</td>`).join('')
}</tr></table>
        </td></tr>`;

const money = (value) => `${Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

/** ترميز النصّ قبل حقنه في HTML — حماية من الحقن عبر أسماء المستخدمين */
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/**
 * الهيكل المشترك لكل رسالة.
 * @param {{title:string, preheader:string, body:string, brand:object}} options
 */
function shell({ title, preheader, body, brand }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER_DEEP};font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${INK};">
  <!-- سطر المعاينة في صندوق الوارد -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER_DEEP};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:${CARD};border:2px solid ${INK};border-radius:14px;overflow:hidden;">

        <!-- مظلّة المحلّ -->
        ${awning()}

        <!-- الترويسة: حبر وخطّ أصفر -->
        <tr><td style="background:${INK};padding:24px 28px;border-bottom:3px solid ${GOLD};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:23px;font-weight:700;color:${IVORY};letter-spacing:-0.5px;">رُمّان</td>
            <td align="left" style="font-size:11px;color:${GOLD};letter-spacing:2px;">RUMMAN</td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:32px 28px;">${body}</td></tr>

        <!-- التذييل -->
        <tr><td style="background:${IVORY};padding:22px 28px;border-top:2px dashed ${LINE};">
          <p style="margin:0 0 8px;font-size:12px;color:${MUTED};line-height:1.8;">
            ${esc(brand.tagline)}<br>
            خدمة العملاء: <a href="tel:${esc(brand.phone)}" style="color:${RUBY};text-decoration:none;">${esc(brand.phone)}</a>
            &nbsp;·&nbsp;
            <a href="mailto:${esc(brand.email)}" style="color:${RUBY};text-decoration:none;">${esc(brand.email)}</a>
          </p>
          <p style="margin:0;font-size:11px;color:#8A6F5A;">
            وصلتك هذه الرسالة لأن لديك حسابًا في ${esc(brand.name)}.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** زرّ الإجراء الرئيسي — مبني بجدول ليعمل في Outlook */
const button = (href, label, background = RUBY, color = '#FFFFFF') => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
  <td style="background:${background};border:2px solid ${INK};border-radius:10px;">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:${color};text-decoration:none;">${esc(label)}</a>
  </td>
</tr></table>`;

const h1 = (text) => `<h1 style="margin:0 0 14px;font-size:23px;font-weight:700;color:${INK};line-height:1.35;">${esc(text)}</h1>`;
const p = (html) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.9;color:#432130;">${html}</p>`;
const note = (text) => `<p style="margin:20px 0 0;font-size:12px;line-height:1.8;color:${MUTED};">${esc(text)}</p>`;

/* ═══════════════════════════════════════════════════════════════
   القوالب
   ═══════════════════════════════════════════════════════════════ */

export const templates = {
  /** تفعيل البريد بعد التسجيل */
  verifyEmail: ({ name, link, brand }) => ({
    subject: `فعّل بريدك في ${brand.name}`,
    html: shell({
      brand,
      title: 'تفعيل البريد',
      preheader: 'خطوة واحدة ويكتمل حسابك.',
      body: `${h1(`أهلًا ${esc(String(name).split(' ')[0])}`)}
${p('سعداء بانضمامك. اضغط الزرّ لتأكيد بريدك ويصير حسابك جاهزًا بالكامل.')}
${button(link, 'تأكيد البريد')}
${p(`إن لم يعمل الزرّ، انسخ هذا الرابط في متصفّحك:<br><span style="color:${MUTED};font-size:12px;word-break:break-all;">${esc(link)}</span>`)}
${note('الرابط صالح لمدة 24 ساعة. إن لم تكن أنت من أنشأ الحساب، تجاهل هذه الرسالة.')}`,
    }),
  }),

  /** استعادة كلمة المرور */
  resetPassword: ({ name, link, brand }) => ({
    subject: `استعادة كلمة المرور — ${brand.name}`,
    html: shell({
      brand,
      title: 'استعادة كلمة المرور',
      preheader: 'رابط تعيين كلمة مرور جديدة بالداخل.',
      body: `${h1(`مرحبًا ${esc(String(name).split(' ')[0])}`)}
${p('وصلنا طلب لتعيين كلمة مرور جديدة لحسابك. اضغط الزرّ لإتمام ذلك.')}
${button(link, 'تعيين كلمة مرور جديدة')}
${p(`أو انسخ الرابط:<br><span style="color:${MUTED};font-size:12px;word-break:break-all;">${esc(link)}</span>`)}
${note('الرابط صالح لساعة واحدة ويُستخدم مرّة واحدة. إن لم تطلب ذلك، تجاهل الرسالة — كلمة مرورك الحالية تبقى كما هي.')}`,
    }),
  }),

  /** تأكيد استلام الطلب */
  orderPlaced: ({ name, order, items, link, brand }) => {
    const rows = items.map((item) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};">
          ${esc(item.name_snapshot)}
          <span style="color:${MUTED};font-size:12px;">× ${Number(item.quantity)}</span>
        </td>
        <td align="left" style="padding:9px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};white-space:nowrap;">
          ${money(item.line_total)}
        </td>
      </tr>`).join('');

    const line = (label, value, bold = false) => `
      <tr>
        <td style="padding:6px 0;font-size:${bold ? '16px' : '14px'};color:${bold ? INK : MUTED};font-weight:${bold ? 700 : 400};">${esc(label)}</td>
        <td align="left" style="padding:6px 0;font-size:${bold ? '16px' : '14px'};color:${bold ? RUBY : MUTED};font-weight:${bold ? 700 : 400};white-space:nowrap;">${value}</td>
      </tr>`;

    return {
      subject: `استلمنا طلبك ${order.order_number}`,
      html: shell({
        brand,
        title: 'تأكيد الطلب',
        preheader: `طلبك ${order.order_number} قيد التجهيز.`,
        body: `${h1('استلمنا طلبك')}
${p(`شكرًا ${esc(String(name).split(' ')[0])}. رقم طلبك <strong style="color:${RUBY};">${esc(order.order_number)}</strong> وهو الآن قيد المراجعة.`)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">${rows}</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${line('المجموع', money(order.subtotal))}
  ${Number(order.discount_total) > 0 ? line('الخصم', `- ${money(order.discount_total)}`) : ''}
  ${line(order.fulfillment_type === 'pickup' ? 'الاستلام من الفرع' : 'التوصيل', Number(order.delivery_fee) > 0 ? money(order.delivery_fee) : 'مجانًا')}
  ${line('الإجمالي', money(order.grand_total), true)}
</table>

${button(link, 'تتبّع الطلب')}
${note('سنُعلمك بكل تغيّر في حالة الطلب على هذا البريد.')}`,
      }),
    };
  },

  /** تغيّر حالة الطلب */
  orderStatus: ({ name, order, statusLabel, statusNote, link, brand }) => ({
    subject: `طلبك ${order.order_number} — ${statusLabel}`,
    html: shell({
      brand,
      title: 'تحديث حالة الطلب',
      preheader: `${order.order_number}: ${statusLabel}`,
      body: `${h1(statusLabel)}
${p(`مرحبًا ${esc(String(name).split(' ')[0])}، تحدّثت حالة طلبك <strong style="color:${RUBY};">${esc(order.order_number)}</strong>.`)}
${statusNote ? p(esc(statusNote)) : ''}
${button(link, 'عرض تفاصيل الطلب')}`,
    }),
  }),

  /** تأكيد استلام تحويل إنستاباي */
  paymentConfirmed: ({ name, order, link, brand }) => ({
    subject: `تأكيد الدفع — ${order.order_number}`,
    html: shell({
      brand,
      title: 'تأكيد الدفع',
      preheader: `استلمنا مبلغ طلبك ${order.order_number}.`,
      body: `${h1('تأكّد الدفع')}
${p(`شكرًا ${esc(String(name).split(' ')[0])}. راجع فريقنا التحويل واعتمده، وطلبك <strong style="color:${RUBY};">${esc(order.order_number)}</strong> انتقل إلى مرحلة التجهيز.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
  <tr><td style="padding:14px 16px;background:#FFF3C4;border:2px solid ${INK};border-radius:10px;font-size:15px;color:${INK};">
    المبلغ المستلم: <strong>${money(order.grand_total)}</strong>
  </td></tr>
</table>
${button(link, 'عرض الطلب')}`,
    }),
  }),

  /** كود دفع فوري */
  fawryCode: ({ name, order, referenceNumber, expiresAt, link, brand }) => ({
    subject: `كود فوري لطلبك ${order.order_number}`,
    html: shell({
      brand,
      title: 'كود الدفع',
      preheader: `كود فوري: ${referenceNumber}`,
      body: `${h1('كود الدفع جاهز')}
${p(`${esc(String(name).split(' ')[0])}، ادفع بهذا الكود من أي منفذ فوري أو من تطبيق myFawry.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr><td align="center" style="padding:22px;background:${INK};border:2px solid ${GOLD};border-radius:10px;">
    <div style="font-size:11px;color:${GOLD};letter-spacing:3px;margin-bottom:8px;">كود الدفع</div>
    <div style="font-size:30px;font-weight:700;color:${IVORY};letter-spacing:5px;">${esc(referenceNumber)}</div>
    <div style="font-size:14px;color:#E8D6BB;margin-top:10px;">${money(order.grand_total)}</div>
  </td></tr>
</table>
${expiresAt ? note(`الكود صالح حتى ${expiresAt}.`) : ''}
${button(link, 'عرض الطلب')}`,
    }),
  }),
};
