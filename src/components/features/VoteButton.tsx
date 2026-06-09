import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

interface VoteButtonProps {
  voteCount: number;
  hasVoted: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

const VoteButton = ({ voteCount, hasVoted, disabled, loading, onClick }: VoteButtonProps) => {
  return (
    <Button
      variant={hasVoted ? "default" : "outline"}
      size="sm"
      disabled={disabled || loading}
      onClick={onClick}
      className="min-w-20"
    >
      <ChevronUp className="h-4 w-4" />
      {voteCount}
    </Button>
  );
};

export default VoteButton;
