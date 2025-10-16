-- Add screensaver_mode column to screensaver_config table
ALTER TABLE screensaver_config 
ADD COLUMN IF NOT EXISTS screensaver_mode text NOT NULL DEFAULT 'media';

-- Add check constraint to validate the mode
ALTER TABLE screensaver_config
ADD CONSTRAINT screensaver_mode_check 
CHECK (screensaver_mode IN ('media', 'transitions'));