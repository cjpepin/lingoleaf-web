import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import lingoleafIcon from "@/assets/lingoleaf_icon.png";
import { withBase } from "@/lib/paths";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 px-6 py-4 max-w-4xl mx-auto">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <img src={lingoleafIcon} alt="LingoLeaf" className="w-8 h-8 rounded-lg" />
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <iframe
          src={withBase("privacy_policy.html")}
          title="Privacy Policy"
          className="w-full h-full min-h-[calc(100vh-73px)] border-0"
        />
      </main>
    </div>
  );
};

export default PrivacyPolicy;
