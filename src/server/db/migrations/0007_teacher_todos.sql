CREATE TABLE IF NOT EXISTS `teacher_todos` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
  `is_completed` boolean NOT NULL DEFAULT false,
  `due_date` datetime(3),
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `teacher_todos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
