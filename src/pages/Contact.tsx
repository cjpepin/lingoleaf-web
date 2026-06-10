import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, AlertCircle } from "lucide-react";
import lingoleafIcon from "@/assets/lingoleaf_icon.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiPath } from "@/lib/paths";

const Contact = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    setErrorMessage("");
    setStatus("loading");

    try {
      const response = await fetch(apiPath("contact"), {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to send message. Please try again.");
    }
  };

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
          <img src={lingoleafIcon} alt="Lingoleaf" className="w-8 h-8 rounded-lg" />
        </div>
      </header>

      <main className="flex-1 px-6 py-12 max-w-xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-foreground mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          Have a question or feedback? Send us a message and we&apos;ll get back to you at support@lingoleaf.app.
        </p>

        {status === "success" ? (
          <div className="rounded-lg border border-border bg-muted/50 p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-12 h-12 text-primary" />
            <h2 className="font-semibold text-foreground">Message sent!</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll get back to you as soon as possible.
            </p>
            <Button variant="outline" onClick={() => setStatus("idle")}>
              Send another message
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Your name"
                required
                autoComplete="name"
                maxLength={100}
                disabled={status === "loading"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
                autoComplete="email"
                maxLength={320}
                disabled={status === "loading"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="What's this about?"
                maxLength={140}
                disabled={status === "loading"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Your message..."
                rows={5}
                required
                minLength={10}
                maxLength={4000}
                disabled={status === "loading"}
              />
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            <Button type="submit" size="lg" disabled={status === "loading"} className="gap-2">
              {status === "loading" ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send message
                </>
              )}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
};

export default Contact;
