ALTER TABLE `daily_progress` MODIFY COLUMN `activityId` int;--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialOpeningBalance` decimal(12,3);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialReceivedQuantity` decimal(12,3);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialChallanNo` varchar(100);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialSupplier` varchar(255);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialWastageQuantity` decimal(12,3);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialStorageLocation` varchar(255);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `machineryAssetId` int;--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `machineWorkingHours` decimal(10,2);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `machineIdleHours` decimal(10,2);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `machineIdleReason` varchar(255);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `hourMeterOpening` decimal(12,2);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `hourMeterClosing` decimal(12,2);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `fuelConsumed` decimal(12,2);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `machineStatus` enum('Working','Breakdown','Maintenance','Idle') DEFAULT 'Working';--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `machineOperator` varchar(150);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `machineLocation` varchar(255);