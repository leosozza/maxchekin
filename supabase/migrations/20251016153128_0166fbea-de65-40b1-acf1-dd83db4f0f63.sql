-- Add display_mode column to media table
ALTER TABLE media 
ADD COLUMN display_mode text NOT NULL DEFAULT 'slideshow'
CHECK (display_mode IN ('slideshow', 'fullscreen-video'));

-- Add comment for documentation
COMMENT ON COLUMN media.display_mode IS 'Display mode: slideshow (with transitions) or fullscreen-video (loop without transitions)';