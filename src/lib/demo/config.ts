export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === "true";
}

export function demoUser() {
  return {
    id: "demo-admin-0000-4000-8000-000000000001",
    email: "demo-admin@lingoleaf.local",
  };
}
