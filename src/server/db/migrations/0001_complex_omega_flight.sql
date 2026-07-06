CREATE TABLE `blogs` (
	`id` varchar(64) NOT NULL,
	`author_user_id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`cover_image_url` text,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `blogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_author_user_id_users_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;