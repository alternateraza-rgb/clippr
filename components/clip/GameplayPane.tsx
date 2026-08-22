import { cn } from "@/lib/cn";
import type { GameplayTrack } from "@/lib/agent/types";

function publicGameplayUrl(track: Exclude<GameplayTrack, "none">) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/gameplay/${track}.mp4`;
}

export function GameplayPane({
  track,
  className,
}: {
  track: GameplayTrack;
  className?: string;
}) {
  if (track === "none") return null;
  const src = publicGameplayUrl(track);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-ink", className)}>
      {track === "minecraft" ? <MinecraftLoop /> : null}
      {track === "gta" ? <GtaLoop /> : null}
      {track === "subway" ? <SubwayLoop /> : null}
      {src ? (
        <video
          src={src}
          className="absolute inset-0 z-10 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => {
            (e.currentTarget as HTMLVideoElement).style.display = "none";
          }}
        />
      ) : null}
      <div className="absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-black/25 to-transparent" />
    </div>
  );
}

function MinecraftLoop() {
  return (
    <div className="absolute inset-0 bg-[#6d8f4e]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#87b4e0] via-[#87b4e0] to-transparent h-[42%]" />
      <div
        className="absolute inset-x-0 bottom-0 h-[70%] origin-bottom animate-[mc-scroll_8s_linear_infinite]"
        style={{
          backgroundImage:
            "linear-gradient(#5a7a3c 0 12px, transparent 12px), linear-gradient(90deg, #4a6a30 0 12px, #6d8f4e 12px 24px, #3d5a28 24px 36px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div className="absolute left-1/2 top-[38%] h-8 w-8 -translate-x-1/2 rounded-sm bg-[#c4a574] shadow-[0_10px_0_#3d5a28]" />
      <style>{`
        @keyframes mc-scroll {
          from { transform: translateY(0) scaleY(1); }
          to { transform: translateY(36px) scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function GtaLoop() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#1b1530] via-[#c45a3a] to-[#2a1a14]">
      <div className="absolute inset-x-0 bottom-[28%] h-[22%] bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[32%] bg-[#1a1410]">
        <div className="absolute left-1/2 top-3 h-[2px] w-[70%] -translate-x-1/2 animate-[road_0.6s_linear_infinite] bg-[repeating-linear-gradient(90deg,#f5e6a8_0_18px,transparent_18px_36px)] opacity-80" />
      </div>
      <div className="absolute bottom-[30%] left-[8%] h-16 w-10 bg-[#0c0a09]/80" />
      <div className="absolute bottom-[30%] left-[22%] h-24 w-8 bg-[#0c0a09]/70" />
      <div className="absolute bottom-[30%] right-[18%] h-20 w-12 bg-[#0c0a09]/75" />
      <div className="absolute bottom-[30%] right-[6%] h-28 w-7 bg-[#0c0a09]/65" />
      <style>{`
        @keyframes road {
          from { background-position: 0 0; }
          to { background-position: 36px 0; }
        }
      `}</style>
    </div>
  );
}

function SubwayLoop() {
  return (
    <div className="absolute inset-0 bg-[#14110f]">
      <div className="absolute inset-y-0 left-[18%] w-px bg-brand-tint/40 animate-[rush_0.7s_linear_infinite]" />
      <div className="absolute inset-y-0 right-[18%] w-px bg-brand-tint/40 animate-[rush_0.7s_linear_infinite]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0c0a09_80%)]" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-brand" />
      <style>{`
        @keyframes rush {
          from { transform: scaleY(1); opacity: 0.2; }
          to { transform: scaleY(1.4); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
