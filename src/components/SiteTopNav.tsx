import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import lingoleafIcon from "@/assets/lingoleaf_icon.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AuthControls from "@/components/auth/AuthControls";

const SiteTopNav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const onFeatureForum = location.pathname.startsWith("/features");
  const onAppUpdates = location.pathname.startsWith("/updates");

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <img src={lingoleafIcon} alt="LingoLeaf" className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-semibold tracking-tight">LingoLeaf</span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          {!onFeatureForum ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/features">Feature Forum</Link>
            </Button>
          ) : null}
          {!onAppUpdates ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/updates">App Updates</Link>
            </Button>
          ) : null}
          <AuthControls />
        </div>

        <div className="sm:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-3">
                {!onFeatureForum ? (
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/features">Feature Forum</Link>
                    </Button>
                  </SheetClose>
                ) : null}
                {!onAppUpdates ? (
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/updates">App Updates</Link>
                    </Button>
                  </SheetClose>
                ) : null}
                <AuthControls className="w-full" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default SiteTopNav;
