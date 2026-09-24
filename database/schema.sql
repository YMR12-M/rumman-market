-- ═══════════════════════════════════════════════════════════════════════════
--  رُمّان | RUMMAN MARKET — مخطط قاعدة البيانات
--  MySQL 8.0+ / InnoDB / utf8mb4
--
--  اصطلاحات المخطط:
--   • كل جدول له id BIGINT UNSIGNED AUTO_INCREMENT كمفتاح أساسي.
--   • الجداول المعروضة للعميل لها عمود uuid/slug للاستخدام في الروابط (لا نكشف الـ id التسلسلي).
--   • الحذف المنطقي (Soft Delete) عبر deleted_at في الجداول الأساسية.
--   • كل المبالغ DECIMAL(12,2) — ممنوع استخدام FLOAT مع النقود.
--   • التواريخ UTC في التخزين، والعرض بتوقيت القاهرة في طبقة التطبيق.
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── 1) الحسابات والصلاحيات ────────────────────────────────────────────────

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid              CHAR(36)        NOT NULL COMMENT 'معرّف عام يُستخدم في الـ API',
  full_name         VARCHAR(120)    NOT NULL,
  email             VARCHAR(160)    NOT NULL,
  phone             VARCHAR(20)             DEFAULT NULL,
  password_hash     VARCHAR(255)    NOT NULL COMMENT 'bcrypt — لا يُرسل أبدًا للواجهة',
  role              ENUM('customer','staff','branch_manager','admin') NOT NULL DEFAULT 'customer',
  avatar_url        VARCHAR(255)            DEFAULT NULL,
  birth_date        DATE                    DEFAULT NULL,
  gender            ENUM('male','female','unspecified') NOT NULL DEFAULT 'unspecified',
  preferred_lang    ENUM('ar','en')  NOT NULL DEFAULT 'ar',
  default_branch_id BIGINT UNSIGNED         DEFAULT NULL,
  loyalty_points    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'رصيد نقاط الولاء الحالي',
  loyalty_tier      ENUM('silver','gold','platinum') NOT NULL DEFAULT 'silver',
  wallet_balance    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  total_spent       DECIMAL(12,2)   NOT NULL DEFAULT 0.00 COMMENT 'يُستخدم لترقية الفئة',
  orders_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  email_verified_at DATETIME                DEFAULT NULL,
  phone_verified_at DATETIME                DEFAULT NULL,
  last_login_at     DATETIME                DEFAULT NULL,
  status            ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME                DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_uuid  (uuid),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حسابات العملاء وفريق العمل';

DROP TABLE IF EXISTS refresh_tokens;
CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL COMMENT 'SHA-256 للتوكن — لا نخزّن التوكن نفسه',
  user_agent  VARCHAR(255)            DEFAULT NULL,
  ip_address  VARCHAR(45)             DEFAULT NULL,
  expires_at  DATETIME        NOT NULL,
  revoked_at  DATETIME                DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id, revoked_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='جلسات تجديد التوكن (دوران آمن للتوكنات)';

DROP TABLE IF EXISTS password_resets;
CREATE TABLE password_resets (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64)        NOT NULL,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME                DEFAULT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_hash (token_hash),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رموز استعادة كلمة المرور';

DROP TABLE IF EXISTS email_verifications;
CREATE TABLE email_verifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  email      VARCHAR(160)    NOT NULL COMMENT 'البريد وقت الطلب — يمنع تفعيل بريد تغيّر بعد الإرسال',
  token_hash CHAR(64)        NOT NULL,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME                DEFAULT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_verify_hash (token_hash),
  KEY idx_verify_user (user_id, used_at),
  CONSTRAINT fk_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رموز تفعيل البريد الإلكتروني';

-- ─── 2) الفروع والتغطية الجغرافية ──────────────────────────────────────────

