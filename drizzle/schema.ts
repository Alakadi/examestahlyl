import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** OAuth identifier, manual identifier for local auth */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: text("password"),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// المواد الدراسية
export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  createdBy: integer("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;

// الأقسام داخل المادة
export const sections = pgTable("sections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  subjectId: integer("subjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Section = typeof sections.$inferSelect;
export type InsertSection = typeof sections.$inferInsert;

// الأسئلة
export const questions = pgTable("questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sectionId: integer("sectionId").notNull(),
  text: text("text").notNull(),
  options: jsonb("options").$type<{ id: string; text: string }[]>().notNull(),
  correctOptionId: varchar("correctOptionId", { length: 64 }).notNull(),
  explanation: text("explanation"),
  explanationLink: varchar("explanationLink", { length: 500 }),
  aiPrompt: text("aiPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// الاختبارات
export const exams = pgTable("exams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  subjectId: integer("subjectId").notNull(),
  createdBy: integer("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: text("type").$type<"free" | "paid">().default("free").notNull(),
  totalQuestions: integer("totalQuestions").notNull(),
  sectionDistribution: jsonb("sectionDistribution").$type<{ sectionId: number; count: number }[]>().notNull(),
  timeLimit: integer("timeLimit"),
  passingScore: integer("passingScore").default(60),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;

// نصوص التقييم الديناميكية
export const assessmentTexts = pgTable("assessmentTexts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examId: integer("examId").notNull(),
  minScore: integer("minScore").notNull(),
  maxScore: integer("maxScore").notNull(),
  text: text("text").notNull(),
  sectionConditions: jsonb("sectionConditions").$type<{ sectionId: number; minScore: number; maxScore: number; text: string }[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AssessmentText = typeof assessmentTexts.$inferSelect;
export type InsertAssessmentText = typeof assessmentTexts.$inferInsert;

// أكواد الاختبارات المدفوعة
export const examCodes = pgTable("examCodes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examId: integer("examId").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  maxUses: integer("maxUses"),
  currentUses: integer("currentUses").default(0),
  isActive: boolean("isActive").default(true),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExamCode = typeof examCodes.$inferSelect;
export type InsertExamCode = typeof examCodes.$inferInsert;

// نتائج الاختبارات
export const examResults = pgTable("examResults", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examId: integer("examId").notNull(),
  userId: integer("userId").notNull(),
  examCodeId: integer("examCodeId"),
  totalScore: decimal("totalScore", { precision: 5, scale: 2 }).notNull(),
  sectionScores: jsonb("sectionScores").$type<{ sectionId: number; score: number; percentage: number }[]>().notNull(),
  answers: jsonb("answers").$type<{ questionId: number; selectedOptionId: string; isCorrect: boolean }[]>().notNull(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = typeof examResults.$inferInsert;

// سجل استخدام الأكواس
export const codeUsageLog = pgTable("codeUsageLog", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examCodeId: integer("examCodeId").notNull(),
  userId: integer("userId").notNull(),
  resultId: integer("resultId"),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type CodeUsageLog = typeof codeUsageLog.$inferSelect;
export type InsertCodeUsageLog = typeof codeUsageLog.$inferInsert;
