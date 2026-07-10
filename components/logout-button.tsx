import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form
      className="w-full"
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start gap-2 px-1.5 font-normal"
      >
        <LogOut className="size-4" />
        Keluar
      </Button>
    </form>
  );
}
