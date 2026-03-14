import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AdvancedCodesManager() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 10,
    expiryDays: 30,
  });

  const { data: subjects } = trpc.subjects.getAll.useQuery();
  const { data: exams } = trpc.exams.getBySubject.useQuery(
    { subjectId: selectedSubject || 0 },
    { enabled: !!selectedSubject }
  );

  const { data: codes, refetch: refetchCodes } = trpc.examCodes.getByExam.useQuery(
    { examId: selectedExam || 0 },
    { enabled: !!selectedExam }
  );

  const pointsEnabled = trpc.settings.get.useQuery({ key: "points_enabled" }).data === "true";

  const generateCodesMutation = trpc.examCodes.generate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الأكواد بنجاح");
      setFormData({ quantity: 10, expiryDays: 30 });
      setIsGenerating(false);
      refetchCodes();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const deleteCodeMutation = trpc.examCodes.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الكود بنجاح");
      refetchCodes();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    }
  });

  const handleGenerateCodes = () => {
    if (!selectedExam) {
      toast.error("الرجاء اختيار اختبار");
      return;
    }
    generateCodesMutation.mutate({
      examId: selectedExam,
      quantity: formData.quantity,
      maxUses: 1, // Defaulting to 1 as per user's "single use" requirement
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-300 mb-2 block">1. اختر المادة</label>
          <select
            value={selectedSubject || ""}
            onChange={(e) => {
                setSelectedSubject(e.target.value ? Number(e.target.value) : null);
                setSelectedExam(null);
            }}
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

        <div>
          <label className="text-sm font-semibold text-gray-300 mb-2 block">2. اختر الاختبار المدفوع</label>
          <select
            disabled={!selectedSubject}
            value={selectedExam || ""}
            onChange={(e) => setSelectedExam(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white disabled:opacity-50"
          >
            <option value="">-- اختر اختبار --</option>
            {exams?.filter((e: any) => e.type === "paid" || (pointsEnabled && e.pointsToUnlock > 0)).map((exam: any) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedExam && (
        <>
          <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-4 rounded-xl">
             <div className="flex items-center gap-3">
                 <h3 className="text-white font-bold">إدارة الأكواد</h3>
                 <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                     {codes?.length || 0} كود
                 </span>
             </div>
             
             <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
                <DialogTrigger asChild>
                <Button className="bg-linear-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 text-white shadow-lg shadow-pink-600/20">
                    <Plus className="w-4 h-4 ml-2" />
                    إنشاء أكواد
                </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white">إنشاء أكواد دفع جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="p-3 bg-pink-900/10 border border-pink-500/20 rounded-lg text-xs text-pink-400">
                        سيتم إنشاء أكواد صالحة للاستخدام مرة واحدة فقط لهذا الاختبار.
                    </div>
                    <div>
                    <label className="text-sm text-gray-300 block mb-1">عدد الأكواد المطلوب إنتاجها</label>
                    <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        className="bg-slate-800 border-slate-600 text-white"
                        min="1"
                        max="100"
                    />
                    </div>

                    <Button
                    onClick={handleGenerateCodes}
                    disabled={generateCodesMutation.isPending}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white h-12"
                    >
                    {generateCodesMutation.isPending ? "جاري المعالجة..." : "تأكيد الإنشاء"}
                    </Button>
                </div>
                </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center justify-between mt-6">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">قائمة الأكواد</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCodes(!showCodes)}
              className="text-gray-400 hover:text-white"
            >
              {showCodes ? (
                <>
                  <EyeOff className="w-4 h-4 ml-2" />
                  إخفاء الأكواد
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 ml-2" />
                  عرض الأكواد
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {codes && codes.length > 0 ? (
              codes.map((code: any) => {
                const consumed = code.currentUses >= (code.maxUses || 1);
                return (
                    <Card
                    key={code.id}
                    className={`bg-slate-900 border border-slate-800 p-4 transition-all hover:border-slate-700 ${
                        consumed ? "opacity-60 saturate-50" : "shadow-lg shadow-black/20"
                    }`}
                    >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">كود الدخول</p>
                        <div className="flex items-center gap-2">
                            <p className={`font-mono font-bold text-lg tracking-wider ${consumed ? 'text-gray-500 line-through' : 'text-white'}`}>
                                {showCodes ? code.code : "••••••••"}
                            </p>
                            {showCodes && !consumed && (
                                <button
                                    onClick={() => copyToClipboard(code.code)}
                                    className="p-1 hover:bg-slate-800 rounded text-gray-500 hover:text-blue-400 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            consumed 
                            ? "bg-red-900/20 text-red-500 border border-red-500/20" 
                            : "bg-green-900/20 text-green-500 border border-green-500/20"
                        }`}>
                            {consumed ? "مستخدم" : "متاح"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-800">
                        <div className="text-[10px] text-gray-500">
                            ID: #{code.id}
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCodeMutation.mutate({ id: code.id })}
                            disabled={deleteCodeMutation.isPending}
                            className="h-8 text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                            حذف
                        </Button>
                    </div>
                </Card>
                );
              })
            ) : (
              <Card className="col-span-full border-dashed border-slate-800 bg-slate-900/50 p-12 text-center text-gray-500">
                لا توجد أكواد لهذا الاختبار. ابدأ بإنشاء مجموعة جديدة!
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
