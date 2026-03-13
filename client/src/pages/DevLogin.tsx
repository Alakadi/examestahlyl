import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Lock, Mail, Phone, GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function DevLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [, navigate] = useLocation();
  const { refetch } = useAuth();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      toast.success("تم تسجيل الدخول بنجاح");
      await refetch?.();
      navigate("/");
    },
    onError: (error) => {
      toast.error(error.message || "فشل تسجيل الدخول");
    }
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      toast.success("تم إنشاء الحساب بنجاح");
      await refetch?.();
      navigate("/");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء الحساب");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      registerMutation.mutate({ name, email, password, phone });
    } else {
      loginMutation.mutate({ email, password, expectedRole: "user" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-900 border-slate-800 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-4 text-emerald-500 ring-1 ring-emerald-500/20">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isRegister ? "إنشاء حساب طالب" : "دخول الطلاب"}
          </h1>
          <p className="text-gray-400">
            {isRegister ? "انضم إلينا لتبدأ رحلتك التعليمية" : "مرحباً بك مجدداً في منصتك التعليمية"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {isRegister && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">الاسم الكامل</label>
              <div className="relative group">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-hover:text-emerald-500 transition-colors" />
                <Input
                  required
                  placeholder="أدخل اسمك الكامل"
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-emerald-500 focus:border-emerald-500 h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">البريد الإلكتروني</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-hover:text-emerald-500 transition-colors" />
              <Input
                required
                type="email"
                placeholder="example@mail.com"
                className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-emerald-500 focus:border-emerald-500 h-11 text-left placeholder:text-right"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">كلمة المرور</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-hover:text-emerald-500 transition-colors" />
              <Input
                required
                type="password"
                placeholder="••••••••"
                className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-emerald-500 focus:border-emerald-500 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">رقم الهاتف (اختياري)</label>
              <div className="relative group">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-hover:text-emerald-500 transition-colors" />
                <Input
                  type="tel"
                  placeholder="05xxxxxxxx"
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-emerald-500 focus:border-emerald-500 h-11 text-left placeholder:text-right"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loginMutation.isPending || registerMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 mt-6"
          >
            {isRegister ? "إنشاء الحساب" : "تسجيل الدخول"}
            {(loginMutation.isPending || registerMutation.isPending) ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </Button>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-gray-400 hover:text-emerald-500 transition-colors"
            >
              {isRegister ? "لديك حساب بالفعل؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full text-gray-500 hover:text-white mt-2 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Button>
        </form>
      </Card>
    </div>
  );
}
