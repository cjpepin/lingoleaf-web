import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import lingoleafIcon from "@/assets/lingoleaf_icon.png";
import PortfolioBackLink from "@/components/PortfolioBackLink";

export default function SecondaryPageHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <img src={lingoleafIcon} alt="LingoLeaf" className="h-8 w-8 rounded-lg" />
        </div>
        <PortfolioBackLink />
      </div>
    </header>
  );
}
