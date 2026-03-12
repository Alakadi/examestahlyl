import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubjectsManager from "@/components/admin/SubjectsManager";
import QuestionsManager from "@/components/admin/QuestionsManager";
import ExamsManager from "@/components/admin/ExamsManager";
import CodesManager from "@/components/admin/CodesManager";
import AssessmentManager from "@/components/admin/AssessmentManager";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("subjects");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-gray-400 mt-2">إدارة المواد والأسئلة والاختبارات</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-900 border border-slate-700">
            <TabsTrigger value="subjects" className="data-[state=active]:bg-blue-600">
              المواد
            </TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-blue-600">
              الأسئلة
            </TabsTrigger>
            <TabsTrigger value="exams" className="data-[state=active]:bg-blue-600">
              الاختبارات
            </TabsTrigger>
            <TabsTrigger value="codes" className="data-[state=active]:bg-blue-600">
              الأكواد
            </TabsTrigger>
            <TabsTrigger value="assessment" className="data-[state=active]:bg-blue-600">
              التقييم
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="mt-6">
            <SubjectsManager />
          </TabsContent>

          <TabsContent value="questions" className="mt-6">
            <QuestionsManager />
          </TabsContent>

          <TabsContent value="exams" className="mt-6">
            <ExamsManager />
          </TabsContent>

          <TabsContent value="codes" className="mt-6">
            <CodesManager />
          </TabsContent>

          <TabsContent value="assessment" className="mt-6">
            <AssessmentManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
