"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const CallEnded = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
      <div className="px-8 py-4 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center bg-background gap-y-6 rounded-lg p-10 shadow-sm">
          <div className="flex flex-col gap-y-2 text-center">
            <h6 className="text-lg font-medium">You have ended the call</h6>
            <p className="text-sm">Summary will appear in a few minutes.</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/meetings">Back to Meetings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
