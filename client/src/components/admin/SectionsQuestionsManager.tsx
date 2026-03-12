import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function SectionsQuestionsManager() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    options: [{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }],
    correctOptionId: "1",
    explanation: "",
    explanationLink: "",
  });

  const { data: subjects } = trpc.subjects.getAll.useQuery();
  const { data: sections } = trpc.sections.getBySubject.useQuery(
    { subjectId: selectedSubject || 0 },
    { enabled: !!selectedSubject }
  );

  const createSectionMutation = trpc.sections.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء القسم بنجاح");
      setNewSectionTitle("");
      setIsAddingSection(false);
    },
  });

  const createQuestionMutation = trpc.questions.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة السؤال بنجاح");
      setNewQuestion({
        text: "",
        options: [{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }],
        correctOptionId: "1",
        explanation: "",
        explanationLink: "",
      });
      setIsAddingQuestion(false);
    },
  });

  const handleAddSection = () => {
    if (!selectedSubject || !newSectionTitle.trim()) {
      toast.error("الرجاء اختيار مادة وإدخال اسم القسم");
      return;
    }
    createSectionMutation.mutate({
      subjectId: selectedSubject,
      title: newSectionTitle,
    });
  };

  const handleAddQuestion = () => {
    if (!selectedSection || !newQuestion.text.trim()) {
      toast.error("الرجاء اختيار قسم وإدخال نص السؤال");
      return;
    }
    if (newQuestion.options.some(opt => !opt.text.trim())) {
      toast.error("الرجاء ملء جميع الخيارات");
      return;
    }
    createQuestionMutation.mutate({
      sectionId: selectedSection,
      ...newQuestion,
    });
  };

  return (
    <div className="space-y-6">
      {/* Subject Selection */}
      <div>
        <label className="text-sm font-semibold text-gray-300 mb-2 block">اختر المادة</label>
        <select
          value={selectedSubject || ""}
          onChange={(e) => {
            setSelectedSubject(e.target.value ? Number(e.target.value) : null);
            setSelectedSection(null);
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

      {selectedSubject && (
        <>
          {/* Sections Management */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">الأقسام</h3>
              <Dialog open={isAddingSection} onOpenChange={setIsAddingSection}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة قسم
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">إضافة قسم جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="اسم القسم"
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <Button
                      onClick={handleAddSection}
                      disabled={createSectionMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {createSectionMutation.isPending ? "جاري الإنشاء..." : "إنشاء القسم"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections?.map((section) => (
                <Card
                  key={section.id}
                  className={`bg-slate-800 border-2 p-4 cursor-pointer transition ${
                    selectedSection === section.id ? "border-blue-500" : "border-slate-700"
                  }`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <h4 className="font-bold text-white">{section.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">قسم #{section.id}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Questions Management */}
          {selectedSection && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">الأسئلة</h3>
                <div className="flex gap-2">
                  <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                        <Plus className="w-4 h-4 ml-2" />
                        إضافة سؤال
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border border-slate-700 max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-white">إضافة سؤال جديد</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        <Textarea
                          value={newQuestion.text}
                          onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                          placeholder="نص السؤال"
                          className="bg-slate-800 border-slate-600 text-white"
                        />

                        <div className="space-y-2">
                          <label className="text-sm text-gray-300">الخيارات</label>
                          {newQuestion.options.map((option, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="radio"
                                name="correct"
                                checked={newQuestion.correctOptionId === option.id}
                                onChange={() => setNewQuestion({ ...newQuestion, correctOptionId: option.id })}
                                className="mt-2"
                              />
                              <Input
                                value={option.text}
                                onChange={(e) => {
                                  const newOptions = [...newQuestion.options];
                                  newOptions[idx].text = e.target.value;
                                  setNewQuestion({ ...newQuestion, options: newOptions });
                                }}
                                placeholder={`الخيار ${idx + 1}`}
                                className="bg-slate-800 border-slate-600 text-white"
                              />
                            </div>
                          ))}
                        </div>

                        <Textarea
                          value={newQuestion.explanation}
                          onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                          placeholder="الشرح التوضيحي (اختياري)"
                          className="bg-slate-800 border-slate-600 text-white"
                        />

                        <Input
                          value={newQuestion.explanationLink}
                          onChange={(e) => setNewQuestion({ ...newQuestion, explanationLink: e.target.value })}
                          placeholder="رابط الشرح (اختياري)"
                          className="bg-slate-800 border-slate-600 text-white"
                        />

                        <Button
                          onClick={handleAddQuestion}
                          disabled={createQuestionMutation.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {createQuestionMutation.isPending ? "جاري الإضافة..." : "إضافة السؤال"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button className="bg-green-600 hover:bg-green-700 text-white text-sm">
                    <Upload className="w-4 h-4 ml-2" />
                    استيراد من Excel
                  </Button>
                </div>
              </div>

              <Card className="bg-slate-900 border border-slate-700 p-6 text-center">
                <p className="text-gray-400">سيتم عرض الأسئلة هنا</p>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
