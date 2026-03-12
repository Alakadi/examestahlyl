import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2, Award, ArrowLeft, Share2, Target, BarChart3, HelpCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ExamResults() {
  const { resultId } = useParams<{ resultId: string }>();
  const [, navigate] = useLocation();
  const resId = parseInt(resultId || "0");

  const resultsQuery = trpc.results.getByUser.useQuery();
  
  if (resultsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const result = resultsQuery.data?.find(r => r.id === resId);

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">النتيجة غير موجودة</h2>
        <p className="text-gray-400 mb-6">عذراً، لم نتمكن من العثور على بيانات هذا الاختبار.</p>
        <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700 text-white">العودة للرئيسية</Button>
      </div>
    );
  }

  const examQuery = trpc.exams.getById.useQuery({ id: result.examId });
  const assessmentQuery = trpc.assessmentTexts.getByExam.useQuery({ examId: result.examId });

  const score = parseFloat(result.totalScore.toString());
  const isPassed = score >= (examQuery.data?.passingScore || 60);

  // Find appropriate assessment text based on total score
  const assessments = assessmentQuery.data || [];
  const mainAssessment = assessments.find(a => score >= a.minScore && score <= a.maxScore);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `نتيجتي في اختبار ${examQuery.data?.title}`,
        text: `لقد حصلت على درجة ${score}% في اختبار ${examQuery.data?.title}!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط النتيجة للمشاركة");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Navigation */}
        <div className="flex justify-between items-center mb-10">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 ml-1" />
            العودة للرئيسية
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleShare} className="border-slate-700 text-gray-300 hover:bg-slate-800 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              مشاركة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Results Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Score Card */}
            <Card className="bg-slate-900 border border-slate-700 p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
              <div className={`absolute top-0 left-0 w-full h-2 ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}></div>
              
              <div className="mb-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isPassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {isPassed ? (
                    <Award className="w-12 h-12 text-green-500" />
                  ) : (
                    <AlertCircle className="w-12 h-12 text-red-500" />
                  )}
                </div>
                <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">النتيجة النهائية</h2>
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-7xl font-black ${isPassed ? 'text-green-500' : 'text-red-500'}`}>{Math.round(score)}%</span>
                </div>
                <p className="text-white text-xl font-bold mt-4">{examQuery.data?.title}</p>
                <p className={`mt-2 font-medium ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
                  {isPassed ? "تهانينا! لقد اجتزت الاختبار بنجاح" : "لم تجتز الاختبار هذه المرة، حاول مجدداً"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-8 mt-8">
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">الأسئلة الصحيحة</p>
                  <p className="text-white text-lg font-bold">{(result.answers as any[]).filter(a => a.isCorrect).length}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">إجمالي الأسئلة</p>
                  <p className="text-white text-lg font-bold">{(result.answers as any[]).length}</p>
                </div>
              </div>
            </Card>

            {/* Assessment Message */}
            <Card className="bg-slate-900 border border-slate-700 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-bold text-white">التقييم والتوصيات</h3>
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed text-lg">
                  {mainAssessment?.text || "شكراً لإتمامك الاختبار. نتيجتك تعكس مجهوداً طيباً، استمر في الممارسة لتحقيق نتائج أفضل."}
                </p>
              </div>

              {isPassed && (
                <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Award className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-green-400 text-sm font-medium">يمكنك الآن الحصول على شهادة إتمام المستوى من لوحة التحكم.</p>
                </div>
              )}
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-8">
            {/* Section Breakdown */}
            <Card className="bg-slate-900 border border-slate-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-white">تحليل الأقسام</h3>
              </div>
              
              <div className="space-y-6">
                {(result.sectionScores as any[]).map((section, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 font-medium">القسم {idx + 1}</span>
                      <span className="text-white font-bold">{Math.round(section.percentage)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${section.percentage >= 80 ? 'bg-green-500' : section.percentage >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                        style={{ width: `${section.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Need Help? */}
            <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">هل لديك استفسار؟</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                يمكنك مراجعة أخطائك ومناقشتها مع المساعد الذكي لفهم أفضل للمواضيع التي واجهت فيها صعوبة.
              </p>
              <Button onClick={() => navigate("/")} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                استعراض الأسئلة
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
