import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface TrackingScript {
  id: string;
  name: string;
  platform: string;
  headCode: string | null;
  bodyCode: string | null;
  isActive: boolean;
}

/**
 * Injects active tracking scripts into the document head/body.
 * Place this component once in your app layout (e.g., App.tsx).
 * Scripts are fetched from the public API and dynamically injected.
 */
export default function TrackingScriptsInjector({ placement = "all" }: { placement?: string }) {
  const { data: scripts } = useQuery<TrackingScript[]>({
    queryKey: ["/api/tracking-scripts/active", placement],
    queryFn: () =>
      fetch(`/api/tracking-scripts/active?placement=${placement}`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000, // Cache for 5 min
    retry: false,
  });

  useEffect(() => {
    if (!scripts || scripts.length === 0) return;

    const injectedElements: HTMLElement[] = [];

    scripts.forEach((script) => {
      // Inject head code
      if (script.headCode) {
        const container = document.createElement("div");
        container.setAttribute("data-tracking-id", script.id);
        container.setAttribute("data-tracking-platform", script.platform);
        container.innerHTML = script.headCode;

        // Extract and execute script elements properly
        const tempScripts = container.querySelectorAll("script");
        tempScripts.forEach((s) => {
          const newScript = document.createElement("script");
          // Copy attributes
          Array.from(s.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          // Copy inline content
          if (s.textContent) {
            newScript.textContent = s.textContent;
          }
          document.head.appendChild(newScript);
          injectedElements.push(newScript);
        });

        // Also inject non-script elements (noscript, meta, link, etc.)
        const nonScripts = container.querySelectorAll(":not(script)");
        nonScripts.forEach((el) => {
          const clone = el.cloneNode(true) as HTMLElement;
          document.head.appendChild(clone);
          injectedElements.push(clone);
        });
      }

      // Inject body code (after <body> open — prepend to body)
      if (script.bodyCode) {
        const container = document.createElement("div");
        container.setAttribute("data-tracking-id", script.id);
        container.setAttribute("data-tracking-platform", script.platform);
        container.innerHTML = script.bodyCode;

        // Move all children to body
        while (container.firstChild) {
          const node = container.firstChild as HTMLElement;
          document.body.insertBefore(node, document.body.firstChild);
          injectedElements.push(node);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      injectedElements.forEach((el) => {
        try {
          el.parentNode?.removeChild(el);
        } catch {
          // Element already removed
        }
      });
    };
  }, [scripts]);

  return null; // This component renders nothing
}
