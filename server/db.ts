import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Subjects queries
export async function createSubject(data: InsertSubject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subjects).values(data);
  return result;
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

// Sections queries
export async function createSection(data: InsertSection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(sections).values(data);
}

export async function getSectionsBySubject(subjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(sections).where(eq(sections.subjectId, subjectId));
}

// Questions queries
export async function createQuestion(data: InsertQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(questions).values(data);
}

export async function getQuestionsBySection(sectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(questions).where(eq(questions.sectionId, sectionId));
}

// Exams queries
export async function createExam(data: InsertExam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(exams).values(data);
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

// Exam codes queries
export async function createExamCode(data: InsertExamCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(examCodes).values(data);
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

// Exam results queries
export async function createExamResult(data: InsertExamResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(examResults).values(data);
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
  return db.insert(assessmentTexts).values(data);
}

export async function getAssessmentTextsByExam(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentTexts).where(eq(assessmentTexts.examId, examId));
}

// Import all types
import type { InsertSubject, InsertSection, InsertQuestion, InsertExam, InsertExamCode, InsertExamResult, InsertAssessmentText } from "../drizzle/schema";
import { subjects, sections, questions, exams, examCodes, examResults, assessmentTexts } from "../drizzle/schema";
