CREATE TABLE `lesson_plans` (
	`id` varchar(64) NOT NULL,
	`teacher_user_id` varchar(64) NOT NULL,
	`topic` varchar(255) NOT NULL,
	`grade` varchar(50) NOT NULL,
	`duration` varchar(100) NOT NULL,
	`model` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`bank_status` enum('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `lesson_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bank_requests` MODIFY COLUMN `item_type` enum('material','quest','rpp') NOT NULL;--> statement-breakpoint
ALTER TABLE `student_quest_progress` ADD `submission_text` text;--> statement-breakpoint
ALTER TABLE `student_quest_progress` ADD `submission_file_url` text;--> statement-breakpoint
ALTER TABLE `student_quest_progress` ADD `teacher_feedback` text;--> statement-breakpoint
ALTER TABLE `lesson_plans` ADD CONSTRAINT `lesson_plans_teacher_user_id_users_id_fk` FOREIGN KEY (`teacher_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;