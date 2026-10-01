CREATE TABLE `approval_signoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` varchar(80) NOT NULL,
	`stage` varchar(100) NOT NULL,
	`requestedBy` varchar(150) NOT NULL,
	`assignedRole` varchar(80) NOT NULL,
	`signedBy` varchar(150),
	`status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
	`comments` text,
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_signoffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machinery_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetNo` varchar(70) NOT NULL,
	`projectId` int NOT NULL,
	`assetType` varchar(100) NOT NULL,
	`makeModel` varchar(150),
	`registrationNo` varchar(60),
	`currentRoadId` int,
	`openingHourMeter` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currentHourMeter` decimal(12,2) NOT NULL DEFAULT '0.00',
	`expectedFuelPerHour` decimal(10,2) NOT NULL DEFAULT '0.00',
	`status` enum('Available','Deployed','Maintenance','Standby','Retired') NOT NULL DEFAULT 'Available',
	`operator` varchar(150),
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machinery_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `machinery_assets_assetNo_unique` UNIQUE(`assetNo`)
);
--> statement-breakpoint
CREATE TABLE `machinery_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`logNo` varchar(70) NOT NULL,
	`logDate` varchar(20) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`assetId` int NOT NULL,
	`openingHourMeter` decimal(12,2) NOT NULL DEFAULT '0.00',
	`closingHourMeter` decimal(12,2) NOT NULL DEFAULT '0.00',
	`workHours` decimal(10,2) NOT NULL DEFAULT '0.00',
	`fuelIssued` decimal(12,2) NOT NULL DEFAULT '0.00',
	`fuelRate` decimal(10,2) NOT NULL DEFAULT '0.00',
	`fuelAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`fuelEfficiency` decimal(10,2) NOT NULL DEFAULT '0.00',
	`operator` varchar(150),
	`workDescription` text,
	`utilizationStatus` enum('Efficient','Watch','High Consumption','Idle') NOT NULL DEFAULT 'Efficient',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machinery_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `machinery_logs_logNo_unique` UNIQUE(`logNo`)
);
--> statement-breakpoint
CREATE TABLE `subcontractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subcontractorCode` varchar(60) NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`workCategory` varchar(120) NOT NULL,
	`contactPerson` varchar(150),
	`phone` varchar(40),
	`gstin` varchar(30),
	`status` enum('Active','On Hold','Closed') NOT NULL DEFAULT 'Active',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subcontractors_id` PRIMARY KEY(`id`),
	CONSTRAINT `subcontractors_subcontractorCode_unique` UNIQUE(`subcontractorCode`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderNo` varchar(70) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`subcontractorId` int NOT NULL,
	`scope` text NOT NULL,
	`unit` varchar(30) NOT NULL,
	`awardedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`executedQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`rate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`awardedAmount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`paidAmount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`retentionAmount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`startDate` varchar(20) NOT NULL,
	`targetDate` varchar(20) NOT NULL,
	`status` enum('Draft','Issued','In Progress','Completed','Closed','On Hold') NOT NULL DEFAULT 'Draft',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `work_orders_workOrderNo_unique` UNIQUE(`workOrderNo`)
);
