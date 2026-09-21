CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`gift_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`seen` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_alerts_user_time` ON `alerts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`recipient` text NOT NULL,
	`query` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'watching' NOT NULL,
	`planned_price` real,
	`selected_offer_id` text,
	`threshold` integer DEFAULT 15 NOT NULL,
	`offers` text DEFAULT '[]' NOT NULL,
	`current_price` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`last_checked` text,
	`last_success` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_gifts_user` ON `gifts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_gifts_due` ON `gifts` (`status`,`last_checked`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_groups_user` ON `groups` (`user_id`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`gift_id` text NOT NULL,
	`offer_id` text NOT NULL,
	`price` real NOT NULL,
	`currency` text NOT NULL,
	`seller` text NOT NULL,
	`checked_at` text NOT NULL,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_observations_gift_time` ON `observations` (`gift_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `system` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
