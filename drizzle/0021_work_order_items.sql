CREATE TABLE `work_order_items` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `workOrderId` int NOT NULL,
  `srNo` int NOT NULL DEFAULT 1,
  `description` text NOT NULL,
  `unit` varchar(30) NOT NULL,
  `rate` decimal(14,2) NOT NULL DEFAULT '0.00',
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `work_order_items_workOrderId_fk` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `work_orders` ADD COLUMN `termsOverride` text NULL;
