import { portfolioProjects } from "@/lib/paths";

type Props = {
  className?: string;
};

export default function PortfolioBackLink({ className }: Props) {
  return (
    <a
      href={portfolioProjects}
      className={
        className ??
        "text-sm text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      Portfolio
    </a>
  );
}
