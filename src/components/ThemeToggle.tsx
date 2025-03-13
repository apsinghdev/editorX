import { Button } from "@/components/ui/button";
import { useTheme } from "@/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            ) : (
              <Sun className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            )}
            <span className="sr-only">
              {theme === "light"
                ? "Enable Founder mode"
                : "Disable Founder mode"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {theme === "light" ? "Enable Founder mode" : "Disable Founder mode"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
