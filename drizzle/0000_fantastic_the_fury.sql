CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`link` text NOT NULL,
	`apply_date` text,
	`admit_date` text,
	`exam_date` text,
	`result_date` text,
	`status` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` text NOT NULL,
	`verified` integer DEFAULT false,
	`file_path` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`dob` text,
	`gender` text,
	`phone` text,
	`aadhaar_last_4` text,
	`address_line1` text,
	`address_line2` text,
	`city` text,
	`state` text,
	`pincode` text,
	`country` text,
	`qualification` text,
	`institution` text,
	`year_of_passing` text,
	`cgpa` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`member_since` text NOT NULL,
	`profile_complete` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);