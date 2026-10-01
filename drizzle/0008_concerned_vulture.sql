ALTER TABLE `daily_progress` ADD `sectionType` enum('Highway Works','Concrete Works','Material','Machine') DEFAULT 'Highway Works' NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `chainageFrom` varchar(50);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `chainageTo` varchar(50);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `billableQuantity` decimal(12,2);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `billingStatus` enum('Pending','Ready for Bill','Included in Bill') DEFAULT 'Pending' NOT NULL;