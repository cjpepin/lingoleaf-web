export function isDemoMode(): boolean {
  return import.meta.env?.VITE_DEMO_MODE === "true";
}

export function demoUser() {
  return {
    id: "00000000-0000-4000-8000-000000000099",
    email: "demo-admin@lingoleaf.local",
  };
}
