import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Play, Loader2, ChevronRight, BookOpen, Layers } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const subjectId = parseInt(id || "0");
  
  const [showCodeInput, setShowCodeInput] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const subjectQuery = trpc.subjects.getById.useQuery({ id: subjectId });
  const examsQuery = trpc.exams.getBySubject.useQuery({ subjectId });
  const sectionsQuery = trpc.sections.getBySubject.useQuery({ subjectId });
  const validateCodeMutation = trpc.examCodes.validate.useMutation();

  if (subjectQuery.isLoading || examsQuery.isLoading || sectionsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const subject = subjectQuery.data;
  const exams = examsQuery.data || [];
  const sections = sectionsQuery.data || [];

  if (!subject) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">المادة غير موجودة</h2>
        <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
      </div>
    );
  }

  const useCodeMutation = trpc.examCodes.use.useMutation();

  const handleValidateCode = async (examId: number) => {
    if (!code.trim()) {
      toast.error("يرجى إدخال الكود أولاً");
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateCodeMutation.mutateAsync({ code });
      if (result.valid && result.examId === examId) {
        // Mark the code as used
        await useCodeMutation.mutateAsync({ code });
        toast.success("تم التحقق من الكود بنجاح");
        navigate(`/exam/${examId}?code=${code}`);
      } else {
        toast.error("هذا الكود غير مخصص لهذا الاختبار");
      }
    } catch (error: any) {
      toast.error(error.message || "الكود غير صحيح أو منتهي الصلاحية");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-8">
          <button onClick={() => navigate("/")} className="hover:text-white transition">الرئيسية</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-blue-400 font-medium">{subject.title}</span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/20`}>
            {subject.icon || "📚"}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{subject.title}</h1>
            <p className="text-xl text-gray-400 leading-relaxed max-w-3xl">
              {subject.description || "استكشف هذه المادة وقم بإجراء الاختبارات لتقييم مستواك المعرفي."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Exams Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Play className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-white">الاختبارات المتاحة</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {exams.length === 0 ? (
                  <Card className="bg-slate-900/50 border-dashed border-slate-700 p-12 text-center">
                    <p className="text-gray-500">لا توجد اختبارات متاحة لهذه المادة حالياً.</p>
                  </Card>
                ) : (
                  exams.map((exam) => (
                    <Card key={exam.id} className={`bg-slate-900 border ${exam.type === 'paid' ? 'border-pink-500/30 hover:border-pink-500' : 'border-slate-700 hover:border-blue-500'} p-6 transition-all group relative overflow-hidden`}>
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition">{exam.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${exam.type === 'paid' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                              {exam.type === 'paid' ? 'مدفوع' : 'مجاني'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{exam.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              <span>{exam.totalQuestions} سؤال</span>
                            </div>
                            {exam.timeLimit && (
                              <div className="flex items-center gap-1">
                                <span className="w-3 h-3 border border-gray-500 rounded-full flex items-center justify-center text-[8px]">T</span>
                                <span>{exam.timeLimit} دقيقة</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-center min-w-[160px]">
                          {exam.type === 'free' ? (
                            <Button 
                              onClick={() => navigate(`/exam/${exam.id}`)}
                              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-600/20"
                            >
                              <Play className="w-4 h-4 ml-2" />
                              ابدأ الاختبار
                            </Button>
                          ) : (
                            showCodeInput === exam.id ? (
                              <div className="space-y-2 animate-in fade-in slide-in-from-right-2">
                                <input
                                  autoFocus
                                  type="text"
                                  value={code}
                                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                                  placeholder="أدخل الكود"
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-sm focus:border-pink-500 outline-none"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm"
                                    disabled={isValidating}
                                    onClick={() => handleValidateCode(exam.id)}
                                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs"
                                  >
                                    {isValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : "تأكيد"}
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="ghost" 
                                    onClick={() => setShowCodeInput(null)}
                                    className="text-gray-400 text-xs"
                                  >
                                    إلغاء
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button 
                                onClick={() => setShowCodeInput(exam.id)}
                                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                              >
                                <Lock className="w-4 h-4 ml-2 text-pink-500" />
                                فتح الاختبار
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Sections List */}
            <Card className="bg-slate-900 border border-slate-800 p-6 sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <Layers className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-white">محتوى المادة</h3>
              </div>
              
              <div className="space-y-4">
                {sections.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">لا توجد أقسام معرفة بعد.</p>
                ) : (
                  sections.sort((a, b) => (a.order || 0) - (b.order || 0)).map((section, idx) => (
                    <div key={section.id} className="flex items-center gap-4 group">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {idx + 1}
                      </div>
                      <div className="flex-1 border-b border-slate-800 pb-2">
                        <h4 className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">{section.title}</h4>
                        <p className="text-gray-500 text-[10px] mt-1 line-clamp-1">{section.description || "لا يوجد وصف"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <h4 className="text-blue-400 text-xs font-bold mb-2 uppercase tracking-wider">نصيحة ذكية</h4>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  نوصي بالبدء بالاختبارات المجانية أولاً لتقييم مستواك الأساسي قبل الانتقال للاختبارات المتقدمة.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
