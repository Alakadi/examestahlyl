import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminPortal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, navigate] = useLocation();
  const { refetch } = useAuth();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (user) => {
      if (user.role !== "admin") {
        toast.error("عذراً، هذا الحساب ليس لديه صلاحيات مسؤول");
        return;
      }
      toast.success("مرحباً بك في لوحة التحكم");
      await refetch?.();
      navigate("/admin");
    },
    onError: (error) => {
      toast.error(error.message || "فشل تسجيل الدخول كمسؤول");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password, expectedRole: "admin" });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-900 border-slate-800 p-8 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 mb-4 text-blue-500 ring-1 ring-blue-500/20">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">بوابة المسؤول</h1>
          <p className="text-gray-400">منطقة مقيدة - الدخول ببيانات المسؤول</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 flex gap-3 relative z-10">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            يجب استخدام البريد الإلكتروني وكلمة المرور الخاصة بحساب المسؤول للوصول إلى لوحة التحكم.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">البريد الإلكتروني للإدارة</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors" />
              <Input
                required
                type="email"
                placeholder="admin@platform.com"
                className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-500 focus:border-blue-500 h-11 text-left placeholder:text-right"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">كلمة المرور</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors" />
              <Input
                required
                type="password"
                placeholder="••••••••"
                className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-500 focus:border-blue-500 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-6"
          >
            دخول المسؤول
            {loginMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full text-gray-500 hover:text-white mt-2 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            الخروج من الصفحة
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center relative z-10">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            Security Level: Restricted Access
          </p>
        </div>
      </Card>
    </div>
  );
}
