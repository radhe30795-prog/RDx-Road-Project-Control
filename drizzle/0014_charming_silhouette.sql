CREATE TABLE `hr_group_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int,
	`groupName` varchar(160) NOT NULL,
	`contractorName` varchar(180),
	`periodFrom` varchar(20) NOT NULL,
	`periodTo` varchar(20) NOT NULL,
	`labourCount` int NOT NULL DEFAULT 0,
	`manDays` decimal(10,2) NOT NULL DEFAULT '0.00',
	`ratePerDay` decimal(12,2) NOT NULL DEFAULT '0.00',
	`grossAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`advanceDeduction` decimal(14,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`status` enum('Draft','Submitted','Approved','Paid','Rejected') NOT NULL DEFAULT 'Draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`remarks` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_group_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_payout_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payrollRunId` int NOT NULL,
	`batchReference` varchar(80) NOT NULL,
	`status` enum('Draft','Exported','Submitted','Paid','Cancelled') NOT NULL DEFAULT 'Draft',
	`employeeCount` int NOT NULL DEFAULT 0,
	`totalAmount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`exportedAt` timestamp,
	`submittedAt` timestamp,
	`paidAt` timestamp,
	`createdBy` int,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_payout_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_payout_batches_batchReference_unique` UNIQUE(`batchReference`)
);
--> statement-breakpoint
CREATE TABLE `hr_payout_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payoutBatchId` int NOT NULL,
	`payrollLineId` int NOT NULL,
	`employeeId` int NOT NULL,
	`beneficiaryName` varchar(180) NOT NULL,
	`bankName` varchar(150),
	`accountLast4` varchar(4),
	`ifscCode` varchar(20),
	`amount` decimal(14,2) NOT NULL,
	`transferReference` varchar(100),
	`status` enum('Ready','Submitted','Paid','Failed') NOT NULL DEFAULT 'Ready',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_payout_lines_id` PRIMARY KEY(`id`)
);
