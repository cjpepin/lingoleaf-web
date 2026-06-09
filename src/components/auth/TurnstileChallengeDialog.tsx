import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { verifyHumanChallenge } from "@/lib/human-verification";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback?: (token: string) => void }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

const TurnstileChallengeDialog = ({ open, onOpenChange, onVerified }: TurnstileChallengeDialogProps) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!open || !containerRef.current || !siteKey || !window.turnstile) {
      return;
    }

    const id = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (nextToken: string) => {
        setToken(nextToken);
      },
    });

    setWidgetId(id);

    return () => {
      if (window.turnstile && id) {
        window.turnstile.remove(id);
      }
      setWidgetId(null);
      setToken(null);
    };
  }, [open, siteKey]);

  const handleVerify = async () => {
    if (!token) {
      toast({
        title: "Verification required",
        description: "Please complete the challenge first.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    try {
      await verifyHumanChallenge(token);
      onOpenChange(false);
      onVerified();
      toast({ title: "Verification complete" });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      if (window.turnstile && widgetId) {
        window.turnstile.reset(widgetId);
      }
      setToken(null);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick security check</DialogTitle>
          <DialogDescription>
            Please complete this verification before creating or commenting on feature requests.
          </DialogDescription>
        </DialogHeader>

        {!siteKey ? (
          <p className="text-sm text-destructive">Turnstile site key is not configured.</p>
        ) : (
          <div className="rounded-md border p-4">
            <div ref={containerRef} />
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleVerify} disabled={verifying || !siteKey}>
            {verifying ? "Verifying..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TurnstileChallengeDialog;
