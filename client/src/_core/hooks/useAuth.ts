import { trpc } from "@/lib/trpc";

export interface User {
  id: number;
  openId: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}

export function useAuth() {
  const authQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      sessionStorage.setItem("manual_logout", "1");
      authQuery.refetch();
      window.location.href = "/";
    },
  });

  // Derived states to avoid sync issues
  const user = authQuery.data ?? null;
  const isAuthenticated = !!authQuery.data;
  const loading = authQuery.isLoading || authQuery.isRefetching;

  return {
    user,
    isAuthenticated,
    loading,
    logout: () => logoutMutation.mutate(),
    refetch: () => authQuery.refetch(),
  };
}
