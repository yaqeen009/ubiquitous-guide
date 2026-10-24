import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useDataStore } from "@/store/useDataStore";

export function ThemeToggle() {
  const theme = useDataStore((state) => state.theme);
  const toggleTheme = useDataStore((state) => state.toggleTheme);
  return (
    <Tooltip content={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      >
        {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
      </Button>
    </Tooltip>
  );
}
