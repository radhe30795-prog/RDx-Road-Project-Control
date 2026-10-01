CREATE TABLE `material_variances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`varianceNo` varchar(70) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`boqItemId` int NOT NULL,
	`materialId` int NOT NULL,
	`periodFrom` varchar(20) NOT NULL,
	`periodTo` varchar(20) NOT NULL,
	`theoreticalQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`actualQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`varianceQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`variancePercent` decimal(8,2) NOT NULL DEFAULT '0.00',
	`status` enum('Within Limit','Watch','Excess','Short Consumption') NOT NULL DEFAULT 'Within Limit',
	`reason` varchar(255),
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_variances_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_variances_varianceNo_unique` UNIQUE(`varianceNo`)
);
--> statement-breakpoint
CREATE TABLE `measurement_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mbNo` varchar(70) NOT NULL,
	`mbDate` varchar(20) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`boqItemId` int NOT NULL,
	`activityId` int,
	`locationFrom` varchar(80) NOT NULL,
	`locationTo` varchar(80) NOT NULL,
	`length` decimal(12,3) NOT NULL DEFAULT '0.000',
	`width` decimal(12,3) NOT NULL DEFAULT '0.000',
	`depth` decimal(12,3) NOT NULL DEFAULT '0.000',
	`calculatedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`unit` varchar(30) NOT NULL,
	`rate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`amount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`status` enum('Draft','Submitted','Checked','Approved','Rejected') NOT NULL DEFAULT 'Draft',
	`submittedBy` varchar(120),
	`checkedBy` varchar(120),
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `measurement_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `measurement_entries_mbNo_unique` UNIQUE(`mbNo`)
);
--> statement-breakpoint
CREATE TABLE `ra_bill_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`billId` int NOT NULL,
	`measurementId` int,
	`boqItemId` int NOT NULL,
	`description` text NOT NULL,
	`unit` varchar(30) NOT NULL,
	`previousQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`currentQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`cumulativeQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`rate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`amount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ra_bill_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `billing` ADD `periodFrom` varchar(20);--> statement-breakpoint
ALTER TABLE `billing` ADD `periodTo` varchar(20);--> statement-breakpoint
ALTER TABLE `billing` ADD `grossAmount` decimal(16,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `billing` ADD `gstAmount` decimal(16,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `billing` ADD `retentionAmount` decimal(16,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `billing` ADD `netPayable` decimal(16,2) DEFAULT '0.00';