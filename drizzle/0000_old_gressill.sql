CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`geography` text NOT NULL,
	`brand` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text DEFAULT 'local-user' NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stage_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`input` text NOT NULL,
	`output` text,
	`model` text,
	`status` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL
);
