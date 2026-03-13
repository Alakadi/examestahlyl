import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import StudentExam from "./pages/StudentExam";
import ExamResults from "./pages/ExamResults";
import SubjectDetail from "./pages/SubjectDetail";
import DevLogin from "./pages/DevLogin";
import AdminPortal from "./pages/AdminPortal";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dev-login"} component={DevLogin} />
      <Route path="/admin">
        {() => {
          if (!isAuthenticated) return <Redirect to="/admin-portal" />;
          if (user?.role !== "admin") return <Redirect to="/" />;
          return <AdminDashboard />;
        }}
      </Route>
      <Route path="/admin/:any*">
        {() => {
          if (!isAuthenticated) return <Redirect to="/admin-portal" />;
          if (user?.role !== "admin") return <Redirect to="/" />;
          return <AdminDashboard />;
        }}
      </Route>
      
      <Route path={"/admin-portal"}>
        {isAuthenticated && user?.role === "admin" ? <Redirect to="/admin" /> : <AdminPortal />}
      </Route>

      <Route path={"/subject/:id"} component={SubjectDetail} />
      <Route path={"/exam/:id"} component={StudentExam} />
      <Route path={"/results/:resultId"} component={ExamResults} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
