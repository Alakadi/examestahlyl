import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function StudentExam() {
  const { id } = useParams<{ id: string }>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>السؤال 1 من 10</span>
            <span>10%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full" style={{ width: "10%" }}></div>
          </div>
        </div>

        {/* Question Card */}
        <Card className="bg-slate-900 border border-slate-700 p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-6">
            ما هي عاصمة فرنسا؟
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {["باريس", "لندن", "برلين", "مدريد"].map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full p-4 rounded-lg border-2 transition text-right ${
                  selectedAnswer === option
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                }`}
              >
                <span className="text-white">{option}</span>
              </button>
            ))}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
              <p className="text-green-400 font-semibold mb-2">✓ إجابة صحيحة</p>
              <p className="text-gray-300 text-sm">هذا هو الشرح التوضيحي للإجابة الصحيحة.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowFeedback(true)}
              disabled={!selectedAnswer}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              تأكيد الإجابة
            </Button>
            {showFeedback && (
              <Button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
              >
                السؤال التالي
              </Button>
            )}
          </div>
        </Card>

        {/* Help Buttons */}
        {showFeedback && (
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="border-slate-700 text-gray-300 hover:bg-slate-800">
              اسأل الذكاء الاصطناعي
            </Button>
            <Button variant="outline" className="border-slate-700 text-gray-300 hover:bg-slate-800">
              عرض الشرح
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
