import Image from "next/image";
import { cn, slugify } from "@/lib/utils";
import { categoryInitials } from "@/lib/constants";

/**
 * Event cover art.
 *
 * Events may or may not have an uploaded image. Rather than shipping grey
 * placeholder services (network dependency, unpredictable rendering) we draw a
 * deterministic gradient from the event's category plus its initials. The result
 * is stable per event, on-brand, and works offline — and an uploaded image
 * always takes priority.
 */

const GRADIENTS: Record<string, string> = {
  TECHNICAL_CONFERENCE: "from-[#3d4a5c] via-[#33415a] to-[#232c3d]",
  WORKSHOP: "from-[#8a5100] via-[#a35d0b] to-[#6b3f00]",
  HANDS_ON_LAB: "from-[#0f5a63] via-[#0d4a52] to-[#0a343b]",
  EXECUTIVE_SUMMIT: "from-[#4b3a5e] via-[#3c2f4d] to-[#2a2136]",
  HACKATHON: "from-[#7a2f22] via-[#8c3a2a] to-[#5c2419]",
  WEBINAR: "from-[#2f4858] via-[#2a4a63] to-[#1e3547]",
  COMMUNITY: "from-[#4a5228] via-[#5b6433] to-[#3a401f]",
};

const RINGS: Record<string, string> = {
  TECHNICAL_CONFERENCE: "border-[#7d90ad]",
  WORKSHOP: "border-[#f3c47a]",
  HANDS_ON_LAB: "border-[#79c7d1]",
  EXECUTIVE_SUMMIT: "border-[#b6a0cd]",
  HACKATHON: "border-[#e0a08c]",
  WEBINAR: "border-[#8fb6cf]",
  COMMUNITY: "border-[#c3cc8f]",
};

export function EventCover({
  slug,
  title,
  category,
  imageUrl,
  alt,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority,
}: {
  slug: string;
  title: string;
  category: string;
  imageUrl: string | null;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={alt ?? title}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  // Deterministic rotation/offset from the slug keeps the placeholders varied
  // without storing anything.
  const seed = [...slugify(slug || title)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  return (
    <div
      role="img"
      aria-label={alt ?? title}
      className={cn("relative size-full overflow-hidden bg-gradient-to-br", GRADIENTS[category] ?? GRADIENTS.COMMUNITY, className)}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.5) 22px 23px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-full border"
        style={{
          width: 220,
          height: 220,
          right: -70 + (seed % 5) * 12,
          top: -80 + (seed % 7) * 10,
          borderColor: RINGS[category] ?? RINGS.COMMUNITY,
          borderWidth: 1,
        }}
      />
      <div
        aria-hidden="true"
        className="flex size-full items-center justify-center"
      >
        <span
          className="font-mono text-5xl font-bold tracking-[0.18em] text-white/25"
          style={{ transform: `rotate(-8deg)` }}
        >
          {categoryInitials(category)}
        </span>
      </div>
    </div>
  );
}
