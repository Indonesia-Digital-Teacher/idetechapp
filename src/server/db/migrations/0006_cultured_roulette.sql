ALTER TABLE `classes` ADD COLUMN IF NOT EXISTS `unlocked_level` int DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `ide_quests` ADD COLUMN IF NOT EXISTS `level` int DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN IF NOT EXISTS `level` int DEFAULT 1 NOT NULL;