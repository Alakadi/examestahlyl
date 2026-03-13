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
  const utils = trpc.useUtils();
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [questionData, setQuestionData] = useState({
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

  const { data: questions } = trpc.questions.getBySection.useQuery(
    { sectionId: selectedSection || 0 },
    { enabled: !!selectedSection }
  );

  const createSectionMutation = trpc.sections.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء القسم بنجاح");
      setNewSectionTitle("");
      setIsAddingSection(false);
      utils.sections.getBySubject.invalidate({ subjectId: selectedSubject || 0 });
    },
  });

  const deleteSectionMutation = trpc.sections.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القسم بنجاح");
      setSelectedSection(null);
      utils.sections.getBySubject.invalidate({ subjectId: selectedSubject || 0 });
    },
  });

  const createQuestionMutation = trpc.questions.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة السؤال بنجاح");
      closeQuestionDialog();
      utils.questions.getBySection.invalidate({ sectionId: selectedSection || 0 });
    },
  });

  const updateQuestionMutation = trpc.questions.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث السؤال بنجاح");
      closeQuestionDialog();
      utils.questions.getBySection.invalidate({ sectionId: selectedSection || 0 });
    },
  });

  const deleteQuestionMutation = trpc.questions.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف السؤال بنجاح");
      utils.questions.getBySection.invalidate({ sectionId: selectedSection || 0 });
    },
  });

  const openAddDialog = () => {
    setEditingQuestionId(null);
    setQuestionData({
      text: "",
      options: [{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }],
      correctOptionId: "1",
      explanation: "",
      explanationLink: "",
    });
    setIsQuestionDialogOpen(true);
  };

  const openEditDialog = (q: any) => {
    setEditingQuestionId(q.id);
    setQuestionData({
      text: q.text,
      options: q.options as any,
      correctOptionId: q.correctOptionId,
      explanation: q.explanation || "",
      explanationLink: q.explanationLink || "",
    });
    setIsQuestionDialogOpen(true);
  };

  const closeQuestionDialog = () => {
    setIsQuestionDialogOpen(false);
    setEditingQuestionId(null);
  };

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

  const handleSaveQuestion = () => {
    if (!selectedSection || !questionData.text.trim()) {
      toast.error("الرجاء اختيار قسم وإدخال نص السؤال");
      return;
    }
    if (questionData.options.some(opt => !opt.text.trim())) {
      toast.error("الرجاء ملء جميع الخيارات");
      return;
    }

    if (editingQuestionId) {
      updateQuestionMutation.mutate({
        id: editingQuestionId,
        ...questionData,
      });
    } else {
      createQuestionMutation.mutate({
        sectionId: selectedSection,
        ...questionData,
      });
    }
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
          className="w-full h-11 px-4 bg-slate-800 border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-inner"
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
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                <h3 className="text-xl font-bold text-white">الأقسام الدراسية</h3>
              </div>
              <Dialog open={isAddingSection} onOpenChange={setIsAddingSection}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة قسم
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border border-slate-700 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl">إنشاء قسم جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="أدخل اسم القسم (مثال: المدخل للعلوم القانونية)"
                      className="bg-slate-800 border-slate-700 text-white h-12 rounded-xl"
                    />
                    <Button
                      onClick={handleAddSection}
                      disabled={createSectionMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-lg font-bold"
                    >
                      {createSectionMutation.isPending ? "جاري الإنشاء..." : "حفظ القسم"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections?.map((section) => (
                <Card
                  key={section.id}
                  className={`bg-slate-800/40 border-2 p-5 cursor-pointer transition-all duration-300 relative group rounded-2xl backdrop-blur-sm ${
                    selectedSection === section.id 
                      ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10" 
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 shadow-lg transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع الأسئلة المرتبطة به.")) {
                        deleteSectionMutation.mutate({ id: section.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <h4 className="font-bold text-white text-lg">{section.title}</h4>
                  <p className="text-xs text-slate-500 mt-2 font-mono">ID: #{section.id}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Questions Management */}
          {selectedSection && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-emerald-600 rounded-full" />
                  <h3 className="text-xl font-bold text-white">إدارة بنك الأسئلة</h3>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={openAddDialog}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة سؤال
                  </Button>

                  <Button className="bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl border border-slate-700">
                    <Upload className="w-4 h-4 ml-2" />
                    استيراد
                  </Button>
                </div>
              </div>

              {/* Questions List (Compact) */}
              <div className="space-y-3">
                {questions && questions.length > 0 ? (
                  questions.map((q, idx) => (
                    <div 
                      key={q.id} 
                      className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/60 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-4 flex-1 overflow-hidden">
                        <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded-md">
                          #{idx + 1}
                        </span>
                        <p className="text-white font-medium truncate pr-4">{q.text}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-3 rounded-lg"
                          onClick={() => openEditDialog(q)}
                        >
                          تعديل
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0 rounded-lg"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
                              deleteQuestionMutation.mutate({ id: q.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-slate-800/20 border border-dashed border-slate-700 rounded-2xl">
                    <p className="text-slate-500 italic">البنك فارغ حالياً، أضف أسئلة للبدء</p>
                  </div>
                )}
              </div>

              {/* Add/Edit Question Dialog */}
              <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
                <DialogContent className="bg-slate-900 border border-slate-700 max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden">
                  <div className="bg-slate-800/50 p-6 border-b border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl flex items-center gap-2">
                        {editingQuestionId ? "تعديل بيانات السؤال" : "إضافة سؤال جديد"}
                      </DialogTitle>
                    </DialogHeader>
                  </div>
                  
                  <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-400">نص السؤال</label>
                      <Textarea
                        value={questionData.text}
                        onChange={(e) => setQuestionData({ ...questionData, text: e.target.value })}
                        placeholder="أدخل نص السؤال هنا..."
                        className="bg-slate-800 border-slate-700 text-white min-h-[120px] rounded-xl focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-400">الخيارات المتاحة والإجابة الصحيحة</label>
                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                          حدد الدائرة للإجابة الصحيحة
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {questionData.options.map((option, idx) => (
                          <div key={idx} className="flex gap-3 items-center group/opt">
                            <div className="relative">
                              <input
                                type="radio"
                                name="correct"
                                checked={questionData.correctOptionId === option.id}
                                onChange={() => setQuestionData({ ...questionData, correctOptionId: option.id })}
                                className="w-5 h-5 accent-emerald-500 cursor-pointer"
                              />
                            </div>
                            <Input
                              value={option.text}
                              onChange={(e) => {
                                const newOptions = [...questionData.options];
                                newOptions[idx].text = e.target.value;
                                setQuestionData({ ...questionData, options: newOptions });
                              }}
                              placeholder={`الخيار ${idx + 1}...`}
                              className="bg-slate-800 border-slate-700 text-white h-12 rounded-xl focus:ring-emerald-500 transition-all border-emerald-500/0 focus:border-emerald-500/50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-800">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-400">الشرح التعليمي (اختياري)</label>
                        <Textarea
                          value={questionData.explanation}
                          onChange={(e) => setQuestionData({ ...questionData, explanation: e.target.value })}
                          placeholder="توضيح سبب اختيار الإجابة الصحيحة..."
                          className="bg-slate-800 border-slate-700 text-white min-h-[90px] rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-400">رابط توضيحي أو مصدر (اختياري)</label>
                        <Input
                          value={questionData.explanationLink}
                          onChange={(e) => setQuestionData({ ...questionData, explanationLink: e.target.value })}
                          placeholder="https://example.com/source"
                          className="bg-slate-800 border-slate-700 text-white h-12 rounded-xl text-left"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-800/30 border-t border-slate-700 flex gap-3">
                    <Button
                      onClick={handleSaveQuestion}
                      disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-lg font-bold shadow-lg shadow-blue-600/20"
                    >
                      {editingQuestionId ? "حفظ التغييرات" : "إضافة للسجل"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={closeQuestionDialog}
                      className="px-6 text-slate-400 hover:text-white hover:bg-slate-800 h-12 rounded-xl"
                    >
                      إلغاء
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </>
      )}
    </div>
  );
}
