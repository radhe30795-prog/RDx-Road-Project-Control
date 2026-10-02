CREATE TABLE `bbs_schedules` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `roadId` int,
  `structureId` int,
  `title` varchar(255) NOT NULL,
  `status` enum('Draft','Approved') DEFAULT 'Draft' NOT NULL,
  `remarks` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `bbs_bars` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `scheduleId` int NOT NULL,
  `barMark` varchar(20) NOT NULL,
  `description` text NOT NULL,
  `dia` decimal(5,1) DEFAULT '0.0' NOT NULL,
  `nos` int DEFAULT 0 NOT NULL,
  `lengthEach` decimal(10,3) DEFAULT '0.000' NOT NULL,
  `shape` enum('Straight','L-bend','U-bend','Stirrup','Crank') DEFAULT 'Straight' NOT NULL,
  `hookAllowance` decimal(10,1) DEFAULT '0.0' NOT NULL,
  `totalLength` decimal(14,3) DEFAULT '0.000' NOT NULL,
  `weightKg` decimal(14,2) DEFAULT '0.00' NOT NULL,
  `sortOrder` int DEFAULT 0 NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `bbs_bars_schedule_idx` (`scheduleId`)
);
