
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مسجل مسبقاً" });
        }

        const [newUser] = await db.createUser({
          ...input,
          role: "user",
          loginMethod: "local",
        });

        // Create session
        const sessionToken = await sdk.createSessionToken(input.email, { name: input.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return newUser;
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
        expectedRole: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || user.password !== input.password) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        }

        if (user.role !== input.expectedRole) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: input.expectedRole === "admin" 
              ? "هذا الحساب ليس لديه صلاحيات مسؤول" 
              : "هذا الحساب خاص بالمسؤولين، يرجى الدخول من بوابة المسؤول" 
          });
        }

        // Update last signed in
        await db.upsertUser({ 
          email: user.email, 
          lastSignedIn: new Date() 
        });

        // Create session
        const sessionToken = await sdk.createSessionToken(user.email, { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return user;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Subjects
  subjects: router({
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSubject({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    getAll: publicProcedure.query(() => db.getAllSubjects()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getSubjectById(input.id)),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteSubject(input.id)),

    getQuestionCount: adminProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(({ input }) => db.getQuestionCountBySubject(input.subjectId)),
  }),

  // Sections
  sections: router({
    create: adminProcedure
      .input(z.object({
        subjectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(({ input }) => db.createSection(input)),

    getBySubject: publicProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(({ input }) => db.getSectionsBySubject(input.subjectId)),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteSection(input.id)),
  }),

  // Questions
  questions: router({
    create: adminProcedure
      .input(z.object({
        sectionId: z.number(),
        text: z.string().min(1),
        options: z.array(z.object({ id: z.string(), text: z.string() })),
        correctOptionId: z.string(),
        explanation: z.string().optional(),
        explanationLink: z.string().optional(),
        aiPrompt: z.string().optional(),
      }))
      .mutation(({ input }) => db.createQuestion(input)),

    getBySection: publicProcedure
      .input(z.object({ sectionId: z.number() }))
      .query(({ input }) => db.getQuestionsBySection(input.sectionId)),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteQuestion(input.id)),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        text: z.string().optional(),
        options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
        correctOptionId: z.string().optional(),
        explanation: z.string().optional(),
        explanationLink: z.string().optional(),
        aiPrompt: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateQuestion(id, data);
      }),

    bulkImport: adminProcedure
      .input(z.object({
        sectionId: z.number(),
        questions: z.array(z.object({
          text: z.string(),
          options: z.array(z.object({ id: z.string(), text: z.string() })),
          correctOptionId: z.string(),
          explanation: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const results = [];
        for (const q of input.questions) {
          const result = await db.createQuestion({
            sectionId: input.sectionId,
            ...q,
          });
          results.push(result);
        }
        return results;
      }),
  }),

  // Exams
  exams: router({
    create: adminProcedure
      .input(z.object({
        subjectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["free", "paid"]),
        totalQuestions: z.number().min(1),
        sectionDistribution: z.array(z.object({ sectionId: z.number(), count: z.number() })),
        timeLimit: z.number().optional(),
        passingScore: z.number().optional(),
        pointsToUnlock: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createExam({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getExamById(input.id)),

    getBySubject: publicProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(({ input }) => db.getExamsBySubject(input.subjectId)),

    getAll: publicProcedure.query(() => db.getAllExams()),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteExam(input.id)),

    getQuestions: publicProcedure
      .input(z.object({ examId: z.number() }))
      .query(async ({ input }) => {
        const exam = await db.getExamById(input.examId);
        if (!exam) throw new TRPCError({ code: "NOT_FOUND" });
        
        let distribution = (exam.sectionDistribution as { sectionId: number; count?: number; percentage?: number }[]) || [];
        const allQuestions: any[] = [];

        // If no distribution is defined, auto-distribute equally
        if (distribution.length === 0) {
          const sections = await db.getSectionsBySubject(exam.subjectId);
          if (sections.length > 0) {
            const countPerSection = Math.ceil(exam.totalQuestions / sections.length);
            distribution = sections.map(s => ({ sectionId: s.id, count: countPerSection }));
          }
        } else {
            // Handle percentage-based distribution
            distribution = distribution.map(d => {
                if (d.percentage !== undefined) {
                    return { ...d, count: Math.ceil(exam.totalQuestions * (d.percentage / 100)) };
                }
                return d;
            });
        }

        for (const dist of distribution) {
          const sectionQuestions = await db.getQuestionsBySection(dist.sectionId);
          // Shuffle then take the required count
          const shuffled = sectionQuestions.sort(() => Math.random() - 0.5).slice(0, dist.count || 1);
          allQuestions.push(...shuffled);
        }

        // Final shuffle and trim to match EXACTLY totalQuestions
        // We shuffle the combined list to ensure that if we have "extra" questions due to rounding, 
        // they are trimmed randomly but we still hit the target count.
        return allQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, exam.totalQuestions);
      }),
  }),

  // Exam Codes
  examCodes: router({
    create: adminProcedure
      .input(z.object({
        examId: z.number().optional(),
        maxUses: z.number().optional(),
        expiresAt: z.date().optional(),
        pointsValue: z.number().optional(),
        type: z.enum(["exam", "points"]).default("exam"),
      }))
      .mutation(async ({ input }) => {
        const code = nanoid(10).toUpperCase();
        return db.createExamCode({
          examId: input.examId || 0,
          code,
          maxUses: input.maxUses || 1,
          expiresAt: input.expiresAt,
          pointsValue: input.pointsValue || 0,
          type: input.type,
          isActive: true,
        });
      }),

    generate: adminProcedure
      .input(z.object({
        examId: z.number().optional(),
        quantity: z.number().min(1).max(100),
        maxUses: z.number().optional(),
        expiresAt: z.date().optional(),
        pointsValue: z.number().optional(),
        type: z.enum(["exam", "points"]).default("exam"),
      }))
      .mutation(async ({ input }) => {
        const results = [];
        for (let i = 0; i < input.quantity; i++) {
          const code = nanoid(10).toUpperCase();
          const result = await db.createExamCode({
            examId: input.examId || 0,
            code,
            maxUses: input.maxUses || 1,
            expiresAt: input.expiresAt,
            pointsValue: input.pointsValue || 0,
            type: input.type,
            isActive: true,
          });
          results.push(result);
        }
        return results;
      }),

    redeemPoints: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const examCode = await db.getExamCodeByCode(input.code);
        if (!examCode || examCode.type !== "points") {
          throw new TRPCError({ code: "NOT_FOUND", message: "كود النقاط غير صحيح" });
        }
        if (!examCode.isActive || (examCode.expiresAt && new Date() > examCode.expiresAt)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "الكود غير نشط أو منتهي الصلاحية" });
        }
        if (examCode.maxUses && examCode.currentUses && examCode.currentUses >= examCode.maxUses) {
          throw new TRPCError({ code: "FORBIDDEN", message: "تم استنفاد الكود" });
        }

        // Update user points and mark code as used
        await db.updateUserPoints(ctx.user.id, examCode.pointsValue || 0);
        await db.updateExamCode(examCode.id, { currentUses: (examCode.currentUses || 0) + 1 });
        
        return { success: true, pointsAdded: examCode.pointsValue };
      }),

    unlockWithPoints: protectedProcedure
      .input(z.object({ examId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const exam = await db.getExamById(input.examId);
        if (!exam) throw new TRPCError({ code: "NOT_FOUND", message: "الاختبار غير موجود" });
        
        const pointsRequired = exam.pointsToUnlock || 0;
        if (pointsRequired <= 0) return { success: true };

        await db.deductUserPoints(ctx.user.id, pointsRequired);
        
        // We can create a special exam code for this user or log it
        const code = `POINTS-${ctx.user.id}-${exam.id}-${Date.now()}`;
        await db.createExamCode({
          examId: exam.id,
          code,
          maxUses: 1,
          isActive: true,
          type: "exam",
        });

        return { success: true, code };
      }),

    validate: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input }) => {
        const examCode = await db.getExamCodeByCode(input.code);
        if (!examCode) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الكود غير صحيح" });
        }
        if (!examCode.isActive || (examCode.expiresAt && new Date() > examCode.expiresAt)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "الكود غير نشط أو منتهي الصلاحية" });
        }
        if (examCode.maxUses && examCode.currentUses && examCode.currentUses >= examCode.maxUses) {
          throw new TRPCError({ code: "FORBIDDEN", message: "تم استنفاد الكود" });
        }
        return { valid: true, examId: examCode.examId, id: examCode.id };
      }),

    use: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input }) => {
        const examCode = await db.getExamCodeByCode(input.code);
        if (!examCode) throw new TRPCError({ code: "NOT_FOUND" });
        return db.updateExamCode(examCode.id, { 
          currentUses: (examCode.currentUses || 0) + 1 
        });
      }),

    getByExam: adminProcedure
      .input(z.object({ examId: z.number() }))
      .query(({ input }) => db.getExamCodesByExam(input.examId)),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteExamCode(input.id)),
  }),

  // Exam Results
  results: router({
    submit: protectedProcedure
      .input(z.object({
        examId: z.number(),
        answers: z.array(z.object({
          questionId: z.number(),
          selectedOptionId: z.string(),
        })),
        examCodeId: z.number().optional(),
        startedAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        const exam = await db.getExamById(input.examId);
        if (!exam) throw new TRPCError({ code: "NOT_FOUND" });

        // Calculate scores
        let totalCorrect = 0;
        const processedAnswers: { questionId: number; selectedOptionId: string; isCorrect: boolean; sectionId: number }[] = [];
        const sectionStats: Record<number, { correct: number; total: number }> = {};

        const sections = exam.sectionDistribution as { sectionId: number; count: number }[];
        for (const dist of sections) {
          const sectionQuestions = await db.getQuestionsBySection(dist.sectionId);
          const questionMap = new Map(sectionQuestions.map(q => [q.id, q]));
          
          sectionStats[dist.sectionId] = { correct: 0, total: 0 };

          for (const answer of input.answers) {
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

        const totalScore = input.answers.length > 0 ? (totalCorrect / input.answers.length) * 100 : 0;
        const sectionScores = Object.entries(sectionStats).map(([sectionId, stats]) => ({
          sectionId: parseInt(sectionId),
          score: stats.correct,
          percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
        }));

        const result = await db.createExamResult({
          examId: input.examId,
          userId: ctx.user.id,
          examCodeId: input.examCodeId,
          totalScore: totalScore.toFixed(2) as any,
          sectionScores: sectionScores as any,
          answers: processedAnswers as any,
          startedAt: input.startedAt,
          completedAt: new Date(),
        });

        return result;
      }),

    getByUser: protectedProcedure
      .query(({ ctx }) => db.getExamResultsByUser(ctx.user.id)),
  }),

  // Assessment Texts
  assessmentTexts: router({
    create: adminProcedure
      .input(z.object({
        examId: z.number(),
        minScore: z.number(),
        maxScore: z.number(),
        text: z.string(),
        sectionConditions: z.array(z.object({ sectionId: z.number(), minScore: z.number(), maxScore: z.number(), text: z.string() })).optional(),
      }))
      .mutation(({ input }) => db.createAssessmentText(input)),

    getByExam: publicProcedure
      .input(z.object({ examId: z.number() }))
      .query(({ input }) => db.getAssessmentTextsByExam(input.examId)),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteAssessmentText(input.id)),
  }),

  // Settings
  settings: router({
    getAll: publicProcedure.query(() => db.getAllSettings()),
    get: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(({ input }) => db.getSetting(input.key)),
    update: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(({ input }) => db.updateSetting(input.key, input.value)),
  }),
});