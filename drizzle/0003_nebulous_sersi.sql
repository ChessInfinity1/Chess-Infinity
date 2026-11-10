CREATE TABLE `practice_push` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subscription` text NOT NULL,
	`schedule` text NOT NULL,
	`next_send_at` integer NOT NULL,
	`last_local_day` text,
	`lease_until` integer,
	`failures` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`last_test_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_push_due_idx` ON `practice_push` (`next_send_at`);--> statement-breakpoint
CREATE INDEX `practice_push_user_idx` ON `practice_push` (`user_id`);