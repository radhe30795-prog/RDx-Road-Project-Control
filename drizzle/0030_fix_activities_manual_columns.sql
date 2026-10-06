-- Fix: ensure activities manual-lock columns exist (idempotent re-apply of 0027)
-- Uses IF NOT EXISTS so it's safe if 0027 partially ran.
ALTER TABLE `activities` ADD COLUMN IF NOT EXISTS `isManual` boolean DEFAULT FALSE NOT NULL;
ALTER TABLE `activities` ADD COLUMN IF NOT EXISTS `manualNote` text;
