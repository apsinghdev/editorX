
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="w-full py-3 px-4 sm:px-6 lg:px-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="h-6 w-6 rounded-full bg-primary animate-pulse-soft"></span>
          <h1 className="text-xl font-medium tracking-tight">EditorX</h1>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Beta</span>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <a 
            href="https://github.com/apsinghdev/editorX"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Source
          </a>
        </div>
      </div>
    </header>
  );
}
