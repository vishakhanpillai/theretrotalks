import React, { useState, useEffect } from "react";
import { Tv, ExternalLink, Globe } from "lucide-react";

interface ProviderItem {
  logo_path: string | null;
  provider_id: number;
  provider_name: string;
  display_priority: number;
  logoUrl: string | null;
}

interface RegionWatchData {
  link?: string;
  flatrate?: ProviderItem[];
  rent?: ProviderItem[];
  buy?: ProviderItem[];
}

interface WatchProvidersResponse {
  movieId: number;
  results: Record<string, RegionWatchData>;
}

interface WatchProvidersWidgetProps {
  tmdbId: number;
  mediaType?: "movie" | "tv";
  movieTitle: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
};

export const WatchProvidersWidget: React.FC<WatchProvidersWidgetProps> = ({
  tmdbId,
  mediaType = "movie",
  movieTitle,
}) => {
  const [data, setData] = useState<Record<string, RegionWatchData> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCountry, setSelectedCountry] = useState<string>("IN");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/movies/${tmdbId}/watch-providers?mediaType=${mediaType}`)
      .then((res) => {
        if (!res.ok) throw new Error("No watch providers found");
        return res.json();
      })
      .then((resp: WatchProvidersResponse) => {
        if (isMounted) {
          const results = resp.results || {};
          setData(results);

          // If India has no data, check US, else pick first available region
          if (!results["IN"] && results["US"]) {
            setSelectedCountry("US");
          } else if (!results["IN"] && Object.keys(results).length > 0) {
            setSelectedCountry(Object.keys(results)[0]);
          } else {
            setSelectedCountry("IN");
          }
        }
      })
      .catch(() => {
        if (isMounted) setData(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tmdbId, mediaType]);

  if (loading) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.06] space-y-3 font-poppins shadow-xl animate-pulse">
        <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.06]">
          <div className="w-3.5 h-3.5 rounded bg-white/[0.08]" />
          <div className="h-3 bg-white/[0.08] rounded w-28" />
        </div>
        <div className="flex justify-between items-center py-0.5">
          <div className="h-2.5 bg-white/[0.05] rounded w-12" />
          <div className="h-4 bg-white/[0.06] rounded-md w-24" />
        </div>
        <div className="flex gap-2 pt-0.5">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05]" />
          <div className="w-10 h-10 rounded-xl bg-white/[0.05]" />
          <div className="w-10 h-10 rounded-xl bg-white/[0.05]" />
        </div>
      </div>
    );
  }

  // If no regions or results returned at all, fail gracefully without breaking UI
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const availableRegions = Object.keys(data);
  const currentRegionData = data[selectedCountry] || null;

  const streamProviders = currentRegionData?.flatrate || [];
  // Deduplicate rent & buy providers so the same store isn't repeated twice
  const rentAndBuyMap = new Map<number, ProviderItem>();
  (currentRegionData?.rent || []).forEach((p) => rentAndBuyMap.set(p.provider_id, p));
  (currentRegionData?.buy || []).forEach((p) => rentAndBuyMap.set(p.provider_id, p));
  const buyRentProviders = Array.from(rentAndBuyMap.values());

  const hasAnyProviders = streamProviders.length > 0 || buyRentProviders.length > 0;
  const justWatchLink = currentRegionData?.link || `https://www.themoviedb.org/${mediaType}/${tmdbId}/watch`;

  const primaryPills = ["IN", "US", "GB"].filter((code) => availableRegions.includes(code));

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.06] space-y-3.5 font-poppins shadow-xl group">
      
      {/* Header: Title in one line */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.06]">
        <Tv className="w-3.5 h-3.5 text-[#ff5500]" />
        <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-300 font-semibold">
          Where to Watch
        </h3>
      </div>

      {/* Region Selector Below Title */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-400">
          Region
        </span>
        <div className="flex items-center gap-1">
          {primaryPills.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedCountry(code)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-all cursor-pointer ${
                selectedCountry === code
                  ? "bg-[#ff5500] text-black shadow-[0_0_10px_rgba(255,85,0,0.3)] font-semibold"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
              title={COUNTRY_NAMES[code] || code}
            >
              {code}
            </button>
          ))}

          {/* More Countries Select */}
          {availableRegions.length > primaryPills.length && (
            <div className="relative inline-flex items-center">
              <select
                aria-label="Select Country"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="bg-[#12151c] text-zinc-400 hover:text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-white/[0.08] focus:border-[#ff5500] focus:outline-none cursor-pointer"
              >
                {!primaryPills.includes(selectedCountry) && (
                  <option value={selectedCountry}>
                    {COUNTRY_NAMES[selectedCountry] || selectedCountry}
                  </option>
                )}
                {availableRegions
                  .filter((code) => !primaryPills.includes(code))
                  .slice(0, 20)
                  .map((code) => (
                    <option key={code} value={code}>
                      {COUNTRY_NAMES[code] || code}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Providers Display */}
      {hasAnyProviders ? (
        <div className="space-y-3 pt-0.5">
          {/* Subscription Streaming (Flatrate) */}
          {streamProviders.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Stream
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {streamProviders.map((provider) => (
                  <a
                    key={provider.provider_id}
                    href={justWatchLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group/logo w-10 h-10 rounded-xl overflow-hidden bg-[#161a24] border border-white/[0.08] hover:border-[#ff5500] hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
                    title={`Watch on ${provider.provider_name}`}
                  >
                    {provider.logoUrl ? (
                      <img
                        src={provider.logoUrl}
                        alt={provider.provider_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[9px] text-zinc-300 text-center font-mono p-1">
                        {provider.provider_name.slice(0, 3)}
                      </span>
                    )}

                    {/* Hover Glow */}
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/logo:opacity-100 transition-opacity pointer-events-none" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Rent & Buy */}
          {buyRentProviders.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 inline-block" />
                Rent or Buy
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {buyRentProviders.map((provider) => (
                  <a
                    key={provider.provider_id}
                    href={justWatchLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group/logo w-8 h-8 rounded-lg overflow-hidden bg-[#161a24] border border-white/[0.06] hover:border-zinc-400 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center justify-center opacity-85 hover:opacity-100 cursor-pointer"
                    title={`Rent/Buy on ${provider.provider_name}`}
                  >
                    {provider.logoUrl ? (
                      <img
                        src={provider.logoUrl}
                        alt={provider.provider_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[8px] text-zinc-400 text-center font-mono p-0.5">
                        {provider.provider_name.slice(0, 2)}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State for Selected Country */
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center space-y-1">
          <p className="text-[11px] text-zinc-400 font-inter">
            Not currently streaming in{" "}
            <span className="text-zinc-200 font-medium">
              {COUNTRY_NAMES[selectedCountry] || selectedCountry}
            </span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">
            Check other regions or physical media
          </p>
        </div>
      )}

      {/* Attribution & JustWatch Link */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-inter text-zinc-500">
        <span className="flex items-center gap-1 text-zinc-400 text-[10px]">
          <Globe className="w-3 h-3 text-[#ff5500]" />
          <span>JustWatch Data</span>
        </span>

        <a
          href={justWatchLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-zinc-400 hover:text-[#ff7a29] transition-colors"
          title={`View full streaming details for ${movieTitle}`}
        >
          <span>Options</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

    </div>
  );
};
