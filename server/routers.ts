import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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

    getByCreator: protectedProcedure
      .input(z.object({ createdBy: z.number() }))
      .query(({ input }) => db.getSubjectsByCreator(input.createdBy)),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const subject = await db.getSubjectById(input.id);
        if (!subject) throw new TRPCError({ code: "NOT_FOUND" });
        // Update logic would go here
        return subject;
      }),
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

    getQuestions: publicProcedure
      .input(z.object({ examId: z.number() }))
      .query(async ({ input }) => {
        const exam = await db.getExamById(input.examId);
        if (!exam) throw new TRPCError({ code: "NOT_FOUND" });
        
        const distribution = exam.sectionDistribution as { sectionId: number; count: number }[];
        const allQuestions: any[] = [];

        for (const dist of distribution) {
          const questions = await db.getQuestionsBySection(dist.sectionId);
          const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, dist.count);
          allQuestions.push(...shuffled);
        }

        return allQuestions.sort(() => Math.random() - 0.5);
      }),
  }),

  // Exam Codes
  examCodes: router({
    create: adminProcedure
      .input(z.object({
        examId: z.number(),
        maxUses: z.number().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const code = nanoid(10).toUpperCase();
        return db.createExamCode({
          ...input,
          code,
          isActive: true,
        });
      }),

    validate: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const examCode = await db.getExamCodeByCode(input.code);
        if (!examCode) throw new TRPCError({ code: "NOT_FOUND", message: "الكود غير صحيح" });
        
        if (!examCode.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "الكود غير نشط" });
        }

        if (examCode.expiresAt && new Date() > examCode.expiresAt) {
          throw new TRPCError({ code: "FORBIDDEN", message: "انتهت صلاحية الكود" });
        }

        if (examCode.maxUses && examCode.currentUses && examCode.currentUses >= examCode.maxUses) {
          throw new TRPCError({ code: "FORBIDDEN", message: "تم استنفاد عدد استخدامات الكود" });
        }

        return { examId: examCode.examId, valid: true };
      }),

    getByExam: adminProcedure
      .input(z.object({ examId: z.number() }))
      .query(({ input }) => db.getExamCodesByExam(input.examId)),
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
        const sectionScores: { sectionId: number; score: number; percentage: number }[] = [];
        const processedAnswers: { questionId: number; selectedOptionId: string; isCorrect: boolean }[] = [];

        for (const answer of input.answers) {
          // Fetch question to check correctness
          // This is a simplified version - in production you'd need proper question lookup
          const isCorrect = true; // Placeholder
          processedAnswers.push({
            ...answer,
            isCorrect,
          });
          if (isCorrect) totalCorrect++;
        }

        const totalScore = (totalCorrect / input.answers.length) * 100;

        const result = await db.createExamResult({
          examId: input.examId,
          userId: ctx.user.id,
          examCodeId: input.examCodeId,
          totalScore: totalScore as any,
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
        sectionConditions: z.array(z.object({
          sectionId: z.number(),
          minScore: z.number(),
          maxScore: z.number(),
          text: z.string(),
        })).optional(),
      }))
      .mutation(({ input }) => db.createAssessmentText(input)),

    getByExam: publicProcedure
      .input(z.object({ examId: z.number() }))
      .query(({ input }) => db.getAssessmentTextsByExam(input.examId)),
  }),
});

export type AppRouter = typeof appRouter;
