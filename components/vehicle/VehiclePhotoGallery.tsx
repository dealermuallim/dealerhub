'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

export type GalleryPhoto = {
  VEHICLE_PHOTO_ID: number;
  IMAGE_URL: string;
  THUMBNAIL_URL: string | null;
  PRIMARY_YN: string;
  ALT_TEXT: string | null;
};

type Props = {
  photos: GalleryPhoto[];
  vehicleName: string;
  accent: string;
  title: ReactNode;
  price: ReactNode;
  status?: ReactNode;
  keyFacts: ReactNode;
  actions: ReactNode;
  detailSpecs: ReactNode;
  description?: ReactNode;
};

export default function VehiclePhotoGallery({
  photos,
  vehicleName,
  accent,
  title,
  price,
  status,
  keyFacts,
  actions,
  detailSpecs,
  description,
}: Props) {
  const initialUrl = useMemo(() => {
    const primary = photos.find((p) => p.PRIMARY_YN === 'Y');
    return primary?.IMAGE_URL || photos[0]?.IMAGE_URL || null;
  }, [photos]);

  const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const urls = useMemo(
    () => photos.map((p) => p.IMAGE_URL).filter(Boolean),
    [photos]
  );

  const hero = activeUrl || initialUrl;
  const activeIndex = hero ? Math.max(0, urls.indexOf(hero)) : 0;

  useEffect(() => {
    setActiveUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function go(delta: number) {
    if (urls.length === 0) return;
    const next = (activeIndex + delta + urls.length) % urls.length;
    setActiveUrl(urls[next]);
    setZoom(1);
  }

  function openLightboxAt(url?: string | null) {
    if (url) setActiveUrl(url);
    if (!(url || hero)) return;
    setZoom(1);
    setLightboxOpen(true);
  }

  // FUTURE STUDIO / CUTOUT INSERTION POINT — no browser bg-removal.
  const studioSlot: ReactNode = null;

  return (
    <div className="dh-vd-root">
      <style>{`
        .dh-vd-root {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          margin-top: 22px;
          overflow-x: hidden;
        }
        .dh-vd-top {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 28px;
          align-items: start;
          width: 100%;
          min-width: 0;
        }
        .dh-vd-top > * { min-width: 0; max-width: 100%; }
        .dh-vd-photo-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          min-width: 0;
        }
        .dh-vd-info {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 28px;
          box-sizing: border-box;
          width: 100%;
        }
        .dh-vd-vehicle-photos {
          margin-top: 36px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }
        .dh-vd-vehicle-photos h2 {
          margin: 0 0 16px;
          font-size: 22px;
          color: #0f172a;
        }
        .dh-vd-full-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
          width: 100%;
        }
        .dh-vd-full-item {
          width: 100%;
          margin: 0;
          padding: 0;
          border: none;
          background: #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          cursor: zoom-in;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dh-vd-full-item img {
          width: 100%;
          height: auto;
          max-width: 100%;
          object-fit: contain;
          display: block;
        }
        @media (max-width: 800px) {
          .dh-vd-top {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              "hero"
              "thumbs"
              "title"
              "price"
              "status"
              "facts"
              "actions"
              "specs"
              "desc";
            gap: 14px;
          }
          .dh-vd-photo-area,
          .dh-vd-info {
            display: contents;
            background: transparent;
            border: none;
            padding: 0;
          }
          .dh-vd-hero { grid-area: hero; }
          .dh-vd-thumbs { grid-area: thumbs; }
          .dh-vd-title { grid-area: title; }
          .dh-vd-price { grid-area: price; }
          .dh-vd-status { grid-area: status; }
          .dh-vd-facts { grid-area: facts; }
          .dh-vd-actions { grid-area: actions; }
          .dh-vd-specs { grid-area: specs; }
          .dh-vd-desc { grid-area: desc; }
          .dh-vd-panel {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 18px;
            box-sizing: border-box;
            width: 100%;
          }
          .dh-vd-vehicle-photos {
            margin-top: 8px;
          }
        }
      `}</style>

      <div className="dh-vd-top">
        <div className="dh-vd-photo-area">
          <div className="dh-vd-hero">
            {hero ? (
              <button
                type="button"
                onClick={() => openLightboxAt(hero)}
                aria-label="Open photo lightbox"
                style={{
                  width: '100%',
                  minHeight: 'min(480px, 62vh)',
                  borderRadius: 14,
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: 'none',
                  padding: 0,
                  cursor: 'zoom-in',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero}
                  alt={vehicleName || 'Vehicle'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'min(480px, 62vh)',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </button>
            ) : (
              <div
                style={{
                  minHeight: 320,
                  borderRadius: 14,
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontWeight: 700,
                }}
              >
                Photo Coming Soon
              </div>
            )}
          </div>

          <div className="dh-vd-thumbs">
            {studioSlot}
            {photos.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                  gap: 8,
                  width: '100%',
                  maxWidth: '100%',
                }}
                role="list"
                aria-label={`Photo thumbnails, ${photos.length} total`}
                data-thumb-count={photos.length}
              >
                {photos.map((photo, index) => {
                  const thumb = photo.THUMBNAIL_URL || photo.IMAGE_URL;
                  const selected = hero === photo.IMAGE_URL;
                  return (
                    <button
                      key={
                        photo.VEHICLE_PHOTO_ID ||
                        `${photo.IMAGE_URL}-thumb-${index}`
                      }
                      type="button"
                      role="listitem"
                      onClick={() => setActiveUrl(photo.IMAGE_URL)}
                      aria-label={
                        photo.ALT_TEXT ||
                        `Show photo ${index + 1} of ${photos.length}`
                      }
                      aria-pressed={selected}
                      style={{
                        padding: 0,
                        border: selected
                          ? `3px solid ${accent}`
                          : '1px solid #cbd5e1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#fff',
                        lineHeight: 0,
                        minHeight: 44,
                        boxShadow: selected
                          ? `0 0 0 2px ${accent}33`
                          : undefined,
                        width: '100%',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt=""
                        style={{
                          width: '100%',
                          height: 64,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="dh-vd-info">
          <div className="dh-vd-title dh-vd-panel">{title}</div>
          <div className="dh-vd-price dh-vd-panel">{price}</div>
          {status ? (
            <div className="dh-vd-status dh-vd-panel">{status}</div>
          ) : null}
          <div className="dh-vd-facts dh-vd-panel">{keyFacts}</div>
          <div className="dh-vd-actions dh-vd-panel">{actions}</div>
          <div className="dh-vd-specs dh-vd-panel">{detailSpecs}</div>
          {description ? (
            <div className="dh-vd-desc dh-vd-panel">{description}</div>
          ) : null}
        </div>
      </div>

      {photos.length > 0 ? (
        <section
          className="dh-vd-vehicle-photos"
          aria-label="Vehicle Photos"
          data-full-photo-count={photos.length}
        >
          <h2>Vehicle Photos</h2>
          <div className="dh-vd-full-stack">
            {photos.map((photo, index) => (
              <button
                key={
                  photo.VEHICLE_PHOTO_ID ||
                  `${photo.IMAGE_URL}-full-${index}`
                }
                type="button"
                className="dh-vd-full-item"
                onClick={() => openLightboxAt(photo.IMAGE_URL)}
                aria-label={
                  photo.ALT_TEXT ||
                  `Open photo ${index + 1} of ${photos.length}`
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.IMAGE_URL}
                  alt={
                    photo.ALT_TEXT ||
                    `${vehicleName || 'Vehicle'} photo ${index + 1}`
                  }
                />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {lightboxOpen && hero ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.92)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 1100,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
            }}
            onTouchStart={(e) => {
              const t = e.changedTouches[0];
              (e.currentTarget as HTMLElement & { _sx?: number })._sx =
                t.clientX;
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0];
              const sx = (e.currentTarget as HTMLElement & { _sx?: number })
                ._sx;
              if (sx == null) return;
              const dx = t.clientX - sx;
              if (dx > 50) go(-1);
              if (dx < -50) go(1);
            }}
          >
            <div
              style={{
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span>
                {urls.length ? `${activeIndex + 1} / ${urls.length}` : '1 / 1'}
              </span>
              <button type="button" onClick={() => go(-1)} style={lbBtn}>
                Prev
              </button>
              <button type="button" onClick={() => go(1)} style={lbBtn}>
                Next
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => (z >= 1.75 ? 1 : 1.75))}
                style={lbBtn}
              >
                {zoom > 1 ? 'Zoom out' : 'Zoom in'}
              </button>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                style={lbBtn}
              >
                Close
              </button>
            </div>
            <div
              style={{
                width: '100%',
                maxHeight: '75vh',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero}
                alt={vehicleName || 'Vehicle'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease',
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const lbBtn: CSSProperties = {
  padding: '10px 14px',
  minHeight: 44,
  borderRadius: 8,
  border: '1px solid #94a3b8',
  background: '#1e293b',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};