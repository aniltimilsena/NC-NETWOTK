import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function CropModal({ imageSrc, isCircular, onConfirm, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleSave = () => {
    const canvas = document.createElement('canvas');
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    // Output target dimensions
    const outputSize = isCircular ? 400 : 1200;
    const aspect = isCircular ? 1 : 16 / 9; // Cover aspect ratio
    const viewWidth = outputSize;
    const viewHeight = isCircular ? outputSize : Math.round(outputSize / aspect);

    canvas.width = viewWidth;
    canvas.height = viewHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fill with black fallback background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Natural Dimensions of image
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Viewport dimensions in crop container
    const containerRect = container.getBoundingClientRect();
    const cropWidth = isCircular ? 200 : containerRect.width * 0.9;
    const cropHeight = isCircular ? 200 : cropWidth / aspect;

    // Aspect calculations
    const containerAspect = cropWidth / cropHeight;
    const imgAspect = imgWidth / imgHeight;
    let renderWidth, renderHeight;

    if (imgAspect > containerAspect) {
      renderHeight = cropHeight;
      renderWidth = cropHeight * imgAspect;
    } else {
      renderWidth = cropWidth;
      renderHeight = cropWidth / imgAspect;
    }

    const zoomWidth = renderWidth * scale;
    const zoomHeight = renderHeight * scale;

    // Normalized coordinates mapped to output canvas space
    const scaleFactor = viewWidth / cropWidth;

    // Calculate rendering offsets relative to center
    const xOffset = ((cropWidth - zoomWidth) / 2 + position.x) * scaleFactor;
    const yOffset = ((cropHeight - zoomHeight) / 2 + position.y) * scaleFactor;

    ctx.drawImage(img, xOffset, yOffset, zoomWidth * scaleFactor, zoomHeight * scaleFactor);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], isCircular ? 'avatar.jpg' : 'cover.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        onConfirm(file);
      }
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0f0f13] border border-white/10 rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative flex flex-col gap-4 text-left"
      >
        <h3 className="text-white font-black text-sm uppercase tracking-widest text-center">
          {isCircular ? 'Crop Profile Image' : 'Position Banner Cover'}
        </h3>
        <p className="text-nc-muted text-xs text-center font-medium">
          Drag to position, use the slider to zoom
        </p>

        {/* Viewport Box */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className="relative w-full h-[260px] overflow-hidden bg-black/60 border border-white/5 rounded-2xl cursor-move flex items-center justify-center select-none"
        >
          {/* Draggable/Panned Image */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Source preview"
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out'
            }}
          />

          {/* Masks */}
          {isCircular ? (
            <div className="absolute w-[200px] h-[200px] rounded-full border-2 border-dashed border-[#00BFFF] z-10 pointer-events-none shadow-[0_0_0_9999px_rgba(10,10,10,0.75)]" />
          ) : (
            <div className="absolute w-[90%] h-[130px] border-2 border-dashed border-[#00BFFF] z-10 pointer-events-none shadow-[0_0_0_9999px_rgba(10,10,10,0.75)]" />
          )}
        </div>

        {/* Zoom Control Slider */}
        <div className="space-y-1.5 px-1">
          <div className="flex justify-between items-center text-[10px] text-nc-muted font-bold uppercase tracking-wider">
            <span>Zoom</span>
            <span className="text-[#00BFFF]">{Math.round(scale * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="3" 
            step="0.01"
            value={scale} 
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00BFFF] outline-none focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-[#00BFFF] hover:bg-[#0099e6] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-[#00BFFF]/20"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}
