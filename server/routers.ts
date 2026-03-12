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

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteSubject(input.id)),
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
      .query(({ input }) => db.getSubjectById(input.id)),

    getBySubject: publicProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(({ input }) => db.getExamsBySubject(input.subjectId)),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteExam(input.id)),

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

        return { examId: examCode.examId, valid: true, id: examCode.id };
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
