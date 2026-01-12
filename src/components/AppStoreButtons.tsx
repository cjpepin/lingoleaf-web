import { Apple } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppStoreButtonsProps {
  className?: string;
}

const AppStoreButtons = ({ className = "" }: AppStoreButtonsProps) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <Button
        variant="outline"
        size="lg"
        className="gap-3 px-6 py-6 text-base bg-foreground text-background hover:bg-foreground/90 hover:text-background border-0"
        onClick={() => window.open("#", "_blank")}
      >
        <Apple className="w-6 h-6" />
        <div className="flex flex-col items-start">
          <span className="text-xs opacity-80">Download on the</span>
          <span className="font-semibold -mt-0.5">App Store</span>
        </div>
      </Button>
    </div>
  );
};

export default AppStoreButtons;
