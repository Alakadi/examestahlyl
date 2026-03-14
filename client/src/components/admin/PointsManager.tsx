import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Trash2, Eye, EyeOff, Wallet, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PointsManager() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 10,
    pointsValue: 100,
  });

  const { data: settings, refetch: refetchSettings } = trpc.settings.getAll.useQuery();
  const { data: codes, refetch: refetchCodes } = trpc.examCodes.getByExam.useQuery({ examId: 0 }); // Use examId 0 for point codes

  const updateSettingMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات");
      refetchSettings();
    },
  });

  const generateCodesMutation = trpc.examCodes.generate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء أكواد النقاط بنجاح");
      setIsGenerating(false);
      refetchCodes();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const deleteCodeMutation = trpc.examCodes.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الكود");
      refetchCodes();
    },
  });

  const handleGenerateCodes = () => {
    generateCodesMutation.mutate({
      quantity: formData.quantity,
      pointsValue: formData.pointsValue,
      type: "points",
      maxUses: 1,
    });
  };

  const toggleSetting = (key: string, currentValue: string) => {
    const newValue = currentValue === "true" ? "false" : "true";
    updateSettingMutation.mutate({ key, value: newValue });
  };

  const getSettingValue = (key: string, defaultValue: string) => {
    return settings?.find(s => s.key === key)?.value || defaultValue;
  };

  const pointsEnabled = getSettingValue("points_enabled", "true") === "true";
  const freeExamsRequirePoints = getSettingValue("free_exams_require_points", "false") === "true";

  const pointCodes = codes?.filter(c => c.type === "points") || [];

  return (
    <div className="space-y-8">
      {/* Settings Section */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-white">إعدادات نظام النقاط</h3>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="space-y-1">
              <Label className="text-white font-medium">تفعيل نظام النقاط</Label>
              <p className="text-xs text-gray-400">عند التعطيل ستختفي المحفظة وميزات الدفع بالنقاط</p>
            </div>
            <Switch 
              checked={pointsEnabled} 
              onCheckedChange={() => toggleSetting("points_enabled", pointsEnabled ? "true" : "false")} 
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="space-y-1">
              <Label className="text-white font-medium">إلزامية النقاط للاختبارات المجانية</Label>
              <p className="text-xs text-gray-400">عند التفعيل، لن تفتح الاختبارات المجانية إلا عبر النقاط</p>
            </div>
            <Switch 
              checked={freeExamsRequirePoints} 
              onCheckedChange={() => toggleSetting("free_exams_require_points", freeExamsRequirePoints ? "true" : "false")} 
            />
          </div>
        </div>
      </Card>

      {/* Code Generation Section */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-pink-500" />
          <h3 className="text-white font-bold">أكواد شحن المحفظة</h3>
          <span className="text-[10px] bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded border border-pink-500/20">
            {pointCodes.length} كود متاح
          </span>
        </div>
        
        <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
          <DialogTrigger asChild>
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء أكواد نقاط
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>إنشاء أكواد شحن جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">عدد الأكواد</label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">قيمة النقاط لكل كود</label>
                <Input
                  type="number"
                  value={formData.pointsValue}
                  onChange={(e) => setFormData({ ...formData, pointsValue: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Button
                onClick={handleGenerateCodes}
                disabled={generateCodesMutation.isPending}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white h-12"
              >
                {generateCodesMutation.isPending ? "جاري الإنشاء..." : "تأكيد الإنشاء"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Codes List */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">قائمة أكواد النقاط</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowCodes(!showCodes)} className="text-gray-400 hover:text-white">
          {showCodes ? <><EyeOff className="w-4 h-4 ml-2" /> إخفاء</> : <><Eye className="w-4 h-4 ml-2" /> عرض</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pointCodes.length > 0 ? (
          pointCodes.map((code) => {
            const consumed = (code.currentUses || 0) >= (code.maxUses || 1);
            return (
              <Card key={code.id} className={`bg-slate-900 border border-slate-800 p-4 ${consumed ? "opacity-50" : ""}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold">قيمة النقاط: {code.pointsValue}</p>
                    <p className="font-mono font-bold text-white text-lg">{showCodes ? code.code : "••••••••"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${consumed ? "bg-red-900/20 text-red-500" : "bg-green-900/20 text-green-500"}`}>
                    {consumed ? "مستخدم" : "متاح"}
                  </span>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <Button size="sm" variant="ghost" onClick={() => deleteCodeMutation.mutate({ id: code.id })} className="text-red-500/60 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full border-dashed border-slate-800 bg-slate-900/50 p-12 text-center text-gray-500">
            لا توجد أكواد نقاط حالياً.
          </Card>
        )}
      </div>
    </div>
  );
}
