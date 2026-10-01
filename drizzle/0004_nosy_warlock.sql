ALTER TABLE `daily_progress` ADD `clientDraftId` varchar(64);--> statement-breakpoint
ALTER TABLE `daily_progress` ADD CONSTRAINT `daily_progress_clientDraftId_unique` UNIQUE(`clientDraftId`);