import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, users, subjects, sections, questions, exams, examCodes, examResults, assessmentTexts,
  InsertSubject, InsertSection, InsertQuestion, InsertExam, InsertExamCode, InsertExamResult, InsertAssessmentText 
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { ...user };
    const updateSet: Record<string, any> = { ...user };
    delete updateSet.id; // Prevent updating ID

    if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    // PostgreSQL conflict handling - either by openId or email
    if (user.openId) {
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
    } else {
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.email,
        set: updateSet,
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(users).values(user).returning();
}

// Subjects queries
export async function createSubject(data: InsertSubject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(subjects).values(data).returning();
}

export async function getSubjectById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return result[0];
}

export async function getSubjectsByCreator(createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(subjects).where(eq(subjects.createdBy, createdBy));
}

export async function getAllSubjects() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(subjects);
}

export async function deleteSubject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(subjects).where(eq(subjects.id, id));
}

// Sections queries
export async function createSection(data: InsertSection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(sections).values(data).returning();
}

export async function getSectionsBySubject(subjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(sections).where(eq(sections.subjectId, subjectId));
}

export async function deleteSection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(sections).where(eq(sections.id, id));
}

// Questions queries
export async function createQuestion(data: InsertQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(questions).values(data).returning();
}

export async function getQuestionsBySection(sectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(questions).where(eq(questions.sectionId, sectionId));
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(questions).where(eq(questions.id, id));
}

export async function getQuestionCountBySubject(subjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select({
    count: sql<number>`count(*)::int`
  })
  .from(questions)
  .innerJoin(sections, eq(questions.sectionId, sections.id))
  .where(eq(sections.subjectId, subjectId));
  
  return result[0]?.count || 0;
}

export async function updateQuestion(id: number, data: Partial<InsertQuestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(questions).set(data).where(eq(questions.id, id)).returning();
}

// Exams queries
export async function createExam(data: InsertExam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(exams).values(data).returning();
}

export async function getExamById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  return result[0];
}

export async function getExamsBySubject(subjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(exams).where(eq(exams.subjectId, subjectId));
}

export async function getAllExams() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(exams);
}

export async function deleteExam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(exams).where(eq(exams.id, id));
}

// Exam codes queries
export async function createExamCode(data: InsertExamCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(examCodes).values(data).returning();
}

export async function getExamCodeByCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(examCodes).where(eq(examCodes.code, code)).limit(1);
  return result[0];
}

export async function getExamCodesByExam(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(examCodes).where(eq(examCodes.examId, examId));
}

export async function updateExamCode(id: number, data: Partial<InsertExamCode>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(examCodes).set(data).where(eq(examCodes.id, id)).returning();
}

export async function deleteExamCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(examCodes).where(eq(examCodes.id, id));
}

// Exam results queries
export async function createExamResult(data: InsertExamResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(examResults).values(data).returning();
}

export async function getExamResultsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(examResults).where(eq(examResults.userId, userId));
}

// Assessment texts queries
export async function createAssessmentText(data: InsertAssessmentText) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(assessmentTexts).values(data).returning();
}

export async function getAssessmentTextsByExam(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentTexts).where(eq(assessmentTexts.examId, examId));
}

// Export schema types for other files
export type { InsertSubject, InsertSection, InsertQuestion, InsertExam, InsertExamCode, InsertExamResult, InsertAssessmentText } from "../drizzle/schema";
