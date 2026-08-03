import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

export function ThemeToggle({ className, iconClassName }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn("relative", className)}
    >
      <Sun className={cn("h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0", iconClassName)} />
      <Moon className={cn("absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100", iconClassName)} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
