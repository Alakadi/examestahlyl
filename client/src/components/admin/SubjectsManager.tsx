import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SubjectsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "",
    color: "#0066FF",
  });

  const { data: subjects, isLoading, refetch } = trpc.subjects.getAll.useQuery();
  const createMutation = trpc.subjects.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المادة بنجاح");
      setFormData({ title: "", description: "", icon: "", color: "#0066FF" });
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("الرجاء إدخال اسم المادة");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
            <Plus className="w-4 h-4 ml-2" />
            إضافة مادة جديدة
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-900 border border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">إضافة مادة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-300">اسم المادة</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="مثال: الرياضيات"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">الوصف</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="وصف المادة..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300">الأيقونة</label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="📚"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">اللون</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <span className="text-gray-400 text-sm self-center">{formData.color}</span>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء المادة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center text-gray-400">جاري التحميل...</div>
        ) : subjects && subjects.length > 0 ? (
          subjects.map((subject) => (
            <Card
              key={subject.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-4 hover:border-blue-500 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-2xl mb-2">{subject.icon}</div>
                  <h3 className="text-lg font-bold text-white">{subject.title}</h3>
                  {subject.description && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{subject.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-blue-400" onClick={() => navigate(`/subject/${subject.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-blue-400">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-400 py-8">
            لا توجد مواد حالياً
          </div>
        )}
      </div>
    </div>
  );
}
