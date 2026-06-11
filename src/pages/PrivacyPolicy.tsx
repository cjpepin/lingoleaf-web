import SecondaryPageHeader from "@/components/SecondaryPageHeader";
import { withBase } from "@/lib/paths";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SecondaryPageHeader />
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
