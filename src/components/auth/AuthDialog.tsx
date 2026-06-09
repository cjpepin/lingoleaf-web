import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "signin" | "signup";
}

const AuthDialog = ({ open, onOpenChange, defaultMode = "signin" }: AuthDialogProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const returnToCurrentPage = `${window.location.origin}${window.location.pathname}`;
  const emailConfirmRedirectTo = `${window.location.origin}/email-confirmed`;

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: returnToCurrentPage },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        toast({ title: "Signed in" });
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: emailConfirmRedirectTo },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Account created",
        description: "Check your email to confirm your account if required.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: mode === "signin" ? "Sign in failed" : "Sign up failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "signin" ? "Log in" : "Create account"}</DialogTitle>
          <DialogDescription>
            Use your app credentials to vote, comment, and post feature requests.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Log in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => handleOAuth("google")} disabled={loading}>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={() => handleOAuth("apple")} disabled={loading}>
            Continue with Apple
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={handleEmailAuth}
            disabled={loading || !email.trim() || password.length < 6}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Log in" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
