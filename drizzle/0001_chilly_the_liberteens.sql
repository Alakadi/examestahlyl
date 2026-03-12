CREATE TABLE `assessmentTexts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`minScore` int NOT NULL,
	`maxScore` int NOT NULL,
	`text` text NOT NULL,
	`sectionConditions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessmentTexts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `codeUsageLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examCodeId` int NOT NULL,
	`userId` int NOT NULL,
	`resultId` int,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `codeUsageLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`maxUses` int,
	`currentUses` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `examCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `examResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`userId` int NOT NULL,
	`examCodeId` int,
	`totalScore` decimal(5,2) NOT NULL,
	`sectionScores` json NOT NULL,
	`answers` json NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('free','paid') NOT NULL DEFAULT 'free',
	`totalQuestions` int NOT NULL,
	`sectionDistribution` json NOT NULL,
	`timeLimit` int,
	`passingScore` int DEFAULT 60,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionId` int NOT NULL,
	`text` text NOT NULL,
	`options` json NOT NULL,
	`correctOptionId` varchar(64) NOT NULL,
	`explanation` text,
	`explanationLink` varchar(500),
	`aiPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(255),
	`color` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`)
);
