CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`phase` enum('Pre-Construction','Earthwork','GSB','WMM','Bituminous Work','Structures / CD Works','Drain & Protection','Shoulder','Road Furniture','QA/QC','Billing & QS','Hindrance','Completion') NOT NULL,
	`activityName` varchar(255) NOT NULL,
	`startDate` varchar(20) NOT NULL,
	`endDate` varchar(20) NOT NULL,
	`percentageComplete` decimal(5,2) NOT NULL DEFAULT '0.00',
	`status` enum('Not Started','In Progress','Complete','On Hold','Overdue') NOT NULL DEFAULT 'Not Started',
	`priority` enum('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
	`assignedTo` varchar(255),
	`predecessorActivity` varchar(255),
	`dependencyType` varchar(50) DEFAULT 'FS',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`),
	CONSTRAINT `activities_taskId_unique` UNIQUE(`taskId`)
);
--> statement-breakpoint
CREATE TABLE `billing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`billId` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`billType` varchar(100) NOT NULL,
	`measurementStatus` enum('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
	`quantityCalculationStatus` enum('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
	`abstractStatus` enum('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
	`billPrepared` enum('No','Yes') NOT NULL DEFAULT 'No',
	`submissionDate` varchar(20),
	`verificationStatus` enum('Measurement','Quantity Calculation','Abstract','Bill Prepared','Submitted','Under Verification','Passed','Payment Received') NOT NULL DEFAULT 'Measurement',
	`passedAmount` decimal(14,2) DEFAULT '0.00',
	`paymentStatus` enum('Unpaid','Partial','Received') NOT NULL DEFAULT 'Unpaid',
	`paymentDate` varchar(20),
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billing_id` PRIMARY KEY(`id`),
	CONSTRAINT `billing_billId_unique` UNIQUE(`billId`)
);
--> statement-breakpoint
CREATE TABLE `daily_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(20) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`activityId` int NOT NULL,
	`plannedQuantity` decimal(12,2) NOT NULL DEFAULT '0.00',
	`actualQuantity` decimal(12,2) NOT NULL DEFAULT '0.00',
	`unit` varchar(50) NOT NULL,
	`percentageComplete` decimal(5,2) NOT NULL DEFAULT '0.00',
	`manpower` text,
	`machinery` text,
	`weather` varchar(50) DEFAULT 'Clear / Sunny',
	`hindrance` text,
	`remarks` text,
	`sitePhotos` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int,
	`category` enum('Agreement','BOQ','Drawings','DPR','Survey','QA/QC','Measurement','RA Bills','Hindrance','Correspondence','Site Photos','Completion') NOT NULL,
	`title` varchar(255) NOT NULL,
	`documentNumber` varchar(100),
	`fileUrl` text NOT NULL,
	`fileSize` varchar(50),
	`uploadedBy` varchar(100),
	`date` varchar(20) NOT NULL,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hindrances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hindranceId` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`rdLocation` varchar(100) NOT NULL,
	`category` enum('Electric Pole','Land Issue','Utility','Forest/Tree','Local Obstruction','Department Decision','Drawing Issue','Material','Other') NOT NULL,
	`description` text NOT NULL,
	`dateRaised` varchar(20) NOT NULL,
	`affectedActivity` varchar(255) NOT NULL,
	`affectedLength` varchar(100),
	`responsiblePersonDepartment` varchar(255) NOT NULL,
	`letterNumber` varchar(100),
	`status` enum('Open','Under Review','Resolved') NOT NULL DEFAULT 'Open',
	`dueDate` varchar(20),
	`resolutionDate` varchar(20),
	`daysPending` int NOT NULL DEFAULT 0,
	`remarks` text,
	`supportingPhotosDocuments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hindrances_id` PRIMARY KEY(`id`),
	CONSTRAINT `hindrances_hindranceId_unique` UNIQUE(`hindranceId`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` varchar(50) NOT NULL,
	`date` varchar(20) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`material` varchar(255) NOT NULL,
	`receivedQuantity` decimal(12,2) NOT NULL DEFAULT '0.00',
	`usedQuantity` decimal(12,2) NOT NULL DEFAULT '0.00',
	`balanceQuantity` decimal(12,2) NOT NULL DEFAULT '0.00',
	`unit` varchar(50) NOT NULL,
	`supplier` varchar(255),
	`challanReference` varchar(100),
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `materials_id` PRIMARY KEY(`id`),
	CONSTRAINT `materials_entryId_unique` UNIQUE(`entryId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`severity` enum('info','warning','critical','success') NOT NULL DEFAULT 'info',
	`targetRole` varchar(50),
	`isRead` int NOT NULL DEFAULT 0,
	`entityType` varchar(50),
	`entityId` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` varchar(50) NOT NULL,
	`projectName` varchar(255) NOT NULL,
	`package` varchar(100),
	`clientDepartment` varchar(255) NOT NULL,
	`contractor` varchar(255) NOT NULL,
	`agreementStartDate` varchar(20) NOT NULL,
	`agreementEndDate` varchar(20) NOT NULL,
	`status` enum('Not Started','In Progress','Completed','On Hold') NOT NULL DEFAULT 'In Progress',
	`overallProgress` decimal(5,2) NOT NULL DEFAULT '0.00',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `qa_qc_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` varchar(50) NOT NULL,
	`date` varchar(20) NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int NOT NULL,
	`activity` varchar(255) NOT NULL,
	`testType` enum('FDT','Proctor','CBR','Gradation','Atterberg Limits','Aggregate Crushing Value','Flakiness & Elongation','Bitumen Test','Core Test','Marshall','Other') NOT NULL,
	`locationRd` varchar(100) NOT NULL,
	`requiredValue` varchar(100) NOT NULL,
	`actualValue` varchar(100) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`result` enum('Passed','Failed','Pending') NOT NULL DEFAULT 'Pending',
	`testReportReference` varchar(100),
	`remarks` text,
	`correctiveActionStatus` enum('None','Required','In Progress','Rectified') NOT NULL DEFAULT 'None',
	`correctiveActionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qa_qc_tests_id` PRIMARY KEY(`id`),
	CONSTRAINT `qa_qc_tests_testId_unique` UNIQUE(`testId`)
);
--> statement-breakpoint
CREATE TABLE `roads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roadId` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`roadName` varchar(255) NOT NULL,
	`roadLengthKm` decimal(8,3) NOT NULL,
	`startRd` varchar(50) NOT NULL,
	`endRd` varchar(50) NOT NULL,
	`status` enum('Not Started','In Progress','Completed','On Hold') NOT NULL DEFAULT 'In Progress',
	`progress` decimal(5,2) NOT NULL DEFAULT '0.00',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roads_id` PRIMARY KEY(`id`),
	CONSTRAINT `roads_roadId_unique` UNIQUE(`roadId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','project_manager','qs_billing_engineer','site_engineer','qa_qc_engineer') NOT NULL DEFAULT 'admin';