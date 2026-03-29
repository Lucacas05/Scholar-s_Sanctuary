import { useState } from "react";
import type { ImgHTMLAttributes } from "react";

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc: string;
}

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  onError,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(
    typeof src !== "string" || src.trim().length === 0,
  );
  const resolvedSrc = failed ? fallbackSrc : src;

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={(event) => {
        if (!failed) {
          setFailed(true);
        }

        onError?.(event);
      }}
    />
  );
}
