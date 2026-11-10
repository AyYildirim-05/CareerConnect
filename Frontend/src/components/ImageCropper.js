import React, { useState, useRef } from 'react';

/**
 * Crop applied to every company image before upload.
 * Shows a W x H crop box; the output is (W*outScale) x (H*outScale) in `type`.
 * Drag (or arrow keys) to move, slider to zoom. Calls onCrop with the cropped File.
 * Defaults: 256x256 PNG logo, at most 256 KB raw, so it always fits the 300 KB logo limit.
 */
export default function ImageCropper({ src, onCrop, onCancel, width: W = 256, height: H = 256, outScale = 1, type = 'image/png', name = 'logo', hint = 'Drag to position your logo and zoom to crop it to a square.' }) {
  const imgRef = useRef(null);
  const drag = useRef(null);
  const [size, setSize] = useState(null); // natural image size, known once loaded
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Scale that makes the image just cover the box, times the user's zoom
  const cover = (z) => Math.max(W / size.w, H / size.h) * z;
  const scale = size ? cover(zoom) : 1;

  // Keep the image covering the whole box so the crop never has empty edges
  const clamp = (o, s = scale) => {
    const maxX = size ? (size.w * s - W) / 2 : 0;
    const maxY = size ? (size.h * s - H) / 2 : 0;
    return {
      x: Math.max(-maxX, Math.min(maxX, o.x)),
      y: Math.max(-maxY, Math.min(maxY, o.y))
    };
  };

  const width = size ? size.w * scale : 0;
  const height = size ? size.h * scale : 0;
  const left = (W - width) / 2 + offset.x;
  const top = (H - height) / 2 + offset.y;

  const handleZoom = (e) => {
    const z = Number(e.target.value);
    setZoom(z);
    setOffset(o => clamp(o, cover(z)));
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ...offset };
  };

  const handlePointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }));
  };

  const handleKeyDown = (e) => {
    const step = { ArrowLeft: [10, 0], ArrowRight: [-10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key];
    if (!step) return;
    e.preventDefault();
    setOffset(o => clamp({ x: o.x + step[0], y: o.y + step[1] }));
  };

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W * outScale;
    canvas.height = H * outScale;
    const ctx = canvas.getContext('2d');
    ctx.scale(outScale, outScale);
    ctx.drawImage(imgRef.current, left, top, width, height);
    canvas.toBlob(blob => onCrop(new File([blob], `${name}.${type.split('/')[1]}`, { type })), type, 0.85);
  };

  return (
    <div>
      <p>{hint}</p>
      <div
        tabIndex={0}
        role="img"
        aria-label={`${name} crop area. Use arrow keys to move the image.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={handleKeyDown}
        style={{ position: 'relative', width: W, height: H, overflow: 'hidden', border: '1px solid #ccc', cursor: 'move', touchAction: 'none' }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
          style={{ position: 'absolute', left, top, width: width || undefined, height: height || undefined, maxWidth: 'none', userSelect: 'none' }}
        />
      </div>
      <label htmlFor={`${name}-zoom`}>Zoom:</label>{' '}
      <input id={`${name}-zoom`} type="range" min="1" max="4" step="0.01" value={zoom} onChange={handleZoom} disabled={!size} />
      <br />
      <button type="button" onClick={handleCrop} disabled={!size}>Crop &amp; Upload</button>
      {' '}
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  );
}
