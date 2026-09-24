/**
 * مسجّل بسيط بألوان ANSI — يكفي لمشروع بهذا الحجم.
 * في الإنتاج يمكن استبداله بـ pino/winston دون تغيير نداءاته.
 */
const COLORS = {
  reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

const stamp = () => new Date().toISOString().slice(11, 19);

export const logger = {
  info:    (msg) => console.log(`${COLORS.cyan}[${stamp()}] ›${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}[${stamp()}] ✔${COLORS.reset} ${msg}`),
  warn:    (msg) => console.warn(`${COLORS.yellow}[${stamp()}] ⚠${COLORS.reset} ${msg}`),
  error:   (msg) => console.error(`${COLORS.red}[${stamp()}] ✖${COLORS.reset} ${msg}`),
  debug:   (msg) => process.env.NODE_ENV !== 'production' && console.log(`${COLORS.dim}[${stamp()}] ·${COLORS.reset} ${msg}`),
};
