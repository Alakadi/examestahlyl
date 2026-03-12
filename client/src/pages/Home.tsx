import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, BookOpen, BarChart3, Users } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">منصة الاختبارات</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-300 text-sm">مرحباً، {user?.name}</span>
                {user?.role === "admin" && (
                  <Button
                    onClick={() => navigate("/admin")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    لوحة التحكم
                  </Button>
                )}
                <Button
                  onClick={() => logout()}
                  variant="outline"
                  className="border-slate-700 text-gray-300 hover:bg-slate-800 text-sm"
                >
                  تسجيل الخروج
                </Button>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
                  تسجيل الدخول
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            منصة اختبارات تحديد المستوى
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            اختبر مستواك الفكري واحصل على تقييم شامل مع توصيات تدريبية مخصصة
          </p>
          {!isAuthenticated && (
            <a href={getLoginUrl()}>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-lg px-8 py-6">
                ابدأ الآن
              </Button>
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: BookOpen, label: "مواد دراسية", value: "5+" },
            { icon: BarChart3, label: "اختبارات", value: "15+" },
            { icon: Users, label: "طلاب نشطين", value: "1000+" },
          ].map((stat, idx) => (
            <Card
              key={idx}
              className="bg-slate-900 border border-slate-700 p-6 text-center hover:border-blue-500 transition"
            >
              <stat.icon className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Subjects Grid */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-8">المواد المتاحة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "الرياضيات",
                description: "اختبر مستواك في الجبر والهندسة والإحصاء",
                icon: "📐",
                color: "from-blue-600 to-cyan-500",
              },
              {
                title: "العلوم",
                description: "اختبارات شاملة في الفيزياء والكيمياء والأحياء",
                icon: "🔬",
                color: "from-green-600 to-emerald-500",
              },
              {
                title: "اللغة الإنجليزية",
                description: "اختبر مهاراتك في القراءة والكتابة والاستماع",
                icon: "🌐",
                color: "from-purple-600 to-pink-500",
              },
              {
                title: "التاريخ",
                description: "اختبارات تاريخية شاملة من العصور القديمة إلى الحديثة",
                icon: "📚",
                color: "from-amber-600 to-orange-500",
              },
              {
                title: "الجغرافيا",
                description: "اختبر معلوماتك الجغرافية عن العالم",
                icon: "🗺️",
                color: "from-teal-600 to-cyan-500",
              },
              {
                title: "الفلسفة",
                description: "اختبارات فلسفية تنمي مهارات التفكير النقدي",
                icon: "💭",
                color: "from-indigo-600 to-purple-500",
              },
            ].map((subject, idx) => (
              <Card
                key={idx}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 hover:border-blue-500 transition cursor-pointer group"
                onClick={() => navigate(`/subject/${idx + 1}`)}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition">{subject.icon}</div>
                <h4 className="text-lg font-bold text-white mb-2">{subject.title}</h4>
                <p className="text-gray-400 text-sm mb-4">{subject.description}</p>
                <Button
                  className={`w-full bg-gradient-to-r ${subject.color} hover:opacity-90 text-white`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/subject/${idx + 1}`);
                  }}
                >
                  ابدأ الاختبار
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2026 منصة اختبارات تحديد المستوى. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
