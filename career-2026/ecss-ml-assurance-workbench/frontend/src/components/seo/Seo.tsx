import { useEffect } from "react";
import { SITE_URL } from "../../utils/seo";


interface SeoInput {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
}

function setMeta(selector: string, attr: string, value: string, contentKey: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, contentKey);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function Seo({ title, description, path = "/", type = "website" }: SeoInput): null {
  useEffect(() => {
    const fullTitle = title.includes("|") ? title : `${title} | ML Assurance Portfolio`;
    document.title = fullTitle;
    setMeta('meta[name="description"]', "name", description, "description");
    setMeta('meta[property="og:title"]', "property", fullTitle, "og:title");
    setMeta('meta[property="og:description"]', "property", description, "og:description");
    setMeta('meta[property="og:type"]', "property", type, "og:type");
    setMeta('meta[property="og:url"]', "property", SITE_URL ? `${SITE_URL}${path}` : path, "og:url");
    setMeta('meta[name="twitter:card"]', "name", "summary", "twitter:card");
    setMeta('meta[name="twitter:title"]', "name", fullTitle, "twitter:title");
    setMeta('meta[name="twitter:description"]', "name", description, "twitter:description");
    if (SITE_URL) {
      let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = `${SITE_URL}${path}`;
    }
  }, [title, description, path, type]);
  return null;
}

export function JsonLd({ data }: { data: Record<string, unknown> }): null {
  useEffect(() => {
    const id = "ld-json";
    const previous = document.getElementById(id);
    if (previous) previous.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }, [JSON.stringify(data)]);
  return null;
}

