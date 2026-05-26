/**
 * SAYSANAA wordmark — inline SVG.
 * Self-contained, scales crisp at any size, no 404 risk on deploys.
 * Set `height` (px) — width auto via viewBox.
 */
export default function Logo({
  height = 32,
  showTagline = true,
  className,
}: {
  height?: number;
  showTagline?: boolean;
  className?: string;
}) {
  // viewBox width chosen so default scale ≈ original logo aspect (roof 60 + text 380 ≈ 12:1)
  return (
    <svg
      height={height}
      viewBox="0 0 460 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="SAYSANAA"
    >
      {/* House-roof icon: two peaks (signature triangle silhouette) */}
      <g fill="currentColor">
        <path d="M5 70 L40 25 L60 50 L46 50 L46 70 Z" />
        <path d="M48 70 L70 42 L92 70 Z" />
      </g>

      {/* SAYSANAA wordmark */}
      <text
        x="110"
        y="58"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="44"
        fontWeight="700"
        letterSpacing="2"
        fill="currentColor"
      >
        SAYSANAA
      </text>

      {/* artify tagline */}
      {showTagline && (
        <text
          x="240"
          y="88"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="16"
          fontWeight="300"
          letterSpacing="6"
          fill="currentColor"
          opacity="0.7"
        >
          artify
        </text>
      )}
    </svg>
  );
}
