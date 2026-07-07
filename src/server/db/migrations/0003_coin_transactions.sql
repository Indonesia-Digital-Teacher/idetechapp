CREATE TABLE `coin_transactions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`type` enum('check_in','quest','material','shop','welcome_bonus') NOT NULL,
	`description` text,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `coin_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coin_transactions` ADD CONSTRAINT `coin_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
