import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function ExamResults() {
  const { resultId } = useParams<{ resultId: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Score Card */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-8 mb-6 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">85%</h1>
            <p className="text-gray-400">لقد أكملت الاختبار بنجاح</p>
          </div>
        </Card>

        {/* Section Scores */}
        <Card className="bg-slate-900 border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">درجاتك في كل قسم</h2>
          <div className="space-y-4">
            {[
              { name: "الجبر", score: 90 },
              { name: "الهندسة", score: 85 },
              { name: "الإحصاء", score: 75 },
            ].map((section, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-gray-300">{section.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full"
                      style={{ width: `${section.score}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold w-12 text-right">{section.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Assessment Message */}
        <Card className="bg-blue-900/30 border border-blue-700 p-6 mb-6">
          <h3 className="text-lg font-bold text-blue-300 mb-3">💡 ملخص التقييم</h3>
          <p className="text-gray-300 mb-4">
            أنت تحتاج إلى تحسين مستواك في الإحصاء. يرجى الاطلاع على الدورة التدريبية التالية:
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
            الانتقال إلى دورة الإحصاء
          </Button>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
            العودة للمواد
          </Button>
          <Button variant="outline" className="flex-1 border-slate-700 text-gray-300 hover:bg-slate-800">
            مشاركة النتيجة
          </Button>
        </div>
      </div>
    </div>
  );
}
