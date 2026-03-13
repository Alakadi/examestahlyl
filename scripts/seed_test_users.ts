import "dotenv/config";
import { createUser, getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 بدء عملية حقن البيانات...");
  
  try {
    const dbInstance = await getDb();
    if (!dbInstance) {
      console.error("❌ فشل الاتصال بقاعدة البيانات. تأكد من إعداد DATABASE_URL في ملف .env");
      process.exit(1);
    }

    // إضافة مسؤول النظام
    console.log("👤 إضافة مسؤول النظام...");
    await createUser({
      name: "مسؤول النظام",
      email: "admin@test.com",
      password: "admin123",
      role: "admin",
      loginMethod: "local",
      isEmailVerified: true,
    }).catch(e => console.log("⚠️ المسؤول موجود مسبقاً أو حدث خطأ:", e.message));

    // إضافة طالب تجريبي
    console.log("🎓 إضافة طالب تجريبي...");
    await createUser({
      name: "طالب تجريبي",
      email: "student@test.com",
      password: "student123",
      role: "user",
      loginMethod: "local",
      phone: "0500000000",
      isEmailVerified: true,
    }).catch(e => console.log("⚠️ الطالب موجود مسبقاً أو حدث خطأ:", e.message));

    console.log("✅ تمت عملية حقن البيانات بنجاح!");
    console.log("\nبيانات الدخول للاختبار:");
    console.log("----------------------");
    console.log("المسؤول:");
    console.log("البريد: admin@test.com");
    console.log("كلمة المرور: admin123");
    console.log("\nالطالب:");
    console.log("البريد: student@test.com");
    console.log("كلمة المرور: student123");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ حدث خطأ غير متوقع أثناء الحقن:", error);
    process.exit(1);
  }
}

seed();
