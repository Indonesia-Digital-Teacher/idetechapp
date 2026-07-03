CREATE TABLE `activity_logs` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`action` varchar(100) NOT NULL,
	`resource_type` varchar(100) NOT NULL,
	`resource_id` varchar(64),
	`details` text,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_requests` (
	`id` varchar(64) NOT NULL,
	`requester_user_id` varchar(64) NOT NULL,
	`owner_user_id` varchar(64) NOT NULL,
	`target_class_id` varchar(64) NOT NULL,
	`item_type` enum('material','quest') NOT NULL,
	`item_id` varchar(64) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `bank_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_quotas` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`messages_count` int NOT NULL DEFAULT 0,
	`window_start_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_quotas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `class_students` (
	`id` varchar(64) NOT NULL,
	`class_id` varchar(64) NOT NULL,
	`student_user_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `class_students_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_students_class_student_idx` UNIQUE(`class_id`,`student_user_id`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` varchar(64) NOT NULL,
	`class_code` varchar(50),
	`teacher_user_id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`grade` varchar(50) NOT NULL,
	`students` int NOT NULL DEFAULT 0,
	`progress` int NOT NULL DEFAULT 0,
	`next_session` varchar(255) NOT NULL,
	`status` enum('active','draft','archived') NOT NULL DEFAULT 'active',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `classes_class_code_idx` UNIQUE(`class_code`)
);
--> statement-breakpoint
CREATE TABLE `global_announcements` (
	`id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('info','warning','success') NOT NULL DEFAULT 'info',
	`is_active` boolean NOT NULL DEFAULT true,
	`author_user_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `global_announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ide_quests` (
	`id` varchar(64) NOT NULL,
	`teacher_user_id` varchar(64) NOT NULL,
	`class_id` varchar(64) NOT NULL,
	`material_id` varchar(64),
	`title` varchar(255) NOT NULL,
	`mission` text NOT NULL,
	`points` int NOT NULL DEFAULT 100,
	`due_date` varchar(50) NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`bank_status` enum('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `ide_quests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `master_grades` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `master_grades_id` PRIMARY KEY(`id`),
	CONSTRAINT `master_grades_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `master_subjects` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `master_subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `master_subjects_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` varchar(64) NOT NULL,
	`teacher_user_id` varchar(64) NOT NULL,
	`class_id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('lesson','video','document','quiz') NOT NULL DEFAULT 'lesson',
	`description` text NOT NULL,
	`content` text,
	`options` json,
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`bank_status` enum('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `oauth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_provider_account_idx` UNIQUE(`provider`,`provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `parent_students` (
	`id` varchar(64) NOT NULL,
	`parent_user_id` varchar(64) NOT NULL,
	`student_user_id` varchar(64) NOT NULL,
	`relationship` varchar(100) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `parent_students_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_students_parent_student_idx` UNIQUE(`parent_user_id`,`student_user_id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` varchar(64) NOT NULL,
	`role_id` varchar(64) NOT NULL,
	`permission_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_role_permission_idx` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(64) NOT NULL,
	`name` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`description` text NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`active_role` varchar(50) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_idx` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `student_material_progress` (
	`id` varchar(64) NOT NULL,
	`student_user_id` varchar(64) NOT NULL,
	`material_id` varchar(64) NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`completed_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `student_material_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_material_progress_student_material_idx` UNIQUE(`student_user_id`,`material_id`)
);
--> statement-breakpoint
CREATE TABLE `student_quest_progress` (
	`id` varchar(64) NOT NULL,
	`student_user_id` varchar(64) NOT NULL,
	`quest_id` varchar(64) NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`earned_points` int NOT NULL DEFAULT 0,
	`completed_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `student_quest_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_quest_progress_student_quest_idx` UNIQUE(`student_user_id`,`quest_id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `system_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `teacher_journals` (
	`id` varchar(64) NOT NULL,
	`teacher_user_id` varchar(64) NOT NULL,
	`mood` varchar(100),
	`success_reflection` text,
	`improvement_reflection` text,
	`anecdote` text,
	`todos` text,
	`photo_url` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `teacher_journals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`role_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_roles_user_role_idx` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`avatar_url` text,
	`email_verified` boolean NOT NULL DEFAULT false,
	`full_name` varchar(255),
	`school_name` varchar(255),
	`contact_channel` enum('wa','telegram'),
	`contact_value` varchar(100),
	`profile_completed` boolean NOT NULL DEFAULT false,
	`status` enum('active','pending','suspended') NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_requests` ADD CONSTRAINT `bank_requests_requester_user_id_users_id_fk` FOREIGN KEY (`requester_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_requests` ADD CONSTRAINT `bank_requests_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_requests` ADD CONSTRAINT `bank_requests_target_class_id_classes_id_fk` FOREIGN KEY (`target_class_id`) REFERENCES `classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_quotas` ADD CONSTRAINT `chat_quotas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_students` ADD CONSTRAINT `class_students_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_students` ADD CONSTRAINT `class_students_student_user_id_users_id_fk` FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classes` ADD CONSTRAINT `classes_teacher_user_id_users_id_fk` FOREIGN KEY (`teacher_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `global_announcements` ADD CONSTRAINT `global_announcements_author_user_id_users_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ide_quests` ADD CONSTRAINT `ide_quests_teacher_user_id_users_id_fk` FOREIGN KEY (`teacher_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ide_quests` ADD CONSTRAINT `ide_quests_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ide_quests` ADD CONSTRAINT `ide_quests_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materials` ADD CONSTRAINT `materials_teacher_user_id_users_id_fk` FOREIGN KEY (`teacher_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materials` ADD CONSTRAINT `materials_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parent_students` ADD CONSTRAINT `parent_students_parent_user_id_users_id_fk` FOREIGN KEY (`parent_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parent_students` ADD CONSTRAINT `parent_students_student_user_id_users_id_fk` FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_material_progress` ADD CONSTRAINT `student_material_progress_student_user_id_users_id_fk` FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_material_progress` ADD CONSTRAINT `student_material_progress_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_quest_progress` ADD CONSTRAINT `student_quest_progress_student_user_id_users_id_fk` FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_quest_progress` ADD CONSTRAINT `student_quest_progress_quest_id_ide_quests_id_fk` FOREIGN KEY (`quest_id`) REFERENCES `ide_quests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_journals` ADD CONSTRAINT `teacher_journals_teacher_user_id_users_id_fk` FOREIGN KEY (`teacher_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;