CREATE TABLE `rate_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`analysisNo` varchar(50) NOT NULL,
	`description` text,
	`unit` varchar(30) DEFAULT 'Cum',
	`sorRef` varchar(100),
	`leadKm` decimal(8,2) DEFAULT '0.00',
	`overheadPct` decimal(5,2) DEFAULT '0.00',
	`profitPct` decimal(5,2) DEFAULT '0.00',
	`status` enum('Draft','Approved') DEFAULT 'Draft' NOT NULL,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_analysis_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`category` enum('Material','Labour','Machinery') NOT NULL,
	`description` varchar(255) NOT NULL,
	`unit` varchar(30) DEFAULT 'Nos',
	`coefficient` decimal(14,4) DEFAULT '0.0000',
	`rate` decimal(14,2) DEFAULT '0.00',
	`amount` decimal(14,2) DEFAULT '0.00',
	`sortOrder` int DEFAULT 0 NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_analysis_components_id` PRIMARY KEY(`id`)
);
