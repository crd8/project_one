import { Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "../theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-neutral-600 dark:text-neutral-400" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-neutral-600 dark:text-neutral-400" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}