ALTER TABLE `users` ADD `coins` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `last_check_in_date` varchar(10);
--> statement-breakpoint
ALTER TABLE `users` ADD `check_in_streak` int DEFAULT 0 NOT NULL;
