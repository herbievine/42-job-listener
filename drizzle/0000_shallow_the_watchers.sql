CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_title` text NOT NULL,
	`offer_description` text NOT NULL,
	`offer_salary` text NOT NULL,
	`offer_contract` text NOT NULL,
	`offer_email` text NOT NULL,
	`sent_email` integer DEFAULT false NOT NULL,
	`rejected_reason` text,
	`sent_failed_reason` text,
	`email_to` text,
	`email_subject` text,
	`email_html` text,
	`email_lang` text,
	`processed` integer DEFAULT false NOT NULL,
	`processed_description` text,
	`processed_tags` text,
	`timestamp` integer DEFAULT '"2025-02-06T18:24:09.297Z"' NOT NULL
);
