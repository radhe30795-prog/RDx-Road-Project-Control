-- Add completed quantity tracking to structures for auto activity progress
ALTER TABLE `road_structures` ADD COLUMN IF NOT EXISTS `completedQuantity` decimal(14,3) DEFAULT '0.000' NOT NULL;
