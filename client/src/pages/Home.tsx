import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, BookOpen, BarChart3, Users, ChevronRight, Sparkles, GraduationCap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { subjectsAPI } from "@/lib/api";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: subjectsResponse, isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await subjectsAPI.getAll();
      return response.data;
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const subjects = subjectsResponse || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">إي-إكزام <span className="text-blue-500">بلاتفورم</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-white text-sm font-bold">{user?.name}</p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{user?.role === 'admin' ? 'مسؤول النظام' : 'طالب'}</p>
                </div>
                {user?.role === "admin" && (
                  <Button
                    onClick={() => navigate("/admin")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 h-9 rounded-lg"
                  >
                    لوحة التحكم
                  </Button>
                )}
                <Button
                  onClick={() => logout()}
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-slate-800 text-xs h-9"
                >
                  خروج
                </Button>
              </div>
            ) : (
              <a href={getLoginUrl()} target="_self" rel="noopener noreferrer">
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold rounded-lg px-6">
                  دخول المنصة
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 animate-in fade-in slide-in-from-bottom-4">
            <Sparkles className="w-3 h-3" />
            <span>مدعوم بالذكاء الاصطناعي للتقييم الذكي</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            ارتقِ بمستواك <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">بذكاء وإتقان</span>
          </h2>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            منصة اختبارات تحديد المستوى المتطورة التي توفر لك تقييمات دقيقة وتوصيات تعليمية مخصصة بناءً على أدائك الحقيقي.
          </p>
          
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={getLoginUrl()} target="_self" rel="noopener noreferrer">
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-lg px-10 py-7 rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-105">
                  ابدأ رحلتك الآن
                </Button>
              </a>
              <Button variant="ghost" className="text-gray-400 hover:text-white text-lg px-8 py-7">
                استكشف المميزات
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: BookOpen, label: "المواد الدراسية", value: subjects.length || "0", color: "text-blue-500" },
            { icon: BarChart3, label: "إجمالي الاختبارات", value: "متاح دائماً", color: "text-cyan-500" },
            { icon: Users, label: "الطلاب المشتركين", value: "مجتمع متنامي", color: "text-indigo-500" },
          ].map((stat, idx) => (
            <Card
              key={idx}
              className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-8 flex items-center gap-6 hover:border-blue-500/50 transition-all group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="max-w-7xl mx-auto px-4 py-32">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="text-right">
            <h3 className="text-3xl font-black text-white mb-4">المواد المتاحة</h3>
            <p className="text-gray-500 max-w-md">اختر المادة التي ترغب في اختبار مستواك فيها وابدأ التقييم فوراً.</p>
          </div>
          <div className="flex gap-2">
            <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
            <div className="w-4 h-1 bg-slate-800 rounded-full"></div>
            <div className="w-4 h-1 bg-slate-800 rounded-full"></div>
          </div>
        </div>

        {subjectsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : subjects.length === 0 ? (
          <Card className="bg-slate-900/50 border-dashed border-slate-800 p-20 text-center">
            <p className="text-gray-500 text-lg">لا توجد مواد دراسية مضافة حالياً. يرجى مراجعة المسؤول.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {subjects.map((subject: any) => (
              <Card
                key={subject.id}
                className="bg-slate-900 border border-slate-800 p-8 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => navigate(`/subject/${subject.id}`)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-colors"></div>
                
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform inline-block">
                  {subject.icon || "📚"}
                </div>
                
                <h4 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  {subject.title}
                </h4>
                
                <p className="text-gray-500 text-sm mb-8 line-clamp-2 leading-relaxed">
                  {subject.description || "استكشف هذه المادة وقم بإجراء الاختبارات لتقييم مستواك المعرفي."}
                </p>
                
                <Button
                  className="w-full bg-slate-800 hover:bg-blue-600 text-white font-bold py-6 rounded-xl transition-all flex items-center justify-center gap-2 group/btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/subject/${subject.id}`);
                  }}
                >
                  استعراض الاختبارات
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-[-4px] transition-transform" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/80 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">إي-إكزام</h1>
          </div>
          
          <p className="text-gray-500 text-sm">
            © 2026 منصة اختبارات تحديد المستوى. جميع الحقوق محفوظة.
          </p>
          
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">عن المنصة</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">الشروط</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">اتصل بنا</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
