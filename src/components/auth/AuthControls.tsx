import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronDown, CircleUserRound, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getIsForumAdmin } from "@/lib/forum-api";
import { supabase } from "@/lib/supabase";
import AuthDialog from "@/components/auth/AuthDialog";

interface AuthControlsProps {
  className?: string;
}

const AuthControls = ({ className = "" }: AuthControlsProps) => {
  const { user, supabaseConfigured } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailLabel = user?.email ?? "Signed in user";
  const adminQuery = useQuery({
    queryKey: ["forum-admin", user?.id],
    queryFn: () => getIsForumAdmin(user?.id),
    enabled: Boolean(user?.id) && supabaseConfigured,
  });
  const isAdmin = Boolean(adminQuery.data);

  if (!supabaseConfigured) {
    return null;
  }

  const handleSignOut = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      toast({ title: "Signed out" });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CircleUserRound className="h-4 w-4" />
              Profile
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm">{emailLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin ? (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/features/moderation">
                    <Shield className="mr-2 h-4 w-4" />
                    Moderation
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/analytics">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem onSelect={handleSignOut} disabled={loading} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {loading ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          Log in
        </Button>
      )}

      <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default AuthControls;
