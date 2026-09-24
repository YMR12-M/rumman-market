import crypto from 'node:crypto';

/**
 * يضيف معرّفًا فريدًا لكل طلب ويرسله في ترويسة X-Request-Id.
 * يسهّل تتبّع طلب بعينه في السجلات عند تشخيص مشكلة عميل.
 */
export function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  req.startedAt = Date.now();
  next();
}
