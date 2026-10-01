CREATE TABLE `hr_payroll_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`payrollMonth` varchar(7) NOT NULL,
	`adjustmentType` enum('Advance','Loan Recovery','Allowance','Bonus','Fine','Other') NOT NULL,
	`title` varchar(160) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`recoveryInstallment` decimal(14,2) NOT NULL DEFAULT '0.00',
	`status` enum('Draft','Approved','Applied','Cancelled') NOT NULL DEFAULT 'Draft',
	`referenceNo` varchar(80),
	`remarks` text,
	`createdBy` int,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_payroll_adjustments_id` PRIMARY KEY(`id`)
);
