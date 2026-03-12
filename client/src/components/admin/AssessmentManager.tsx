import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AssessmentManager() {
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    minScore: 0,
    maxScore: 100,
    text: "",
  });

  const { data: exams } = trpc.exams.getAll.useQuery();
  const { data: assessments, refetch: refetchAssessments } = trpc.assessmentTexts.getByExam.useQuery(
    { examId: selectedExam || 0 },
    { enabled: !!selectedExam }
  );

  const createMutation = trpc.assessmentTexts.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة نص التقييم بنجاح");
      setFormData({ minScore: 0, maxScore: 100, text: "" });
      setIsCreating(false);
      refetchAssessments();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const deleteMutation = trpc.assessmentTexts.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف نص التقييم");
      refetchAssessments();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleCreate = () => {
    if (!selectedExam) {
      toast.error("الرجاء اختيار اختبار");
      return;
    }

    if (formData.minScore < 0 || formData.maxScore > 100 || formData.minScore >= formData.maxScore) {
      toast.error("يرجى التحقق من نطاق الدرجات");
      return;
    }

    if (!formData.text.trim()) {
      toast.error("يرجى إدخال نص التقييم");
      return;
    }

    createMutation.mutate({
      examId: selectedExam,
      minScore: formData.minScore,
      maxScore: formData.maxScore,
      text: formData.text,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("هل تريد حذف هذا النص التقييمي؟")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Select Exam */}
      <div className="space-y-2">
        <label className="text-white font-medium">اختر الاختبار</label>
        <select
          value={selectedExam || ""}
          onChange={(e) => setSelectedExam(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none"
        >
          <option value="">-- اختر اختبار --</option>
          {exams?.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.title}
            </option>
          ))}
        </select>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
            <Plus className="w-4 h-4 ml-2" />
            إضافة نص تقييم
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>إضافة نص تقييم جديد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">الحد الأدنى للدرجة</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minScore}
                  onChange={(e) => setFormData({ ...formData, minScore: parseInt(e.target.value) || 0 })}
                  className="bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">الحد الأقصى للدرجة</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
                  className="bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">نص التقييم</label>
              <Textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="أدخل نص التقييم الذي سيظهر للطالب..."
                className="bg-slate-800 border border-slate-700 text-white min-h-32"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsCreating(false)}
                className="text-gray-400"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessments List */}
      {selectedExam ? (
        assessments && assessments.length > 0 ? (
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="bg-slate-900 border border-slate-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-white font-bold">
                      {assessment.minScore}% - {assessment.maxScore}%
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">{assessment.text}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(assessment.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900/50 border-dashed border-slate-700 p-12 text-center">
            <p className="text-gray-500">لا توجد نصوص تقييم لهذا الاختبار</p>
          </Card>
        )
      ) : (
        <Card className="bg-slate-900/50 border-dashed border-slate-700 p-12 text-center">
          <p className="text-gray-500">اختر اختبار لعرض نصوص التقييم</p>
        </Card>
      )}
    </div>
  );
}
