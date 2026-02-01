import SuccessCheckmark from "@/components/SuccessCheckmark";
import { Button } from "@/components/ui/button";
import lingoleafIcon from "@/assets/lingoleaf_icon.png";

const AuthConfirm = () => {
  const handleOpenApp = () => {
    window.location.href = "lingoleaf://";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        {/* App Icon */}
        <div className="flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
          <img
            src={lingoleafIcon}
            alt="Lingoleaf"
            className="w-20 h-20 rounded-2xl shadow-lg"
          />
        </div>

        {/* Success Checkmark */}
        <div className="flex justify-center">
          <SuccessCheckmark />
        </div>

        {/* Success Message */}
        <div className="space-y-3 opacity-0 animate-fade-in-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
          <h1 className="text-3xl font-bold text-foreground">
            You're All Set!
          </h1>
          <p className="text-lg text-muted-foreground">
            Your email has been verified. Time to dive into your next great read!
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
          <Button
            size="lg"
            className="w-full py-6 text-lg font-semibold"
            onClick={handleOpenApp}
          >
            Open Lingoleaf
          </Button>
          
          <p className="mt-4 text-sm text-muted-foreground">
            If the app doesn't open, make sure you have Lingoleaf installed on your device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthConfirm;
