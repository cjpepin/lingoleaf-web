/** App mount path on the parent domain (no trailing slash). */
export const ROUTER_BASENAME = "/lingoleaf";

/** Parent portfolio site URL (no trailing slash unless root). */
export const portfolioHome =
  import.meta.env.VITE_PORTFOLIO_URL?.trim() || "https://connorjpepin.com/";

export const portfolioProjects = `${portfolioHome.replace(/\/$/, "")}/#projects`;

/** Vite base URL with trailing slash, e.g. `/lingoleaf/`. */
export const assetBase = import.meta.env.BASE_URL;

export const withBase = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${assetBase}${normalized}`.replace(/([^:]\/)\/+/g, "$1");
};

export const apiPath = (path: string): string => withBase(`api/${path.replace(/^\//, "")}`);

export const absoluteAppUrl = (path: string): string =>
  `${window.location.origin}${withBase(path)}`;
