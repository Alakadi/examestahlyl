import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// المواد الدراسية
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;

// الأقسام داخل المادة
export const sections = mysqlTable("sections", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Section = typeof sections.$inferSelect;
export type InsertSection = typeof sections.$inferInsert;

// الأسئلة
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  sectionId: int("sectionId").notNull(),
  text: text("text").notNull(),
  options: json("options").$type<{ id: string; text: string }[]>().notNull(),
  correctOptionId: varchar("correctOptionId", { length: 64 }).notNull(),
  explanation: text("explanation"),
  explanationLink: varchar("explanationLink", { length: 500 }),
  aiPrompt: text("aiPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// الاختبارات
export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["free", "paid"]).default("free").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  sectionDistribution: json("sectionDistribution").$type<{ sectionId: number; count: number }[]>().notNull(),
  timeLimit: int("timeLimit"),
  passingScore: int("passingScore").default(60),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;

// نصوص التقييم الديناميكية
export const assessmentTexts = mysqlTable("assessmentTexts", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  minScore: int("minScore").notNull(),
  maxScore: int("maxScore").notNull(),
  text: text("text").notNull(),
  sectionConditions: json("sectionConditions").$type<{ sectionId: number; minScore: number; maxScore: number; text: string }[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssessmentText = typeof assessmentTexts.$inferSelect;
export type InsertAssessmentText = typeof assessmentTexts.$inferInsert;

// أكواد الاختبارات المدفوعة
export const examCodes = mysqlTable("examCodes", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  maxUses: int("maxUses"),
  currentUses: int("currentUses").default(0),
  isActive: boolean("isActive").default(true),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExamCode = typeof examCodes.$inferSelect;
export type InsertExamCode = typeof examCodes.$inferInsert;

// نتائج الاختبارات
export const examResults = mysqlTable("examResults", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  userId: int("userId").notNull(),
  examCodeId: int("examCodeId"),
  totalScore: decimal("totalScore", { precision: 5, scale: 2 }).notNull(),
  sectionScores: json("sectionScores").$type<{ sectionId: number; score: number; percentage: number }[]>().notNull(),
  answers: json("answers").$type<{ questionId: number; selectedOptionId: string; isCorrect: boolean }[]>().notNull(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = typeof examResults.$inferInsert;

// سجل استخدام الأكواس
export const codeUsageLog = mysqlTable("codeUsageLog", {
  id: int("id").autoincrement().primaryKey(),
  examCodeId: int("examCodeId").notNull(),
  userId: int("userId").notNull(),
  resultId: int("resultId"),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type CodeUsageLog = typeof codeUsageLog.$inferSelect;
export type InsertCodeUsageLog = typeof codeUsageLog.$inferInsert;