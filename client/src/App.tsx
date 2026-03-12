import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import StudentExam from "./pages/StudentExam";
import ExamResults from "./pages/ExamResults";
import SubjectDetail from "./pages/SubjectDetail";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      {user?.role === "admin" && <Route path={"/admin/*"} component={AdminDashboard} />}
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
