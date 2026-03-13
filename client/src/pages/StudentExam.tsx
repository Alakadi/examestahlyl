import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, HelpCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AIChatBox } from "@/components/AIChatBox";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Clock, CheckCircle2, XCircle, MessageSquare, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentExam() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const examId = parseInt(id || "0");

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [startedAt] = useState(new Date());
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Prevent accidental exit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // We don't have isSubmitting here, but we can check if it's not the last step or results page
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleExitRequest = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    navigate("/", { replace: true });
  };

  const examQuery = trpc.exams.getById.useQuery({ id: examId });
  const questionsQuery = trpc.exams.getQuestions.useQuery({ examId });
  const submitMutation = trpc.results.submit.useMutation({
    onSuccess: (data) => {
      toast.success("تم تسليم الاختبار بنجاح");
      navigate(`/results/${data[0].id}`);
    },
    onError: (error) => {
      toast.error(`فشل تسليم الاختبار: ${error.message}`);
    }
  });

  const questions = questionsQuery.data || [];
  const currentQuestion = questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;

  if (examQuery.isLoading || questionsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!examQuery.data || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <HelpCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {!examQuery.data ? "الاختبار غير موجود" : "لا توجد أسئلة متوفرة"}
        </h2>
        <p className="text-gray-400 mb-8 max-w-md">
          {!examQuery.data 
            ? "عذراً، لم نتمكن من العثور على الاختبار المطلوب." 
            : "هذا الاختبار لا يحتوي على أسئلة حالياً. يرجى مراجعة الإدارة."}
        </p>
        <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-xl">
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  const handleSelectOption = (optionId: string) => {
    if (showFeedback) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
  };

  const handleConfirm = () => {
    if (!answers[currentQuestion.id]) {
      toast.error("الرجاء اختيار إجابة أولاً");
      return;
    }
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const submissionAnswers = questions.map(q => ({
        questionId: q.id,
        selectedOptionId: answers[q.id] || "",
      }));
      submitMutation.mutate({
        examId,
        answers: submissionAnswers,
        startedAt,
      });
    } else {
      setCurrentQuestionIdx(prev => prev + 1);
      setShowFeedback(false);
      setShowExplanation(false);
    }
  };

  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold text-white">{examQuery.data.title}</h1>
          <Button variant="outline" className="border-slate-700 text-gray-400" onClick={handleExitRequest}> {/* Changed onClick */}
            إنهاء الاختبار
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>السؤال {currentQuestionIdx + 1} من {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div 
              className="bg-linear-to-r from-blue-600 to-cyan-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <Card className="bg-slate-900 border border-slate-700 p-6 md:p-10 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
          
          <h2 className="text-xl md:text-2xl font-bold text-white mb-8 leading-relaxed text-right">
            {currentQuestion.text}
          </h2>

          {/* Options */}
          <div className="space-y-4 mb-8">
            {(currentQuestion.options as {id: string, text: string}[]).map((option) => {
              const isSelected = answers[currentQuestion.id] === option.id;
              const isCorrect = option.id === currentQuestion.correctOptionId;
              
              let variantClasses = "border-slate-700 bg-slate-800 hover:border-slate-600";
              if (showFeedback) {
                if (isCorrect) variantClasses = "border-green-500 bg-green-500/10";
                else if (isSelected) variantClasses = "border-red-500 bg-red-500/10";
              } else if (isSelected) {
                variantClasses = "border-blue-500 bg-blue-500/10";
              }

              return (
                <button
                  key={option.id}
                  disabled={showFeedback}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full p-5 rounded-xl border-2 transition-all text-right flex items-center justify-between group ${variantClasses}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600 text-gray-400 group-hover:border-slate-400'}`}>
                      {option.id}
                    </span>
                    <span className="text-white font-medium">{option.text}</span>
                  </div>
                  {showFeedback && isCorrect && <span className="text-green-500">✓</span>}
                  {showFeedback && isSelected && !isCorrect && <span className="text-red-500">✕</span>}
                </button>
              );
            })}
          </div>

          {/* Feedback & Actions */}
          {showFeedback && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className={`p-4 rounded-xl border flex items-center gap-4 ${answers[currentQuestion.id] === currentQuestion.correctOptionId ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className={`p-2 rounded-lg ${answers[currentQuestion.id] === currentQuestion.correctOptionId ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <HelpCircle className={`w-5 h-5 ${answers[currentQuestion.id] === currentQuestion.correctOptionId ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <p className={`font-bold ${answers[currentQuestion.id] === currentQuestion.correctOptionId ? 'text-green-400' : 'text-red-400'}`}>
                  {answers[currentQuestion.id] === currentQuestion.correctOptionId ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
                </p>
              </div>

              {showExplanation && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-in zoom-in-95">
                  <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    الشرح التعليمي
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {currentQuestion.explanation || "لا يوجد شرح متوفر لهذا السؤال حالياً."}
                  </p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4">
                <Button
                  onClick={handleNext}
                  disabled={submitMutation.isPending}
                  className="flex-3 bg-linear-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-6 text-lg rounded-xl"
                >
                  {submitMutation.isPending ? <Loader2 className="animate-spin" /> : (isLastQuestion ? "إنهاء وتسليم الاختبار" : "السؤال التالي")}
                  {!isLastQuestion && <ChevronLeft className="mr-2 w-5 h-5" />}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex-1 border-slate-700 text-gray-300 hover:bg-slate-800 py-6 rounded-xl"
                >
                  {showExplanation ? "إخفاء التوضيح" : "عرض التوضيح"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setIsChatOpen(true)}
                  className="flex-1 border-slate-700 text-gray-300 hover:bg-slate-800 py-6 rounded-xl flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  اسأل الذكاء
                </Button>
              </div>
            </div>
          )}

          {!showFeedback && (
            <Button
              onClick={handleConfirm}
              disabled={!answers[currentQuestion.id]}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-xl shadow-lg shadow-blue-500/20"
            >
              تأكيد الإجابة
            </Button>
          )}
        </Card>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
            <p className="text-gray-500 text-xs mb-1">المادة</p>
            <p className="text-white text-sm font-medium">{examQuery.data.title}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
            <p className="text-gray-500 text-xs mb-1">الوقت المتبقي</p>
            <p className="text-white text-sm font-medium">غير محدد</p>
          </div>
        </div>
      </div>

      {/* AI Chat Drawer/Dialog */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl h-[80vh] rounded-t-2xl md:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-white font-bold">مساعد الذكاء الاصطناعي</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">✕</Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIChatBox 
                chatId={`exam-${id}-q-${currentQuestion.id}`}
                initialMessages={[
                  {
                    id: 'system-1',
                    role: 'assistant',
                    parts: [{ type: 'text', text: `مرحباً! أنا مساعدك الذكي. السؤال الحالي هو: "${currentQuestion.text}". كيف يمكنني مساعدتك في فهمه؟` }]
                  }
                ]}
                placeholder="اسأل عن شرح السؤال أو الخيارات..."
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}
      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>هل أنت متأكد من الخروج؟</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-400 text-sm">
            <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-500/20 rounded-lg text-red-400 mb-4">
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
                <p>إذا خرجت الآن، فسوف تخسر تقدمك في هذا الاختبار. بالنسبة للاختبارات المدفوعة، قد تحتاج لاستخدام كود جديد للدخول مرة أخرى.</p>
            </div>
            <p>هل تريد حقاً إنهاء الاختبار والعودة للصفحة الرئيسية؟</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
                variant="destructive" 
                className="flex-1 font-bold h-12 rounded-xl"
                onClick={confirmExit}
            >
                نعم، اخرج الآن
            </Button>
            <Button 
                variant="outline" 
                className="flex-1 border-slate-700 hover:bg-slate-800 text-white h-12 rounded-xl"
                onClick={() => setShowExitConfirm(false)}
            >
                لا، أكمل الاختبار
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
