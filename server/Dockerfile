# ──────────────────────────────────────────────────────────────
#  رُمّان — صورة الخادم للإنتاج
#
#  بناء على مرحلتين: مرحلة تثبّت الاعتماديات كاملةً، ومرحلة نهائية
#  تحمل اعتماديات الإنتاج فقط — فتصغر الصورة ويقلّ سطح الهجوم.
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# --omit=dev: لا أدوات تطوير في الإنتاج
RUN npm ci --omit=dev --workspace=@rumman/server --include-workspace-root

# ── الصورة النهائية ────────────────────────────────────────────
FROM node:22-alpine

# tini يتولّى إشارات النظام (PID 1) فيعمل الإيقاف النظيف
RUN apk add --no-cache tini curl

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY database ./database

# مجلّد الملفات المرفوعة يُركَّب من الخارج كي تبقى بعد إعادة البناء
RUN mkdir -p /app/server/uploads/products /app/server/uploads/proofs /app/server/uploads/branches \
 && chown -R node:node /app/server/uploads

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/src/server.js"]
