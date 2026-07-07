ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `hp` int DEFAULT 100 NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `welcome_bonus_claimed` boolean DEFAULT false NOT NULL;