DROP TABLE IF EXISTS branches;
CREATE TABLE branches (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code               VARCHAR(12)     NOT NULL COMMENT 'كود مختصر يظهر في رقم الطلب مثل ZML',
  slug               VARCHAR(80)     NOT NULL,
  name_ar            VARCHAR(120)    NOT NULL,
  name_en            VARCHAR(120)    NOT NULL,
  tagline_ar         VARCHAR(180)            DEFAULT NULL COMMENT 'جملة تعريفية تحريرية للفرع',
  address_ar         VARCHAR(255)    NOT NULL,
  address_en         VARCHAR(255)    NOT NULL,
  city               VARCHAR(80)     NOT NULL,
  governorate        VARCHAR(80)     NOT NULL,
  latitude           DECIMAL(10,7)   NOT NULL,
  longitude          DECIMAL(10,7)   NOT NULL,
  phone              VARCHAR(20)     NOT NULL,
  whatsapp           VARCHAR(20)             DEFAULT NULL,
  email              VARCHAR(160)            DEFAULT NULL,
  opens_at           TIME            NOT NULL DEFAULT '08:00:00',
  closes_at          TIME            NOT NULL DEFAULT '00:00:00',
  is_24h             TINYINT(1)      NOT NULL DEFAULT 0,
  delivery_radius_km DECIMAL(5,2)    NOT NULL DEFAULT 10.00,
  delivery_fee       DECIMAL(12,2)   NOT NULL DEFAULT 25.00,
  free_delivery_over DECIMAL(12,2)   NOT NULL DEFAULT 750.00 COMMENT 'توصيل مجاني فوق هذا المبلغ',
  min_order_amount   DECIMAL(12,2)   NOT NULL DEFAULT 100.00,
  avg_prep_minutes   SMALLINT UNSIGNED NOT NULL DEFAULT 45,
  supports_pickup    TINYINT(1)      NOT NULL DEFAULT 1,
  area_sqm           INT UNSIGNED            DEFAULT NULL,
  opened_year        SMALLINT UNSIGNED       DEFAULT NULL,
  manager_id         BIGINT UNSIGNED         DEFAULT NULL,
  status             ENUM('active','maintenance','closed') NOT NULL DEFAULT 'active',
  created_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         DATETIME                DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_branch_code (code),
  UNIQUE KEY uq_branch_slug (slug),
  KEY idx_branch_geo (latitude, longitude),
  KEY idx_branch_status (status),
  CONSTRAINT fk_branch_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='فروع السوبر ماركت';

ALTER TABLE users
  ADD CONSTRAINT fk_users_branch FOREIGN KEY (default_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

DROP TABLE IF EXISTS branch_hours;
CREATE TABLE branch_hours (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NOT NULL,
  weekday   TINYINT UNSIGNED NOT NULL COMMENT '0=الأحد … 6=السبت',
  open_time TIME            NOT NULL,
  close_time TIME           NOT NULL,
  is_closed TINYINT(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_branch_weekday (branch_id, weekday),
  CONSTRAINT fk_hours_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مواعيد العمل التفصيلية لكل فرع';

DROP TABLE IF EXISTS delivery_zones;
CREATE TABLE delivery_zones (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id    BIGINT UNSIGNED NOT NULL,
  name_ar      VARCHAR(120)    NOT NULL,
  name_en      VARCHAR(120)    NOT NULL,
  delivery_fee DECIMAL(12,2)   NOT NULL DEFAULT 25.00,
  min_order    DECIMAL(12,2)   NOT NULL DEFAULT 100.00,
  eta_minutes  SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  status       ENUM('active','paused') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  KEY idx_zone_branch (branch_id, status),
  CONSTRAINT fk_zone_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مناطق التوصيل ورسومها لكل فرع';

-- ─── 3) الكتالوج: الأقسام والعلامات والمنتجات ─────────────────────────────

DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id    BIGINT UNSIGNED         DEFAULT NULL COMMENT 'شجرة أقسام بمستويين',
  slug         VARCHAR(90)     NOT NULL,
  name_ar      VARCHAR(120)    NOT NULL,
  name_en      VARCHAR(120)    NOT NULL,
  tagline_ar   VARCHAR(180)            DEFAULT NULL,
  description_ar TEXT                  DEFAULT NULL,
  motif        VARCHAR(30)     NOT NULL DEFAULT 'wheat' COMMENT 'مفتاح الزخرفة البصرية للقسم في الواجهة',
  accent_color CHAR(7)         NOT NULL DEFAULT '#C6A15B',
  aisle_code   VARCHAR(10)             DEFAULT NULL COMMENT 'رقم الممر داخل الفرع',
  sort_order   SMALLINT        NOT NULL DEFAULT 0,
  is_featured  TINYINT(1)      NOT NULL DEFAULT 0,
  status       ENUM('active','hidden') NOT NULL DEFAULT 'active',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   DATETIME                DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cat_slug (slug),
  KEY idx_cat_parent (parent_id, sort_order),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أقسام السوبر ماركت';

DROP TABLE IF EXISTS brands;
CREATE TABLE brands (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(90)     NOT NULL,
  name_ar      VARCHAR(120)    NOT NULL,
  name_en      VARCHAR(120)    NOT NULL,
  country      VARCHAR(60)             DEFAULT NULL,
  is_house_label TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'علامة رُمّان الخاصة',
  status       ENUM('active','hidden') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_brand_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='العلامات التجارية للموردين + العلامة الخاصة';

DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku             VARCHAR(40)     NOT NULL,
  slug            VARCHAR(160)    NOT NULL,
  barcode         VARCHAR(32)             DEFAULT NULL,
  category_id     BIGINT UNSIGNED NOT NULL,
  brand_id        BIGINT UNSIGNED         DEFAULT NULL,
  name_ar         VARCHAR(180)    NOT NULL,
  name_en         VARCHAR(180)    NOT NULL,
  short_desc_ar   VARCHAR(255)            DEFAULT NULL COMMENT 'سطر تحريري يظهر تحت الاسم',
  description_ar  TEXT                    DEFAULT NULL,
  unit            ENUM('kg','gram','piece','pack','bundle','liter','ml','dozen') NOT NULL DEFAULT 'piece',
  unit_size       VARCHAR(40)             DEFAULT NULL COMMENT 'مثال: 1 كجم / 500 مل',
  price           DECIMAL(12,2)   NOT NULL,
  compare_at_price DECIMAL(12,2)          DEFAULT NULL COMMENT 'السعر قبل الخصم (للشطب)',
  cost_price      DECIMAL(12,2)           DEFAULT NULL COMMENT 'داخلي — لا يظهر للعميل',
  tax_rate        DECIMAL(5,2)    NOT NULL DEFAULT 0.00
                  COMMENT 'نسبة ضريبة الصنف — تُحدَّد صراحةً لكل منتج، والافتراضي صفر لأن أغلب الغذاء الطازج معفى',
  origin_country  VARCHAR(60)             DEFAULT NULL,
  farm_or_maker   VARCHAR(120)            DEFAULT NULL COMMENT 'المزرعة/المُنتِج — عنصر أساسي في سرد البراند',
  storage_ar      VARCHAR(180)            DEFAULT NULL,
  shelf_life_days SMALLINT UNSIGNED       DEFAULT NULL,
  nutrition       JSON                    DEFAULT NULL COMMENT '{calories, protein, carbs, fat, ...}',
  allergens       JSON                    DEFAULT NULL,
  tags            JSON                    DEFAULT NULL,
  is_organic      TINYINT(1)      NOT NULL DEFAULT 0,
  is_fresh        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'منتج طازج يومي',
  is_exclusive    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'حصري لرُمّان',
  is_featured     TINYINT(1)      NOT NULL DEFAULT 0,
  badge           ENUM('none','new','best_seller','limited','deal') NOT NULL DEFAULT 'none',
  rating_avg      DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  rating_count    INT UNSIGNED    NOT NULL DEFAULT 0,
  sold_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  view_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  max_per_order   SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  status          ENUM('active','draft','archived') NOT NULL DEFAULT 'active',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME                DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_sku  (sku),
  UNIQUE KEY uq_product_slug (slug),
  KEY idx_product_category (category_id, status),
  KEY idx_product_brand (brand_id),
  KEY idx_product_price (price),
  KEY idx_product_featured (is_featured, status),
  FULLTEXT KEY ft_product_search (name_ar, name_en, short_desc_ar, description_ar),
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_product_brand    FOREIGN KEY (brand_id)    REFERENCES brands(id)     ON DELETE SET NULL,
  CONSTRAINT chk_product_price   CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='كتالوج المنتجات';

DROP TABLE IF EXISTS product_images;
CREATE TABLE product_images (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  url        VARCHAR(300)    NOT NULL,
  alt_ar     VARCHAR(180)            DEFAULT NULL,
  sort_order SMALLINT        NOT NULL DEFAULT 0,
  is_primary TINYINT(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_img_product (product_id, sort_order),
  CONSTRAINT fk_img_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='صور المنتجات (اختيارية — الواجهة تولّد لوحة بصرية بديلة)';

-- ─── 4) المخزون لكل فرع ────────────────────────────────────────────────────

DROP TABLE IF EXISTS inventory;
CREATE TABLE inventory (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id           BIGINT UNSIGNED NOT NULL,
  product_id          BIGINT UNSIGNED NOT NULL,
  quantity            INT             NOT NULL DEFAULT 0 COMMENT 'الكمية الفعلية على الرف',
  reserved            INT             NOT NULL DEFAULT 0 COMMENT 'محجوزة لطلبات قيد التنفيذ',
  low_stock_threshold INT             NOT NULL DEFAULT 10,
  aisle               VARCHAR(20)             DEFAULT NULL,
  price_override      DECIMAL(12,2)           DEFAULT NULL COMMENT 'سعر خاص بالفرع إن وُجد',
  restock_at          DATE                    DEFAULT NULL,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory (branch_id, product_id),
  KEY idx_inventory_low (branch_id, quantity),
  CONSTRAINT fk_inv_branch  FOREIGN KEY (branch_id)  REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مخزون كل منتج داخل كل فرع';

DROP TABLE IF EXISTS inventory_movements;
CREATE TABLE inventory_movements (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inventory_id   BIGINT UNSIGNED NOT NULL,
  type           ENUM('restock','sale','reserve','release','adjustment','damage','return') NOT NULL,
  quantity       INT             NOT NULL COMMENT 'موجب = دخول، سالب = خروج',
  balance_after  INT             NOT NULL,
  reference_type VARCHAR(40)             DEFAULT NULL,
  reference_id   BIGINT UNSIGNED         DEFAULT NULL,
  note           VARCHAR(255)            DEFAULT NULL,
  created_by     BIGINT UNSIGNED         DEFAULT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_move_inventory (inventory_id, created_at),
  CONSTRAINT fk_move_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  CONSTRAINT fk_move_user      FOREIGN KEY (created_by)   REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل تدقيق لكل حركة مخزون';

-- ─── 5) العناوين والسلة ────────────────────────────────────────────────────

DROP TABLE IF EXISTS addresses;
CREATE TABLE addresses (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  label          VARCHAR(40)     NOT NULL DEFAULT 'المنزل',
  recipient_name VARCHAR(120)    NOT NULL,
  phone          VARCHAR(20)     NOT NULL,
  governorate    VARCHAR(80)     NOT NULL,
  city           VARCHAR(80)     NOT NULL,
  area           VARCHAR(120)            DEFAULT NULL,
  street         VARCHAR(180)    NOT NULL,
  building       VARCHAR(40)             DEFAULT NULL,
  floor          VARCHAR(20)             DEFAULT NULL,
  apartment      VARCHAR(20)             DEFAULT NULL,
  landmark       VARCHAR(180)            DEFAULT NULL,
  latitude       DECIMAL(10,7)           DEFAULT NULL,
  longitude      DECIMAL(10,7)           DEFAULT NULL,
  is_default     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME                DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_address_user (user_id, is_default),
  CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='دفتر عناوين العميل';

DROP TABLE IF EXISTS carts;
CREATE TABLE carts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED         DEFAULT NULL COMMENT 'NULL = سلة زائر',
  session_token CHAR(36)                DEFAULT NULL,
  branch_id     BIGINT UNSIGNED NOT NULL,
  coupon_code   VARCHAR(40)             DEFAULT NULL,
  status        ENUM('active','converted','abandoned') NOT NULL DEFAULT 'active',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cart_user (user_id, status),
  KEY idx_cart_session (session_token),
  CONSTRAINT fk_cart_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_cart_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سلات التسوق (مستخدم أو زائر)';

DROP TABLE IF EXISTS cart_items;
CREATE TABLE cart_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2)   NOT NULL COMMENT 'لقطة سعر وقت الإضافة',
  note       VARCHAR(180)            DEFAULT NULL COMMENT 'مثال: ناضج/غير ناضج',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_product (cart_id, product_id),
  CONSTRAINT fk_ci_cart    FOREIGN KEY (cart_id)    REFERENCES carts(id)    ON DELETE CASCADE,
  CONSTRAINT fk_ci_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT chk_ci_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أصناف السلة';

-- ─── 6) الكوبونات والعروض ──────────────────────────────────────────────────

DROP TABLE IF EXISTS coupons;
CREATE TABLE coupons (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code             VARCHAR(40)     NOT NULL,
  title_ar         VARCHAR(160)    NOT NULL,
  type             ENUM('percentage','fixed','free_delivery') NOT NULL,
  value            DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  min_order_amount DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  max_discount     DECIMAL(12,2)           DEFAULT NULL COMMENT 'سقف الخصم للنِّسَب المئوية',
  applies_to       ENUM('all','category','product') NOT NULL DEFAULT 'all',
  applies_value    BIGINT UNSIGNED         DEFAULT NULL COMMENT 'id القسم أو المنتج حسب applies_to',
  first_order_only TINYINT(1)      NOT NULL DEFAULT 0,
  usage_limit      INT UNSIGNED            DEFAULT NULL,
  used_count       INT UNSIGNED    NOT NULL DEFAULT 0,
  per_user_limit   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  starts_at        DATETIME        NOT NULL,
  ends_at          DATETIME        NOT NULL,
  status           ENUM('active','paused','expired') NOT NULL DEFAULT 'active',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_code (code),
  KEY idx_coupon_window (status, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أكواد الخصم';

DROP TABLE IF EXISTS promotions;
CREATE TABLE promotions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(90)     NOT NULL,
  title_ar    VARCHAR(160)    NOT NULL,
  subtitle_ar VARCHAR(255)            DEFAULT NULL,
  kind        ENUM('hero','strip','category_spotlight','flash') NOT NULL DEFAULT 'strip',
  category_id BIGINT UNSIGNED         DEFAULT NULL,
  cta_label   VARCHAR(60)             DEFAULT NULL,
  cta_href    VARCHAR(160)            DEFAULT NULL,
  accent      CHAR(7)         NOT NULL DEFAULT '#C6A15B',
  starts_at   DATETIME        NOT NULL,
  ends_at     DATETIME        NOT NULL,
  sort_order  SMALLINT        NOT NULL DEFAULT 0,
  status      ENUM('active','hidden') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_promo_slug (slug),
  CONSTRAINT fk_promo_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مساحات تحريرية/عروض على الصفحة الرئيسية';

-- ─── 7) الطلبات والمدفوعات ─────────────────────────────────────────────────

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number     VARCHAR(24)     NOT NULL COMMENT 'مثال: RMN-ZML-250911-0042',
  user_id          BIGINT UNSIGNED NOT NULL,
  branch_id        BIGINT UNSIGNED NOT NULL,
  address_id       BIGINT UNSIGNED         DEFAULT NULL,
  fulfillment_type ENUM('delivery','pickup') NOT NULL DEFAULT 'delivery',
  status           ENUM('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled','refunded')
                   NOT NULL DEFAULT 'pending',
  payment_method   ENUM('cod','instapay','fawry','wallet') NOT NULL DEFAULT 'cod'
                   COMMENT 'cod=عند الاستلام · instapay=تحويل يراجعه الفريق · fawry=كود فوري · wallet=رصيد المحفظة',
  payment_status   ENUM('unpaid','awaiting_payment','under_review','paid','failed','refunded')
                   NOT NULL DEFAULT 'unpaid'
                   COMMENT 'awaiting_payment=بانتظار دفع العميل · under_review=إيصال مرفوع ينتظر اعتماد الفريق',
  subtotal         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  discount_total   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  delivery_fee     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  tax_total        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  points_redeemed  INT UNSIGNED    NOT NULL DEFAULT 0,
  points_value     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  grand_total      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  points_earned    INT UNSIGNED    NOT NULL DEFAULT 0,
  coupon_code      VARCHAR(40)             DEFAULT NULL,
  slot_date        DATE                    DEFAULT NULL,
  slot_from        TIME                    DEFAULT NULL,
  slot_to          TIME                    DEFAULT NULL,
  customer_note    VARCHAR(255)            DEFAULT NULL,
  cancel_reason    VARCHAR(255)            DEFAULT NULL,
  rating           TINYINT UNSIGNED        DEFAULT NULL COMMENT 'تقييم تجربة التوصيل 1..5',
  placed_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at     DATETIME                DEFAULT NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_number (order_number),
  KEY idx_order_user (user_id, placed_at),
  KEY idx_order_branch_status (branch_id, status),
  KEY idx_order_status_date (status, placed_at),
  CONSTRAINT fk_order_user    FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE RESTRICT,
  CONSTRAINT fk_order_branch  FOREIGN KEY (branch_id)  REFERENCES branches(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_order_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رأس الطلب';

DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED         DEFAULT NULL COMMENT 'قد يُحذف المنتج لاحقًا — نحتفظ باللقطة',
  name_snapshot VARCHAR(180)    NOT NULL,
  unit_snapshot VARCHAR(40)             DEFAULT NULL,
  sku_snapshot  VARCHAR(40)             DEFAULT NULL,
  unit_price    DECIMAL(12,2)   NOT NULL,
  quantity      SMALLINT UNSIGNED NOT NULL,
  fulfilled_qty SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'ما تم تجهيزه فعليًا (منتجات وزنية قد تختلف)',
  line_total    DECIMAL(12,2)   NOT NULL,
  PRIMARY KEY (id),
  KEY idx_oi_order (order_id),
  KEY idx_oi_product (product_id),
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أصناف الطلب (لقطة ثابتة)';

DROP TABLE IF EXISTS order_status_history;
CREATE TABLE order_status_history (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   BIGINT UNSIGNED NOT NULL,
  status     VARCHAR(30)     NOT NULL,
  note       VARCHAR(255)            DEFAULT NULL,
  changed_by BIGINT UNSIGNED         DEFAULT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osh_order (order_id, created_at),
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_osh_user  FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الخط الزمني لحالة الطلب';

DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id         BIGINT UNSIGNED NOT NULL,
  provider         ENUM('cod','instapay','fawry','wallet') NOT NULL,
  amount           DECIMAL(12,2)   NOT NULL,
  status           ENUM('pending','awaiting_proof','under_review','succeeded','failed','refunded','expired')
                   NOT NULL DEFAULT 'pending',
  transaction_ref  VARCHAR(120)            DEFAULT NULL COMMENT 'مرجع المزوّد أو رقم تحويل إنستاباي',

  -- فوري: كود الدفع الذي يُملى على منفذ الخدمة
  fawry_reference  VARCHAR(40)             DEFAULT NULL,
  expires_at       DATETIME                DEFAULT NULL COMMENT 'انتهاء صلاحية كود الدفع',

  -- إنستاباي: إيصال يرفعه العميل ويعتمده الفريق
  proof_url        VARCHAR(300)            DEFAULT NULL COMMENT 'صورة إيصال التحويل',
  proof_uploaded_at DATETIME               DEFAULT NULL,
  sender_name      VARCHAR(120)            DEFAULT NULL COMMENT 'اسم المحوِّل كما كتبه العميل',
  reviewed_by      BIGINT UNSIGNED         DEFAULT NULL,
  reviewed_at      DATETIME                DEFAULT NULL,
  review_note      VARCHAR(255)            DEFAULT NULL COMMENT 'سبب الرفض إن رُفض',

  raw_response     JSON                    DEFAULT NULL COMMENT 'استجابة المزوّد كاملة للتدقيق',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pay_fawry_ref (fawry_reference),
  KEY idx_pay_order (order_id),
  KEY idx_pay_review (status, created_at) COMMENT 'طابور مراجعة التحويلات في لوحة الإدارة',
  CONSTRAINT fk_pay_order    FOREIGN KEY (order_id)    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='عمليات الدفع وسجلّ مراجعتها';

-- سجلّ استدعاءات بوابات الدفع الواردة (webhooks).
-- نخزّن كل استدعاء قبل معالجته: يمنع التكرار عند إعادة الإرسال،
-- ويعطينا أثرًا كاملًا عند أي خلاف مع المزوّد.
DROP TABLE IF EXISTS payment_webhooks;
CREATE TABLE payment_webhooks (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider      VARCHAR(30)     NOT NULL,
  event_id      VARCHAR(120)            DEFAULT NULL COMMENT 'معرّف الحدث لدى المزوّد — يمنع المعالجة المكرّرة',
  reference     VARCHAR(120)            DEFAULT NULL,
  signature_ok  TINYINT(1)      NOT NULL DEFAULT 0,
  processed     TINYINT(1)      NOT NULL DEFAULT 0,
  error         VARCHAR(255)            DEFAULT NULL,
  payload       JSON            NOT NULL,
  received_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webhook_event (provider, event_id),
  KEY idx_webhook_ref (provider, reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أرشيف استدعاءات بوابات الدفع';

DROP TABLE IF EXISTS coupon_redemptions;
CREATE TABLE coupon_redemptions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id       BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  order_id        BIGINT UNSIGNED NOT NULL,
  discount_amount DECIMAL(12,2)   NOT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_redeem_user (coupon_id, user_id),
  CONSTRAINT fk_redeem_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_redeem_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_redeem_order  FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل استخدام الكوبونات';

-- ─── 8) التقييمات والمفضلة والتصفح ────────────────────────────────────────

DROP TABLE IF EXISTS reviews;
CREATE TABLE reviews (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id    BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  order_id      BIGINT UNSIGNED         DEFAULT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  title         VARCHAR(140)            DEFAULT NULL,
  body          TEXT                    DEFAULT NULL,
  is_verified   TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'شراء موثّق',
  helpful_count INT UNSIGNED    NOT NULL DEFAULT 0,
  status        ENUM('published','pending','rejected') NOT NULL DEFAULT 'published',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_user_product (product_id, user_id),
  KEY idx_review_product (product_id, status, created_at),
  CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_review_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE SET NULL,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقييمات المنتجات';

DROP TABLE IF EXISTS review_votes;
CREATE TABLE review_votes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  review_id  BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vote (review_id, user_id),
  CONSTRAINT fk_vote_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_vote_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تصويت «مفيد» على التقييمات';

DROP TABLE IF EXISTS wishlists;
CREATE TABLE wishlists (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist (user_id, product_id),
  CONSTRAINT fk_wish_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_wish_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قائمة الأمنيات';

DROP TABLE IF EXISTS product_views;
CREATE TABLE product_views (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED         DEFAULT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  viewed_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_view_user (user_id, viewed_at),
  CONSTRAINT fk_pv_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='آخر ما شاهده العميل (للتوصيات)';

DROP TABLE IF EXISTS search_logs;
CREATE TABLE search_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED         DEFAULT NULL,
  term        VARCHAR(160)    NOT NULL,
  results_count INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_search_term (term),
  CONSTRAINT fk_search_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل عمليات البحث (لعرض الأكثر بحثًا)';

-- ─── 9) الولاء والمحفظة والإشعارات ────────────────────────────────────────

DROP TABLE IF EXISTS loyalty_transactions;
CREATE TABLE loyalty_transactions (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  order_id   BIGINT UNSIGNED         DEFAULT NULL,
  type       ENUM('earn','redeem','bonus','expire','adjust') NOT NULL,
  points     INT             NOT NULL COMMENT 'موجب = إضافة، سالب = خصم',
  balance_after INT UNSIGNED NOT NULL,
  note       VARCHAR(180)            DEFAULT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_loy_user (user_id, created_at),
  CONSTRAINT fk_loy_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_loy_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حركات نقاط الولاء';

DROP TABLE IF EXISTS wallet_transactions;
CREATE TABLE wallet_transactions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  type          ENUM('credit','debit') NOT NULL,
  amount        DECIMAL(12,2)   NOT NULL,
  balance_after DECIMAL(12,2)   NOT NULL,
  reason        VARCHAR(180)    NOT NULL,
  reference     VARCHAR(80)             DEFAULT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wallet_user (user_id, created_at),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حركات المحفظة (استرداد/رصيد)';

DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       ENUM('order','promo','stock','system','loyalty') NOT NULL DEFAULT 'system',
  title      VARCHAR(160)    NOT NULL,
  body       VARCHAR(400)            DEFAULT NULL,
  link       VARCHAR(200)            DEFAULT NULL,
  read_at    DATETIME                DEFAULT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, read_at, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إشعارات داخل التطبيق';

-- ─── 10) خدمة العملاء والإعدادات والتدقيق ─────────────────────────────────

DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED         DEFAULT NULL,
  name       VARCHAR(120)    NOT NULL,
  email      VARCHAR(160)    NOT NULL,
  phone      VARCHAR(20)             DEFAULT NULL,
  subject    VARCHAR(160)    NOT NULL,
  message    TEXT            NOT NULL,
  status     ENUM('new','in_progress','resolved') NOT NULL DEFAULT 'new',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_status (status, created_at),
  CONSTRAINT fk_contact_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رسائل «اتصل بنا»';

DROP TABLE IF EXISTS newsletter_subscribers;
CREATE TABLE newsletter_subscribers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(160)    NOT NULL,
  status        ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
  source        VARCHAR(60)             DEFAULT 'footer',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مشتركو النشرة البريدية';

DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
  `key`      VARCHAR(80)  NOT NULL,
  `value`    TEXT         NOT NULL,
  `group`    VARCHAR(40)  NOT NULL DEFAULT 'general',
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إعدادات المنصة (نسبة النقاط، الضريبة، ...)';

DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id   BIGINT UNSIGNED         DEFAULT NULL,
  action     VARCHAR(80)     NOT NULL,
  entity     VARCHAR(60)     NOT NULL,
  entity_id  BIGINT UNSIGNED         DEFAULT NULL,
  meta       JSON                    DEFAULT NULL,
  ip_address VARCHAR(45)             DEFAULT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_entity (entity, entity_id),
  KEY idx_audit_actor (actor_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل تدقيق لعمليات الإدارة الحسّاسة';

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════════════════════
--  العروض (Views) — تبسّط الاستعلامات المتكرّرة في طبقة التطبيق
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_product_stock AS
SELECT
  p.id                                   AS product_id,
  i.branch_id                            AS branch_id,
  GREATEST(i.quantity - i.reserved, 0)   AS available,
  (i.quantity - i.reserved) <= i.low_stock_threshold AS is_low_stock,
  COALESCE(i.price_override, p.price)     AS effective_price
FROM products p
JOIN inventory i ON i.product_id = p.id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_branch_sales AS
SELECT
  o.branch_id,
  DATE(o.placed_at)      AS day,
  COUNT(*)               AS orders_count,
  SUM(o.grand_total)     AS revenue,
  AVG(o.grand_total)     AS avg_order_value
FROM orders o
WHERE o.status NOT IN ('cancelled','refunded')
GROUP BY o.branch_id, DATE(o.placed_at);

-- ═══════════════════════════════════════════════════════════════════════════
--  المحفّزات (Triggers) — تحديث متوسط التقييم تلقائيًا عند أي تغيير
-- ═══════════════════════════════════════════════════════════════════════════

DELIMITER //

DROP TRIGGER IF EXISTS trg_reviews_after_insert //
CREATE TRIGGER trg_reviews_after_insert AFTER INSERT ON reviews FOR EACH ROW
BEGIN
  UPDATE products p SET
    p.rating_avg = (SELECT ROUND(AVG(r.rating),2) FROM reviews r WHERE r.product_id = NEW.product_id AND r.status='published'),
    p.rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = NEW.product_id AND r.status='published')
  WHERE p.id = NEW.product_id;
END //

DROP TRIGGER IF EXISTS trg_reviews_after_update //
CREATE TRIGGER trg_reviews_after_update AFTER UPDATE ON reviews FOR EACH ROW
BEGIN
  UPDATE products p SET
    p.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating),2) FROM reviews r WHERE r.product_id = NEW.product_id AND r.status='published'),0),
    p.rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = NEW.product_id AND r.status='published')
  WHERE p.id = NEW.product_id;
END //

DROP TRIGGER IF EXISTS trg_reviews_after_delete //
CREATE TRIGGER trg_reviews_after_delete AFTER DELETE ON reviews FOR EACH ROW
BEGIN
  UPDATE products p SET
    p.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating),2) FROM reviews r WHERE r.product_id = OLD.product_id AND r.status='published'),0),
    p.rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = OLD.product_id AND r.status='published')
  WHERE p.id = OLD.product_id;
END //

DELIMITER ;
