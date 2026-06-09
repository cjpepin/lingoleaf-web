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
import AuthDialog from "@/components/auth/AuthDialog";

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthRequiredDialog = ({ open, onOpenChange }: AuthRequiredDialogProps) => {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log in required</DialogTitle>
            <DialogDescription>
              To create posts, vote, or comment in the community sections, log in with your app credentials first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                onOpenChange(false);
                setAuthOpen(true);
              }}
            >
              Log in or create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
};

export default AuthRequiredDialog;
