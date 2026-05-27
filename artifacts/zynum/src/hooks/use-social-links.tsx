import { useEffect, useState } from "react";

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

export function useSocialLinks() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    fetch("/api/v1/social-links")
      .then((r) => r.json())
      .then((d) => setLinks(d.links ?? []))
      .catch(() => {});
  }, []);

  return links;
}
