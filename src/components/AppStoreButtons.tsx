import { Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import appleLogo from "@/assets/apple.png";

interface AppStoreButtonsProps {
  className?: string;
}

const AppStoreButtons = ({ className = "" }: AppStoreButtonsProps) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="gap-3 px-6 py-6 text-base bg-foreground text-background hover:bg-foreground/90 hover:text-background border-0"
      >
        <a
          href="https://apps.apple.com/us/app/lingoleaf/id6758588394"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download LingoLeaf on the App Store"
        >
          <img src={appleLogo} className="w-6 h-6 fill-white" />
          <div className="flex flex-col items-start">
            <span className="text-xs opacity-80">Download on the</span>
            <span className="font-semibold -mt-0.5">App Store</span>
          </div>
        </a>
      </Button>
    </div>
  );
};

export default AppStoreButtons;
