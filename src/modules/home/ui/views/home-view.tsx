"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export const HomeView = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  if (!session) {
    return (
      <p>Loading...</p>
    )
  }

  return ( 
    <div className="flex flex-col gap-y-4 p-4">
        <p>Logged in as {session.user.email}</p>
        <Button
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => router.push("/sign-in")
              },
            });
          }}
        >
          Sign out
        </Button>
      </div>
   );
}
 