import type { Express, Request, Response } from "express";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

// Helper function to handle async route handlers
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: any) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// Helper to get user from request using SDK directly
const getUserFromRequest = async (req: Request) => {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
};

// Helper to check if user is admin
const requireAdmin = async (req: Request) => {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
};

// Helper to check if user is authenticated
const requireAuth = async (req: Request) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }
  return user;
};

export function registerRestRoutes(app: Express) {
  // ============ AUTH ROUTES ============
  app.get("/api/auth/me", asyncHandler(async (req, res) => {
    const user = await getUserFromRequest(req);
    res.json(user || null);
  }));

  app.post("/api/auth/logout", asyncHandler(async (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
    res.json({ success: true });
  }));

  // ============ SUBJECTS ROUTES ============
  app.post("/api/subjects", asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req);
    const { title, description, icon, color } = req.body;
    const result = await db.createSubject({
      title,
      description,
      icon,
      color,
      createdBy: admin.id,
    });
    res.json(result[0]);
  }));

  app.get("/api/subjects", asyncHandler(async (req, res) => {
    const subjects = await db.getAllSubjects();
    res.json(subjects);
  }));

  app.get("/api/subjects/:id", asyncHandler(async (req, res) => {
    const subject = await db.getSubjectById(parseInt(req.params.id));
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }
    res.json(subject);
  }));

  app.delete("/api/subjects/:id", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    await db.deleteSubject(parseInt(req.params.id));
    res.json({ success: true });
  }));

  // ============ SECTIONS ROUTES ============
  app.post("/api/sections", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    const { subjectId, title, description, order } = req.body;
    const result = await db.createSection({
      subjectId,
      title,
      description,
      order,
    });
    res.json(result[0]);
  }));

  app.get("/api/sections/subject/:subjectId", asyncHandler(async (req, res) => {
    const sections = await db.getSectionsBySubject(parseInt(req.params.subjectId));
    res.json(sections);
  }));

  app.delete("/api/sections/:id", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    await db.deleteSection(parseInt(req.params.id));
    res.json({ success: true });
  }));

  // ============ QUESTIONS ROUTES ============
  app.post("/api/questions", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    const { sectionId, text, options, correctOptionId, explanation, explanationLink, aiPrompt } = req.body;
    const result = await db.createQuestion({
      sectionId,
      text,
      options,
      correctOptionId,
      explanation,
      explanationLink,
      aiPrompt,
    });
    res.json(result[0]);
  }));

  app.get("/api/questions/section/:sectionId", asyncHandler(async (req, res) => {
    const questions = await db.getQuestionsBySection(parseInt(req.params.sectionId));
    res.json(questions);
  }));

  app.delete("/api/questions/:id", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    await db.deleteQuestion(parseInt(req.params.id));
    res.json({ success: true });
  }));

  app.post("/api/questions/bulk-import", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    const { sectionId, questions } = req.body;
    const results = [];
    for (const q of questions) {
      const result = await db.createQuestion({
        sectionId,
        ...q,
      });
      results.push(result[0]);
    }
    res.json(results);
  }));

  // ============ EXAMS ROUTES ============
  app.post("/api/exams", asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req);
    const { subjectId, title, description, type, totalQuestions, sectionDistribution, timeLimit, passingScore } = req.body;
    const result = await db.createExam({
      subjectId,
      title,
      description,
      type,
      totalQuestions,
      sectionDistribution,
      timeLimit,
      passingScore,
      createdBy: admin.id,
    });
    res.json(result[0]);
  }));

  app.get("/api/exams/:id", asyncHandler(async (req, res) => {
    const exam = await db.getExamById(parseInt(req.params.id));
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  }));

  app.get("/api/exams/subject/:subjectId", asyncHandler(async (req, res) => {
    const exams = await db.getExamsBySubject(parseInt(req.params.subjectId));
    res.json(exams);
  }));

  app.delete("/api/exams/:id", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    await db.deleteExam(parseInt(req.params.id));
    res.json({ success: true });
  }));

  app.get("/api/exams/:id/questions", asyncHandler(async (req, res) => {
    const exam = await db.getExamById(parseInt(req.params.id));
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const distribution = exam.sectionDistribution as { sectionId: number; count: number }[];
    const allQuestions: any[] = [];

    for (const dist of distribution) {
      const questions = await db.getQuestionsBySection(dist.sectionId);
      const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, dist.count);
      allQuestions.push(...shuffled);
    }

    res.json(allQuestions.sort(() => Math.random() - 0.5));
  }));

  // ============ EXAM CODES ROUTES ============
  app.post("/api/exam-codes", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    const { examId, maxUses, expiresAt } = req.body;
    const code = nanoid(10).toUpperCase();
    const result = await db.createExamCode({
      examId,
      code,
      maxUses,
      isActive: true,
      expiresAt,
    });
    res.json(result[0]);
  }));

  app.get("/api/exam-codes/validate/:code", asyncHandler(async (req, res) => {
    const examCode = await db.getExamCodeByCode(req.params.code);
    if (!examCode) {
      return res.status(404).json({ error: "الكود غير صحيح" });
    }

    if (!examCode.isActive) {
      return res.status(403).json({ error: "الكود غير نشط" });
    }

    if (examCode.expiresAt && new Date() > examCode.expiresAt) {
      return res.status(403).json({ error: "انتهت صلاحية الكود" });
    }

    if (examCode.maxUses && examCode.currentUses && examCode.currentUses >= examCode.maxUses) {
      return res.status(403).json({ error: "تم استنفاد عدد استخدامات الكود" });
    }

    res.json({ examId: examCode.examId, valid: true, id: examCode.id });
  }));

  app.get("/api/exam-codes/exam/:examId", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    const codes = await db.getExamCodesByExam(parseInt(req.params.examId));
    res.json(codes);
  }));

  // ============ RESULTS ROUTES ============
  app.post("/api/results/submit", asyncHandler(async (req, res) => {
    const userResult = await requireAuth(req);
    const { examId, answers, examCodeId, startedAt } = req.body;

    const exam = await db.getExamById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    let totalCorrect = 0;
    const processedAnswers: { questionId: number; selectedOptionId: string; isCorrect: boolean; sectionId: number }[] = [];
    const sectionStats: Record<number, { correct: number; total: number }> = {};

    const sections = exam.sectionDistribution as { sectionId: number; count: number }[];
    for (const dist of sections) {
      const sectionQuestions = await db.getQuestionsBySection(dist.sectionId);
      const questionMap = new Map(sectionQuestions.map(q => [q.id, q]));

      sectionStats[dist.sectionId] = { correct: 0, total: 0 };

      for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (question) {
          const isCorrect = question.correctOptionId === answer.selectedOptionId;
          processedAnswers.push({
            ...answer,
            isCorrect,
            sectionId: dist.sectionId
          });
          sectionStats[dist.sectionId].total++;
          if (isCorrect) {
            totalCorrect++;
            sectionStats[dist.sectionId].correct++;
          }
        }
      }
    }

    const totalScore = answers.length > 0 ? (totalCorrect / answers.length) * 100 : 0;
    const sectionScores = Object.entries(sectionStats).map(([sectionId, stats]) => ({
      sectionId: parseInt(sectionId),
      score: stats.correct,
      percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    }));

    const result = await db.createExamResult({
      examId,
      userId: userResult.id,
      examCodeId,
      totalScore: totalScore.toFixed(2) as any,
      sectionScores: sectionScores as any,
      answers: processedAnswers as any,
      startedAt: new Date(startedAt),
      completedAt: new Date(),
    });

    res.json(result[0]);
  }));

  app.get("/api/results/user", asyncHandler(async (req, res) => {
    const userResult = await requireAuth(req);
    const results = await db.getExamResultsByUser(userResult.id);
    res.json(results);
  }));

  app.get("/api/results/:id", asyncHandler(async (req, res) => {
    const userResult = await requireAuth(req);
    const results = await db.getExamResultsByUser(userResult.id);
    const result = results.find(r => r.id === parseInt(req.params.id));
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }
    res.json(result);
  }));

  // ============ ASSESSMENT TEXTS ROUTES ============
  app.post("/api/assessment-texts", asyncHandler(async (req, res) => {
    await requireAdmin(req);
    const { examId, minScore, maxScore, text, sectionConditions } = req.body;
    const result = await db.createAssessmentText({
      examId,
      minScore,
      maxScore,
      text,
      sectionConditions,
    });
    res.json(result[0]);
  }));

  app.get("/api/assessment-texts/exam/:examId", asyncHandler(async (req, res) => {
    const texts = await db.getAssessmentTextsByExam(parseInt(req.params.examId));
    res.json(texts);
  }));

  // Error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error("[REST API Error]", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });
}

