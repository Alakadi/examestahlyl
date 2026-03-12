import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AdvancedCodesManager() {
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 10,
    expiryDays: 30,
  });

  const { data: exams } = trpc.exams.getAll.useQuery();
  const { data: codes } = trpc.codes.getByExam.useQuery(
    { examId: selectedExam || 0 },
    { enabled: !!selectedExam }
  );

  const generateCodesMutation = trpc.codes.generate.useMutation({
    onSuccess: (data: any) => {
      toast.success(`تم إنشاء ${data.length} كود بنجاح`);
      setFormData({ quantity: 10, expiryDays: 30 });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleGenerateCodes = () => {
    if (!selectedExam) {
      toast.error("الرجاء اختيار اختبار");
      return;
    }
    generateCodesMutation.mutate({
      examId: selectedExam,
      quantity: formData.quantity,
      expiryDays: formData.expiryDays,
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-gray-300 mb-2 block">اختر الاختبار المدفوع</label>
        <select
          value={selectedExam || ""}
          onChange={(e) => setSelectedExam(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
        >
          <option value="">-- اختر اختبار --</option>
          {exams?.filter((e: any) => e.type === "paid").map((exam: any) => (
            <option key={exam.id} value={exam.id}>
              {exam.title}
            </option>
          ))}
        </select>
      </div>

      {selectedExam && (
        <>
          <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
                <Plus className="w-4 h-4 ml-2" />
                إنشاء أكواد جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">إنشاء أكواد الاختبار</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300">عدد الأكواد</label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    min="1"
                    max="1000"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300">صلاحية الكود (أيام)</label>
                  <Input
                    type="number"
                    value={formData.expiryDays}
                    onChange={(e) => setFormData({ ...formData, expiryDays: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    min="1"
                  />
                </div>

                <Button
                  onClick={handleGenerateCodes}
                  disabled={generateCodesMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generateCodesMutation.isPending ? "جاري الإنشاء..." : "إنشاء الأكواد"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">الأكواد المتاحة</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCodes(!showCodes)}
              className="border-slate-700 text-gray-300 hover:bg-slate-800"
            >
              {showCodes ? (
                <>
                  <EyeOff className="w-4 h-4 ml-2" />
                  إخفاء
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 ml-2" />
                  عرض
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {codes && codes.length > 0 ? (
              codes.map((code: any) => (
                <Card
                  key={code.id}
                  className={`bg-slate-800 border border-slate-700 p-4 ${
                    code.isUsed ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-400">الكود</p>
                      <p className="font-mono text-white font-bold text-lg">
                        {showCodes ? code.code : "••••••••"}
                      </p>
                    </div>
                    {showCodes && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(code.code)}
                        className="text-gray-400 hover:text-blue-400"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-gray-400 mb-3">
                    <p>الحالة: <span className={code.isUsed ? "text-red-400" : "text-green-400"}>
                      {code.isUsed ? "مستخدم" : "متاح"}
                    </span></p>
                    <p>ينتهي في: {new Date(code.expiryDate).toLocaleDateString("ar-SA")}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                </Card>
              ))
            ) : (
              <Card className="col-span-full bg-slate-900 border border-slate-700 p-8 text-center">
                <p className="text-gray-400">لا توجد أكواد حالياً</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
