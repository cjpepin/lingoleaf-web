import { Apple, Play } from "lucide-react";
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
        className="gap-2 px-6 py-6 text-base"
        onClick={() => window.open("#", "_blank")}
      >
        <Apple className="w-5 h-5" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">Download on the</span>
          <span className="font-semibold">App Store</span>
        </div>
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        className="gap-2 px-6 py-6 text-base"
        onClick={() => window.open("#", "_blank")}
      >
        <Play className="w-5 h-5" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">Get it on</span>
          <span className="font-semibold">Google Play</span>
        </div>
      </Button>
    </div>
  );
};

export default AppStoreButtons;
