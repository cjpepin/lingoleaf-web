/** App mount path on the parent domain (no trailing slash). */
export const ROUTER_BASENAME = "/lingoleaf";

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
