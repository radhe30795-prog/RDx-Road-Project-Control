CREATE TABLE `user_apps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`route` varchar(255) NOT NULL,
	`icon` varchar(40) NOT NULL DEFAULT 'layout-grid',
	`accent` varchar(30) NOT NULL DEFAULT 'amber',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_apps_id` PRIMARY KEY(`id`)
);
