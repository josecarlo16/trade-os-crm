ALTER TABLE gallery_images 
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_id TEXT;

CREATE UNIQUE INDEX idx_gallery_source ON gallery_images(source, source_id) 
  WHERE source IS NOT NULL AND source_id IS NOT NULL;