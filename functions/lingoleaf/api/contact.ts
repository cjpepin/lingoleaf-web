export const onRequestPost = async (context: {
  request: Request;
  env: { RESEND_API_KEY?: string };
}) => {
  const { request, env } = context;
  const apiKey = env.RESEND_API_KEY;
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });

  const requestOrigin = new URL(request.url).origin;
  const headerOrigin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  const incomingOrigin = headerOrigin ?? referer;

  if (incomingOrigin) {
    try {
      if (new URL(incomingOrigin).origin !== requestOrigin) {
        return json({ error: "Origin not allowed." }, 403);
      }
    } catch {
      return json({ error: "Origin not allowed." }, 403);
    }
  }

  if (!apiKey) {
    return json({ error: "Contact form is not configured." }, 500);
  }

  try {
    const formData = await request.formData();
    const honeypot = formData.get("website");

    if (typeof honeypot === "string" && honeypot.trim()) {
      return json({ success: true });
    }

    const readField = (key: string) => {
      const value = formData.get(key);
      return typeof value === "string" ? value.trim() : "";
    };

    const name = readField("name");
    const email = readField("email");
    const subject = readField("subject") || "Contact form submission";
    const message = readField("message");

    if (!name || name.length > 100) {
      return json({ error: "Name is required and must be 100 characters or fewer." }, 400);
    }

    if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Enter a valid email address." }, 400);
    }

    if (subject.length > 140) {
      return json({ error: "Subject must be 140 characters or fewer." }, 400);
    }

    if (message.length < 10 || message.length > 4000) {
      return json({ error: "Message must be between 10 and 4000 characters." }, 400);
    }

    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const html = `
      <h2>New contact form submission</h2>
      <p><strong>From:</strong> ${escape(name)} &lt;${escape(email)}&gt;</p>
      <p><strong>Subject:</strong> ${escape(subject)}</p>
      <hr />
      <p>${escape(message).replace(/\n/g, "<br />")}</p>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Lingoleaf Contact <contact@lingoleaf.app>",
        to: ["support@lingoleaf.app"],
        reply_to: email,
        subject: `[Lingoleaf] ${subject}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      console.error("Resend API error", { status: resendResponse.status });
      return json({ error: "Failed to send message. Please try again." }, 500);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Contact form error", error);
    return json({ error: "Failed to send message. Please try again." }, 500);
  }
};
