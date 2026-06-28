import { useState, CSSProperties } from "react";

interface LazyImageProps {
  src: string;
  alt?: string;
  imgStyle?: CSSProperties;
  wrapStyle?: CSSProperties;
  className?: string;
  draggable?: boolean;
}

export function LazyImage({ src, alt = "", imgStyle, wrapStyle, className, draggable }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...wrapStyle }}>
      {!loaded && (
        <div
          className="img-skeleton"
          style={{ position: "absolute", inset: 0, borderRadius: "inherit" }}
        />
      )}
      <img
        src={src}
        alt={alt}
        draggable={draggable}
        className={className}
        onLoad={() => setLoaded(true)}
        style={{
          ...imgStyle,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
      />
    </div>
  );
}

interface LazyBgImageProps {
  src: string;
  children?: React.ReactNode;
  style?: CSSProperties;
}

export function LazyBgImage({ src, children, style }: LazyBgImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ position: "relative", ...style }}>
      <div
        className={loaded ? undefined : "img-skeleton"}
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: loaded ? `url(${src})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "opacity 0.4s ease",
          opacity: loaded ? 1 : 1,
        }}
      />
      <img
        src={src}
        alt=""
        onLoad={() => setLoaded(true)}
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      />
      <div style={{ position: "relative", zIndex: 1, height: "100%", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
