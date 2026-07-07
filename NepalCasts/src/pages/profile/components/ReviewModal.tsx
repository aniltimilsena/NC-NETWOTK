import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '../../../components/ui';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, text: string, workedAs: string) => Promise<void>;
}

export default function ReviewModal({
  isOpen,
  onClose,
  onSubmit
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [workedAs, setWorkedAs] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workedAs.trim()) {
      alert("Please specify the role you worked as (e.g. Actor, Director).");
      return;
    }
    if (!text.trim()) {
      alert("Please enter review details.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, text.trim(), workedAs.trim());
      setWorkedAs('');
      setText('');
      setRating(5);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] w-full max-w-md rounded-[2.2rem] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/5">
          <h3 className="text-lg font-black text-white">Write a Review</h3>
          <button 
            onClick={onClose} 
            className="text-nc-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Star Rating */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-black block">Rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform active:scale-95"
                >
                  <Star
                    className={`w-7 h-7 ${star <= rating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/10'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Worked As */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-black block">Worked as</label>
            <input
              type="text"
              placeholder="e.g. Actor, Director, Cameraman"
              value={workedAs}
              onChange={(e) => setWorkedAs(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00BFFF]/30 transition-colors"
            />
          </div>

          {/* Review Text */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-black block">Review Details</label>
            <textarea
              rows={4}
              placeholder="Describe your working experience with this talent..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00BFFF]/30 transition-colors resize-none"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              loading={submitting}
              className="w-full"
            >
              Submit Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
