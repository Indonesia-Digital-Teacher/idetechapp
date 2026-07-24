ALTER TABLE `consultation_threads` ADD COLUMN IF NOT EXISTS `parent_feedback` enum('positive','negative') NULL;--> statement-breakpoint
ALTER TABLE `consultation_threads` ADD COLUMN IF NOT EXISTS `parent_feedback_at` datetime(3) NULL;
