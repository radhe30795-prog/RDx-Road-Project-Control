CREATE TABLE `boq_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemCode` varchar(60) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int,
	`chapter` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`unit` varchar(30) NOT NULL,
	`contractQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`revisedQuantity` decimal(14,3),
	`executedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`balanceQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`rate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`contractAmount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`status` enum('Active','Closed','Variation') NOT NULL DEFAULT 'Active',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boq_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `boq_items_itemCode_unique` UNIQUE(`itemCode`)
);
--> statement-breakpoint
CREATE TABLE `grn_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grnNo` varchar(60) NOT NULL,
	`grnDate` varchar(20) NOT NULL,
	`projectId` int NOT NULL,
	`materialId` int NOT NULL,
	`supplier` varchar(255) NOT NULL,
	`challanNo` varchar(100),
	`receivedQuantity` decimal(14,3) NOT NULL,
	`acceptedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`rejectedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`unit` varchar(30) NOT NULL,
	`rate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`totalAmount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`inspectionStatus` enum('Pending','Accepted','Partially Accepted','Rejected') NOT NULL DEFAULT 'Pending',
	`invoiceReference` varchar(100),
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grn_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `grn_entries_grnNo_unique` UNIQUE(`grnNo`)
);
--> statement-breakpoint
CREATE TABLE `material_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialCode` varchar(60) NOT NULL,
	`projectId` int NOT NULL,
	`materialName` varchar(255) NOT NULL,
	`unit` varchar(30) NOT NULL,
	`minStock` decimal(14,3) NOT NULL DEFAULT '0.000',
	`maxStock` decimal(14,3) NOT NULL DEFAULT '0.000',
	`openingStock` decimal(14,3) NOT NULL DEFAULT '0.000',
	`receivedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`issuedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`returnedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`wastageQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`balanceQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`averageRate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`supplier` varchar(255),
	`storageLocation` varchar(255),
	`approvalStatus` enum('Pending','Approved','Rejected','Blocked') NOT NULL DEFAULT 'Pending',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_inventory_materialCode_unique` UNIQUE(`materialCode`)
);
--> statement-breakpoint
CREATE TABLE `material_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueNo` varchar(70) NOT NULL,
	`issueDate` varchar(20) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`materialId` int NOT NULL,
	`dailyProgressId` int,
	`boqItemId` int,
	`quantity` decimal(14,3) NOT NULL,
	`unit` varchar(30) NOT NULL,
	`purpose` varchar(255) NOT NULL,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_issues_issueNo_unique` UNIQUE(`issueNo`)
);
--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `boqItemId` int;--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialId` int;--> statement-breakpoint
ALTER TABLE `daily_progress` ADD `materialConsumedQuantity` decimal(12,3);