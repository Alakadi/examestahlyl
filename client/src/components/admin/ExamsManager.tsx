import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function ExamsManager() {
  return (
    <div className="space-y-6">
      <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
        <Plus className="w-4 h-4 ml-2" />
        إنشاء اختبار جديد
      </Button>

      <Card className="bg-slate-900 border border-slate-700 p-8 text-center">
        <p className="text-gray-400">لا توجد اختبارات حالياً</p>
      </Card>
    </div>
  );
}
