import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link as LinkIcon, ExternalLink, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_dashboard/links")({
  component: LinksPage,
});

function LinksPage() {
  const links = useQuery(api.links.list);
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    if (!links) return {};
    const filtered = links.filter(
      (l) =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.category.toLowerCase().includes(search.toLowerCase()),
    );
    return filtered.reduce(
      (acc, link) => {
        const cat = link.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(link);
        return acc;
      },
      {} as Record<string, typeof links>,
    );
  }, [links, search]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Links</h1>
        <p className="text-muted-foreground">
          Quick access to important IEEE UCSD resources.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {!links ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, categoryLinks]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryLinks.map((link) => (
                  <a
                    key={link._id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:bg-accent transition-colors group"
                  >
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <LinkIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{link.title}</p>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      {link.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {link.description}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <LinkIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No links found</p>
          <p className="text-sm">Links will appear here when added.</p>
        </div>
      )}
    </div>
  );
}
