import { useRef } from 'react';
import { motion } from 'framer-motion';

export default function CropModal({ imageSrc, isCircular, onConfirm, onClose }) {
    const imgRef = useRef(null);

    const handleSave = () => {
        const canvas = document.createElement('canvas');
        const img = imgRef.current;
        if (!img) return;

        // Draw the image at its natural size (no cropping or scaling)
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], isCircular ? 'avatar.webp' : 'cover.webp', {
                    type: 'image/webp',
                    lastModified: Date.now(),
                });
                onConfirm(file);
            }
        }, 'image/webp', 0.85);
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
                    Confirm Photo
                </h3>

                <div className="relative w-full h-[260px] overflow-hidden bg-black/60 border border-white/5 rounded-2xl flex items-center justify-center select-none">
                    <img 
                        ref={imgRef} 
                        src={imageSrc} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        draggable={false}
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="flex-1 py-3 rounded-xl bg-[#ffb400] hover:bg-[#ffa000] text-black font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-[#ffb400]/20 cursor-pointer"
                    >
                        Confirm
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
