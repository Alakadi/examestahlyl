export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - في البيئة المحلية نستخدم /api/dev/login مباشرة
export const getLoginUrl = () => {
  return "/api/dev/login";
};
