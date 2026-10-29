import React, { useState, useRef } from 'react';

// Output is a BOX x BOX PNG: at most 256 KB raw, so it always fits the 500 KB logo limit
const BOX = 256;

/**
 * Square crop for logos that are too big to upload as-is.
 * Drag (or arrow keys) to move, slider to zoom. Calls onCrop with a PNG File.
 */
export default function LogoCropper({ src, onCrop, onCancel }) {
  const imgRef = useRef(null);
  const drag = useRef(null);
  const [size, setSize] = useState(null); // natural image size, known once loaded
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Scale that makes the image just cover the box, times the user's zoom
  const scale = size ? (BOX / Math.min(size.w, size.h)) * zoom : 1;

  // Keep the image covering the whole box so the crop never has empty edges
  const clamp = (o, s = scale) => {
    const maxX = size ? (size.w * s - BOX) / 2 : 0;
    const maxY = size ? (size.h * s - BOX) / 2 : 0;
    return {
      x: Math.max(-maxX, Math.min(maxX, o.x)),
      y: Math.max(-maxY, Math.min(maxY, o.y))
    };
  };

  const width = size ? size.w * scale : 0;
  const height = size ? size.h * scale : 0;
  const left = (BOX - width) / 2 + offset.x;
  const top = (BOX - height) / 2 + offset.y;

  const handleZoom = (e) => {
    const z = Number(e.target.value);
    setZoom(z);
    setOffset(o => clamp(o, (BOX / Math.min(size.w, size.h)) * z));
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
    canvas.width = BOX;
    canvas.height = BOX;
    canvas.getContext('2d').drawImage(imgRef.current, left, top, width, height);
    canvas.toBlob(blob => onCrop(new File([blob], 'logo.png', { type: 'image/png' })), 'image/png');
  };

  return (
    <div>
      <p>This image is over 500 KB. Drag to position it and zoom to crop it.</p>
      <div
        tabIndex={0}
        role="img"
        aria-label="Logo crop area. Use arrow keys to move the image."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={handleKeyDown}
        style={{ position: 'relative', width: BOX, height: BOX, overflow: 'hidden', border: '1px solid #ccc', cursor: 'move', touchAction: 'none' }}
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
      <label htmlFor="logo-zoom">Zoom:</label>{' '}
      <input id="logo-zoom" type="range" min="1" max="4" step="0.01" value={zoom} onChange={handleZoom} disabled={!size} />
      <br />
      <button type="button" onClick={handleCrop} disabled={!size}>Crop &amp; Upload</button>
      {' '}
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  );
}
