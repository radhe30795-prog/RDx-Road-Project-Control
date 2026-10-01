CREATE TABLE `hr_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`attendanceDate` varchar(20) NOT NULL,
	`projectId` int,
	`roadId` int,
	`status` enum('Present','Absent','Half Day','Weekly Off','Holiday','On Leave') NOT NULL DEFAULT 'Present',
	`inTime` varchar(10),
	`outTime` varchar(10),
	`overtimeHours` decimal(8,2) NOT NULL DEFAULT '0.00',
	`remarks` text,
	`markedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`leaveType` enum('Casual','Sick','Earned','Unpaid','Compensatory','Other') NOT NULL DEFAULT 'Casual',
	`fromDate` varchar(20) NOT NULL,
	`toDate` varchar(20) NOT NULL,
	`totalDays` decimal(8,2) NOT NULL DEFAULT '1.00',
	`reason` text,
	`status` enum('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_payroll_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payrollRunId` int NOT NULL,
	`employeeId` int NOT NULL,
	`payableDays` decimal(8,2) NOT NULL DEFAULT '0.00',
	`absentDays` decimal(8,2) NOT NULL DEFAULT '0.00',
	`overtimeHours` decimal(8,2) NOT NULL DEFAULT '0.00',
	`basicAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`overtimeAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`allowanceAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`deductionAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`grossAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_payroll_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hr_payroll_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payrollMonth` varchar(7) NOT NULL,
	`periodFrom` varchar(20) NOT NULL,
	`periodTo` varchar(20) NOT NULL,
	`status` enum('Draft','Approved','Paid','Cancelled') NOT NULL DEFAULT 'Draft',
	`employeeCount` int NOT NULL DEFAULT 0,
	`grossTotal` decimal(16,2) NOT NULL DEFAULT '0.00',
	`deductionTotal` decimal(16,2) NOT NULL DEFAULT '0.00',
	`netTotal` decimal(16,2) NOT NULL DEFAULT '0.00',
	`preparedBy` int,
	`approvedBy` int,
	`approvedAt` timestamp,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hr_payroll_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `hr_payroll_runs_payrollMonth_unique` UNIQUE(`payrollMonth`)
);
