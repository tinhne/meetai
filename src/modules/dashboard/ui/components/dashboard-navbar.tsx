"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftCloseIcon, PanelLeftIcon, SearchIcon } from "lucide-react";
import { DashboardCommand } from "./dashboard-command";
import { useEffect, useState } from "react";

export const DashboardNavbar = () => {
    const { state, toggleSidebar, isMobile } = useSidebar();
    const [commandOpen, setCommandOpen] = useState(false);

    useEffect(() => {
        const down = (e: globalThis.KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setCommandOpen(open => !open);
            }
        } 
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    return (
        <>
            <DashboardCommand open={commandOpen} setOpen={setCommandOpen} />
            <nav className="flex px-4 gap-x-2 items-center py-3 border-b bg-background ">
                <Button className="size-9" variant="outline" onClick={toggleSidebar}>
                    {state === "collapsed" || isMobile ? (
                        <PanelLeftIcon className="size-4" />
                    ) : (
                        <PanelLeftCloseIcon className="size-4" />
                    )}
                </Button>
                <Button
                    className="h-9 w-[240px] justify-start font-normal text-muted-foreground hover:text-muted-foreground"
                    variant="outline"
                    size="sm"
                    onClick={() => setCommandOpen(open => !open)}
                >
                    <SearchIcon />
                    search...
                    <kbd className="ml-auto text-xs font-normal text-muted-foreground">
                        ⌘K
                    </kbd>
                </Button>
            </nav>
        </>
    );
};
