import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdvancedExamsManager() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sectionDistribution, setSectionDistribution] = useState<Record<number, number>>({});
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "free" as "free" | "paid",
    totalQuestions: 50,
    timeLimit: 60,
    passingScore: 60,
  });

  const { data: subjects } = trpc.subjects.getAll.useQuery();
  const { data: exams, refetch: refetchExams } = trpc.exams.getBySubject.useQuery(
    { subjectId: selectedSubject || 0 },
    { enabled: !!selectedSubject }
  );

  const { data: availableQuestionsCount } = trpc.subjects.getQuestionCount.useQuery(
    { subjectId: selectedSubject || 0 },
    { enabled: !!selectedSubject }
  );

  const { data: sections } = trpc.sections.getBySubject.useQuery(
    { subjectId: selectedSubject || 0 },
    { enabled: !!selectedSubject }
  );

  const createExamMutation = trpc.exams.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الاختبار بنجاح");
      setFormData({
        title: "",
        description: "",
        type: "free",
        totalQuestions: 50,
        timeLimit: 60,
        passingScore: 60,
      });
      setSectionDistribution({});
      setIsCreating(false);
      refetchExams();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleCreateExam = () => {
    if (!selectedSubject || !formData.title.trim()) {
      toast.error("الرجاء اختيار مادة وإدخال اسم الاختبار");
      return;
    }

    if (formData.totalQuestions > (availableQuestionsCount || 0)) {
        toast.error(`لا يمكنك طلب ${formData.totalQuestions} سؤال بينما المتوفر في المادة هو ${availableQuestionsCount} فقط.`);
        return;
    }

    const totalPercentage = Object.values(sectionDistribution).reduce((a, b) => a + b, 0);
    if (totalPercentage !== 100 && Object.keys(sectionDistribution).length > 0) {
      toast.error("يجب أن يكون مجموع النسب المئوية للأقسام 100%");
      return;
    }

    createExamMutation.mutate({
      subjectId: selectedSubject,
      ...formData,
      sectionDistribution: Object.entries(sectionDistribution).map(([sectionId, percentage]) => ({
        sectionId: Number(sectionId),
        percentage,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="text-sm font-semibold text-gray-300 mb-2 block">اختر المادة للإدارة</label>
          <select
            value={selectedSubject || ""}
            onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          >
            <option value="">-- اختر مادة --</option>
            {subjects?.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
          </select>
        </div>
        {selectedSubject && (
            <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-lg">
                <p className="text-xs text-blue-400">
                    الأسئلة المتوفرة: <span className="font-bold text-white">{availableQuestionsCount ?? "..."}</span>
                </p>
            </div>
        )}
      </div>

      {selectedSubject && (
        <>
          <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-4 rounded-xl">
            <h2 className="text-white font-bold">الاختبارات الحالية</h2>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                <Button className="bg-linear-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
                    <Plus className="w-4 h-4 ml-2" />
                    إنشاء اختبار جديد
                </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white">إنشاء اختبار جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <label className="text-sm text-gray-300">اسم الاختبار</label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="bg-slate-800 border-slate-600 text-white mt-1"
                            placeholder="مثال: الاختبار الفتري الأول"
                        />
                        </div>

                        <div>
                        <label className="text-sm text-gray-300">نوع الاختبار</label>
                        <div className="flex gap-4 mt-2">
                            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                            <input
                                type="radio"
                                checked={formData.type === "free"}
                                onChange={() => setFormData({ ...formData, type: "free" })}
                                className="accent-blue-500"
                            />
                            مجاني
                            </label>
                            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                            <input
                                type="radio"
                                checked={formData.type === "paid"}
                                onChange={() => setFormData({ ...formData, type: "paid" })}
                                className="accent-blue-500"
                            />
                            مدفوع
                            </label>
                        </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                        <label className="text-sm text-gray-300">عدد الأسئلة</label>
                        <Input
                            type="number"
                            value={formData.totalQuestions}
                            onChange={(e) => setFormData({ ...formData, totalQuestions: Number(e.target.value) })}
                            className="bg-slate-800 border-slate-600 text-white mt-1"
                        />
                        </div>
                        <div>
                        <label className="text-sm text-gray-300">الوقت (دقيقة)</label>
                        <Input
                            type="number"
                            value={formData.timeLimit}
                            onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                            className="bg-slate-800 border-slate-600 text-white mt-1"
                        />
                        </div>
                        <div>
                        <label className="text-sm text-gray-300">النجاح (%)</label>
                        <Input
                            type="number"
                            value={formData.passingScore}
                            onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                            className="bg-slate-800 border-slate-600 text-white mt-1"
                        />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-white mb-3">توزيع الأسئلة حسب الأقسام (%)</h4>
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
                            {sections?.map((section) => (
                                <div key={section.id} className="flex items-center justify-between gap-4">
                                    <span className="text-xs text-gray-400 flex-1 truncate">{section.title}</span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={sectionDistribution[section.id] || ""}
                                            onChange={(e) => setSectionDistribution({
                                                ...sectionDistribution,
                                                [section.id]: Number(e.target.value)
                                            })}
                                            className="w-20 bg-slate-900 border-slate-600 text-center h-8 text-xs"
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-500">%</span>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                                <span className="text-xs font-bold text-white">الإجمالي:</span>
                                <span className={`text-xs font-bold ${Object.values(sectionDistribution).reduce((a, b) => a + b, 0) === 100 ? 'text-green-500' : 'text-red-500'}`}>
                                    {Object.values(sectionDistribution).reduce((a, b) => a + b, 0)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                    onClick={handleCreateExam}
                    disabled={createExamMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
                    >
                    {createExamMutation.isPending ? "جاري الإنشاء..." : "حفظ وإنشاء الاختبار"}
                    </Button>
                </div>
                </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {exams && exams.length > 0 ? (
              exams.map((exam) => (
                <Card key={exam.id} className="bg-linear-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 hover:border-slate-700 transition group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition mb-1">{exam.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            exam.type === "free"
                            ? "bg-green-900/20 text-green-400 border-green-500/20"
                            : "bg-pink-900/20 text-pink-400 border-pink-500/20"
                        }`}>
                            {exam.type === "free" ? "مجاني" : "مدفوع"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                             ID: #{exam.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-white hover:bg-slate-800">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-6">
                    <div className="bg-slate-800/30 p-2 rounded">
                        <span className="block text-gray-500 mb-1">الأسئلة</span>
                        <span className="text-white font-medium">{exam.totalQuestions}</span>
                    </div>
                    <div className="bg-slate-800/30 p-2 rounded">
                        <span className="block text-gray-500 mb-1">الوقت</span>
                        <span className="text-white font-medium">{exam.timeLimit} د</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 text-gray-300 h-9"
                    >
                        تعديل
                    </Button>
                    {exam.type === "paid" && (
                        <Button 
                            size="sm"
                            className="flex-1 text-xs bg-pink-600/10 hover:bg-pink-600 transition text-pink-500 hover:text-white h-9 border border-pink-600/30"
                            onClick={() => {
                                (window as any).setActiveAdminTab?.("codes", exam.id);
                            }}
                        >
                            الأكواد
                        </Button>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="col-span-full border-dashed border-slate-800 bg-slate-900/50 p-12 text-center text-gray-500">
                لا توجد اختبارات لهذه المادة والمستوى. ابدأ بإنشاء واحد!
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
