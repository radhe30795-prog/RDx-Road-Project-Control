ALTER TABLE `activities` ADD COLUMN `isManual` boolean DEFAULT FALSE NOT NULL;
ALTER TABLE `activities` ADD COLUMN `manualNote` text;
