CREATE TABLE `machinery_compliance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`projectId` int NOT NULL,
	`docType` enum('Registration','PUC','Road Tax','Insurance','Fitness','Permit','Service','Other') NOT NULL,
	`docNumber` varchar(100),
	`issueDate` varchar(20),
	`expiryDate` varchar(20) NOT NULL,
	`amount` decimal(14,2) DEFAULT '0.00',
	`vendor` varchar(255),
	`meterReading` decimal(12,2),
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machinery_compliance_id` PRIMARY KEY(`id`)
);
