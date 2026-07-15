-- Migration 0007 already created `teacher_todos`; only apply schema deltas here.
ALTER TABLE `teacher_todos` ADD COLUMN IF NOT EXISTS `class_id` varchar(64);--> statement-breakpoint
ALTER TABLE `teacher_todos` ADD COLUMN IF NOT EXISTS `category` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `session_token` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `session_token_created_at` datetime(3) NULL;--> statement-breakpoint
ALTER TABLE `teacher_todos` DROP FOREIGN KEY IF EXISTS `teacher_todos_user_id_users_id_fk`;--> statement-breakpoint
ALTER TABLE `teacher_todos` ADD CONSTRAINT `teacher_todos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_todos` DROP FOREIGN KEY IF EXISTS `teacher_todos_class_id_classes_id_fk`;--> statement-breakpoint
ALTER TABLE `teacher_todos` ADD CONSTRAINT `teacher_todos_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE set null ON UPDATE no action;