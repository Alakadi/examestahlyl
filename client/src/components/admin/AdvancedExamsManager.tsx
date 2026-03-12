import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Settings } from "lucide-react";
import { toast } from "sonner";

export default function AdvancedExamsManager() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "free" as "free" | "paid",
    totalQuestions: 50,
    timeLimit: 60,
    passingScore: 60,
  });

  const { data: subjects } = trpc.subjects.getAll.useQuery();
  const { data: exams } = trpc.exams.getBySubject.useQuery(
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
      setIsCreating(false);
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

    createExamMutation.mutate({
      subjectId: selectedSubject,
      ...formData,
      sectionDistribution: [], // سيتم تحديثه لاحقاً
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-gray-300 mb-2 block">اختر المادة</label>
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
        <>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
                <Plus className="w-4 h-4 ml-2" />
                إنشاء اختبار جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">إنشاء اختبار جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300">اسم الاختبار</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    placeholder="مثال: اختبار الفصل الأول"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300">نوع الاختبار</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="radio"
                        checked={formData.type === "free"}
                        onChange={() => setFormData({ ...formData, type: "free" })}
                      />
                      مجاني
                    </label>
                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="radio"
                        checked={formData.type === "paid"}
                        onChange={() => setFormData({ ...formData, type: "paid" })}
                      />
                      مدفوع
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <label className="text-sm text-gray-300">الوقت المسموح (دقيقة)</label>
                    <Input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                      className="bg-slate-800 border-slate-600 text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-300">درجة النجاح (%)</label>
                  <Input
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                  />
                </div>

                <Button
                  onClick={handleCreateExam}
                  disabled={createExamMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createExamMutation.isPending ? "جاري الإنشاء..." : "إنشاء الاختبار"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams && exams.length > 0 ? (
              exams.map((exam) => (
                <Card key={exam.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{exam.title}</h3>
                      <span className={`text-xs font-semibold mt-1 inline-block px-2 py-1 rounded ${
                        exam.type === "free"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-pink-900/30 text-pink-400"
                      }`}>
                        {exam.type === "free" ? "مجاني" : "مدفوع"}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-blue-400">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>عدد الأسئلة: {exam.totalQuestions}</p>
                    <p>الوقت المسموح: {exam.timeLimit} دقيقة</p>
                    <p>درجة النجاح: {exam.passingScore}%</p>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="col-span-full bg-slate-900 border border-slate-700 p-8 text-center">
                <p className="text-gray-400">لا توجد اختبارات حالياً</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
