CREATE TABLE `hr_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`projectId` int NOT NULL,
	`roadId` int,
	`roleOnSite` varchar(150),
	`assignmentStart` varchar(20) NOT NULL,
	`assignmentEnd` varchar(20),
	`status` enum('Active','Completed','Cancelled') NOT NULL DEFAULT 'Active',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `hr_designations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(120) NOT NULL,
	`grade` varchar(50),
	`description` text,
	`status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_designations_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_designations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `hr_employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeCode` varchar(60) NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`fatherName` varchar(180),
	`phone` varchar(30),
	`email` varchar(320),
	`dateOfBirth` varchar(20),
	`gender` enum('Male','Female','Other'),
	`aadhaarLast4` varchar(4),
	`panReference` varchar(20),
	`address` text,
	`emergencyContactName` varchar(150),
	`emergencyContactPhone` varchar(30),
	`departmentId` int,
	`designationId` int,
	`employmentType` enum('Staff','Site Engineer','Supervisor','Operator','Skilled Labour','Unskilled Labour','Contract','Consultant') NOT NULL DEFAULT 'Staff',
	`joiningDate` varchar(20) NOT NULL,
	`exitDate` varchar(20),
	`status` enum('Active','On Leave','Inactive','Exited') NOT NULL DEFAULT 'Active',
	`payBasis` enum('Monthly','Daily','Hourly') NOT NULL DEFAULT 'Monthly',
	`basicRate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`overtimeRate` decimal(14,2) NOT NULL DEFAULT '0.00',
	`bankName` varchar(150),
	`accountLast4` varchar(4),
	`ifscCode` varchar(20),
	`photoUrl` text,
	`documentReferences` text,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_employees_employeeCode_unique` UNIQUE(`employeeCode`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','project_manager','qs_billing_engineer','site_engineer','qa_qc_engineer','hr_payroll_manager') NOT NULL DEFAULT 'user';