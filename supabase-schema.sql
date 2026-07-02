-- ═══════════════════════════════════════════════════════════════════════════════
-- VerisVisuals — Supabase Database Schema
-- Photography portfolio for Salim Shaikh, Mumbai, India
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this entire script in the Supabase SQL Editor.
-- Tables are created in dependency order.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE project_type AS ENUM (
  'commercial',
  'wedding',
  'portrait',
  'editorial',
  'product',
  'other'
);

CREATE TYPE inquiry_status AS ENUM (
  'new',
  'read',
  'replied',
  'archived'
);

CREATE TYPE gallery_span AS ENUM (
  'full',
  'half'
);


-- ─── 2. GALLERY CATEGORIES ─────────────────────────────────────────────────────

CREATE TABLE gallery_categories (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  subtitle    TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE gallery_categories IS 'Portfolio gallery categories (Commercial, Weddings, etc.)';


-- ─── 3. GALLERY WORKS ─────────────────────────────────────────────────────────

CREATE TABLE gallery_works (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id     TEXT NOT NULL REFERENCES gallery_categories(id) ON DELETE CASCADE,
  src             TEXT NOT NULL,
  alt             TEXT NOT NULL,
  span            gallery_span NOT NULL DEFAULT 'half',
  sort_order      INT NOT NULL DEFAULT 0,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE gallery_works IS 'Individual gallery images with their category and layout info';

CREATE INDEX idx_gallery_works_category ON gallery_works(category_id);
CREATE INDEX idx_gallery_works_featured ON gallery_works(is_featured) WHERE is_featured = true;


-- ─── 4. COMMISSION INQUIRIES ──────────────────────────────────────────────────

CREATE TABLE commission_inquiries (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  project_type    project_type NOT NULL,
  message         TEXT,
  status          inquiry_status NOT NULL DEFAULT 'new',
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE commission_inquiries IS 'Client commission/contact form submissions';

CREATE INDEX idx_inquiries_status ON commission_inquiries(status);
CREATE INDEX idx_inquiries_created ON commission_inquiries(created_at DESC);
CREATE INDEX idx_inquiries_email ON commission_inquiries(email);

-- Email validation check
ALTER TABLE commission_inquiries
  ADD CONSTRAINT inquiries_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');


-- ─── 5. SITE ANALYTICS (optional) ─────────────────────────────────────────────

CREATE TABLE site_visits (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  TEXT,
  path        TEXT,
  referrer    TEXT,
  country     TEXT,
  device      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE site_visits IS 'Optional page visit tracking';

CREATE INDEX idx_visits_created ON site_visits(created_at DESC);
CREATE INDEX idx_visits_path ON site_visits(path);


-- ─── 6. NEWSLETTER SUBSCRIBERS (optional) ─────────────────────────────────────

CREATE TABLE newsletter_subscribers (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT NOT NULL UNIQUE,
  source      TEXT DEFAULT 'website',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

COMMENT ON TABLE newsletter_subscribers IS 'Optional newsletter/email list';

CREATE INDEX idx_subscribers_active ON newsletter_subscribers(is_active) WHERE is_active = true;


-- ─── 7. SEED DATA ──────────────────────────────────────────────────────────────

-- Gallery categories (matching frontend GALLERY_CATEGORIES)
INSERT INTO gallery_categories (id, label, subtitle, sort_order) VALUES
  ('commercial', 'Commercial', 'Product & Brand Photography', 1),
  ('weddings',   'Weddings',   'Portrait & Ceremony',        2);

-- Gallery works — Commercial (5 images)
INSERT INTO gallery_works (category_id, src, alt, span, sort_order) VALUES
  ('commercial', '/gallery/CH_F0033.jpg',
   'White JRL grooming tools arranged on a minimalist gray pedestal',
   'full', 1),
  ('commercial', '/gallery/CH_F0045.jpg',
   'JRL clippers and shaver on a white pedestal, soft gray background',
   'half', 2),
  ('commercial', '/gallery/CH_F0045-1.png',
   'JRL grooming tools on light gray pedestal, warm beige background',
   'half', 3),
  ('commercial', '/gallery/CH_F5208.jpg',
   'Two black JRL hair clippers on a matte black background',
   'half', 4),
  ('commercial', '/gallery/CH_F6290.jpg',
   'Two sleek black hair dryers against a dark gradient background',
   'half', 5);

-- Gallery works — Weddings (8 images)
INSERT INTO gallery_works (category_id, src, alt, span, sort_order) VALUES
  ('weddings', '/gallery/104A0939.jpg',
   'Newlywed couple in traditional Indian attire embracing outdoors in soft golden light',
   'full', 1),
  ('weddings', '/gallery/104A0949.jpg',
   'Wedding couple standing together in a sunlit open field with flowing veil',
   'half', 2),
  ('weddings', '/gallery/104A0968.jpg',
   'Bride in red lehenga walking through a golden field at sunset',
   'half', 3),
  ('weddings', '/gallery/104A0990.jpg',
   'Groom adjusting his sherwani in a mirror, indoor warm lighting',
   'half', 4),
  ('weddings', '/gallery/104A1003.jpg',
   'Close-up of bride hands with intricate mehndi and wedding bangles',
   'full', 5),
  ('weddings', '/gallery/104A1021.jpg',
   'Wedding ceremony couple exchanging garlands under floral mandap',
   'half', 6),
  ('weddings', '/gallery/104A1044.jpg',
   'Bridal portrait with soft backlighting and decorative elements',
   'half', 7),
  ('weddings', '/gallery/104A1060.jpg',
   'Couple departing in decorated car, guests throwing flower petals',
   'half', 8);


-- ─── 8. ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE gallery_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_works          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_inquiries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Gallery: public read, admin write
CREATE POLICY "Gallery categories are publicly readable"
  ON gallery_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Gallery works are publicly readable"
  ON gallery_works FOR SELECT
  TO anon, authenticated
  USING (true);

-- Commission: anyone can insert (anon), only admin can read/update
CREATE POLICY "Anyone can submit a commission inquiry"
  ON commission_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can read all inquiries"
  ON commission_inquiries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can update inquiry status"
  ON commission_inquiries FOR UPDATE
  TO authenticated
  USING (true);

-- Site visits: anyone can insert
CREATE POLICY "Anyone can log a site visit"
  ON site_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Newsletter: anyone can subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


-- ─── 9. HELPER FUNCTIONS ──────────────────────────────────────────────────────

-- Auto-update updated_at timestamp on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gallery_categories_updated
  BEFORE UPDATE ON gallery_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_gallery_works_updated
  BEFORE UPDATE ON gallery_works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_commission_inquiries_updated
  BEFORE UPDATE ON commission_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── 10. VIEWS (useful for dashboards) ────────────────────────────────────────

-- Inquiry counts by project type
CREATE VIEW v_inquiry_stats AS
SELECT
  project_type,
  status,
  COUNT(*) AS count
FROM commission_inquiries
GROUP BY project_type, status
ORDER BY project_type, status;

-- Recent inquiries (last 30 days)
CREATE VIEW v_recent_inquiries AS
SELECT
  id,
  name,
  email,
  project_type,
  status,
  created_at
FROM commission_inquiries
WHERE created_at > now() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Gallery works count per category
CREATE VIEW v_gallery_stats AS
SELECT
  gc.id AS category_id,
  gc.label AS category_label,
  COUNT(gw.id) AS work_count
FROM gallery_categories gc
LEFT JOIN gallery_works gw ON gw.category_id = gc.id
WHERE gc.is_active = true
GROUP BY gc.id, gc.label
ORDER BY gc.sort_order;