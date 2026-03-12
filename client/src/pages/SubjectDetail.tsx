import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Play } from "lucide-react";
import { useState } from "react";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">الرياضيات</h1>
          <p className="text-gray-400">
            مادة شاملة تغطي أساسيات الرياضيات من الجبر إلى الهندسة والإحصاء
          </p>
        </div>

        {/* Description */}
        <Card className="bg-slate-900 border border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">نبذة عن المادة</h2>
          <p className="text-gray-300 leading-relaxed">
            هذه المادة مصممة لتطوير مهاراتك في الرياضيات من خلال اختبارات تفاعلية شاملة.
            تتضمن المادة ثلاثة أقسام رئيسية: الجبر والهندسة والإحصاء، مع أكثر من 150 سؤال متنوع.
          </p>
        </Card>

        {/* Exams */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">الاختبارات المتاحة</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Exam */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 hover:border-blue-500 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">اختبار المستوى الأساسي</h3>
                  <p className="text-sm text-gray-400 mt-1">مجاني</p>
                </div>
                <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                  مجاني
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                اختبار شامل يتضمن 50 سؤال من جميع الأقسام
              </p>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
                <Play className="w-4 h-4 ml-2" />
                ابدأ الاختبار
              </Button>
            </Card>

            {/* Paid Exam */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 hover:border-pink-500 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">اختبار المستوى المتقدم</h3>
                  <p className="text-sm text-gray-400 mt-1">مدفوع</p>
                </div>
                <span className="bg-pink-900/30 text-pink-400 px-3 py-1 rounded-full text-xs font-semibold">
                  <Lock className="w-3 h-3 inline ml-1" />
                  مدفوع
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                اختبار متقدم يتضمن 100 سؤال مع تقييم تفصيلي
              </p>
              {!showCodeInput ? (
                <Button
                  onClick={() => setShowCodeInput(true)}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 text-white"
                >
                  <Lock className="w-4 h-4 ml-2" />
                  أدخل الكود
                </Button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="أدخل كود الاختبار"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-gray-500"
                  />
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    تحقق من الكود
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Sections */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">أقسام المادة</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "الجبر", questions: 50, icon: "📐" },
              { name: "الهندسة", questions: 50, icon: "📏" },
              { name: "الإحصاء", questions: 50, icon: "📊" },
            ].map((section, idx) => (
              <Card key={idx} className="bg-slate-900 border border-slate-700 p-4 text-center">
                <div className="text-3xl mb-2">{section.icon}</div>
                <h3 className="text-lg font-bold text-white">{section.name}</h3>
                <p className="text-sm text-gray-400 mt-2">{section.questions} سؤال</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
