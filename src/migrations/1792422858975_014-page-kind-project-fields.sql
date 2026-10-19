-- Up Migration
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_kind VARCHAR(20) DEFAULT 'reference';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS desired_outcome TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS current_state TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS review_date DATE;

CREATE INDEX IF NOT EXISTS idx_pages_page_kind ON pages(page_kind);
CREATE INDEX IF NOT EXISTS idx_pages_review_date ON pages(review_date);

-- Down Migration
DROP INDEX IF EXISTS idx_pages_page_kind;
DROP INDEX IF EXISTS idx_pages_review_date;
ALTER TABLE pages DROP COLUMN IF EXISTS page_kind;
ALTER TABLE pages DROP COLUMN IF EXISTS desired_outcome;
ALTER TABLE pages DROP COLUMN IF EXISTS current_state;
ALTER TABLE pages DROP COLUMN IF EXISTS review_date;
