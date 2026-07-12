import React from 'react';
import { Star, MessageSquare, ThumbsUp, Sparkles } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto: string;
  rating: number;
  text: string;
  workedAs: string;
  helpfulCount: number;
  helpfulUsers: string[];
  dateFormatted: string;
}

interface ProfileReviewsProps {
  reviews: Review[];
  loading: boolean;
  isOwnProfile: boolean;
  hasWorkedTogether: boolean;
  onWriteReviewClick: () => void;
  onHelpfulToggle: (reviewId: string, event: React.MouseEvent) => void;
  currentUserId?: string;
}

export default function ProfileReviews({
  reviews,
  loading,
  isOwnProfile,
  hasWorkedTogether,
  onWriteReviewClick,
  onHelpfulToggle,
  currentUserId
}: ProfileReviewsProps) {
  const averageRating = reviews.length > 0 
    ? parseFloat((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)) 
    : 0;

  return (
    <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 md:p-8 space-y-6">
      {/* Unified Reviews Header & Rating Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00BFFF]/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#00BFFF]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Client & Peer Feedback</h2>
            <p className="text-[10px] text-nc-muted">Verified reviews and ratings from casting calls</p>
          </div>
        </div>

        {/* Rating Score Summary Pill */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 self-stretch md:self-auto justify-between md:justify-start">
          <div className="flex flex-col items-center shrink-0">
            <span className="text-2xl font-black text-white leading-none">{averageRating}</span>
            <span className="text-[8px] text-nc-muted uppercase tracking-widest mt-1.5 font-bold">Average</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="space-y-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${star <= Math.round(averageRating) ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/10'}`}
                />
              ))}
            </div>
            <span className="text-[9px] text-nc-muted font-bold block">{reviews.length} Verified Reviews</span>
          </div>

          {!isOwnProfile && hasWorkedTogether && (
            <>
              <div className="h-6 w-px bg-white/10" />
              <button 
                onClick={onWriteReviewClick} 
                className="text-[10px] font-black uppercase py-2 px-4 rounded-xl bg-[#00BFFF] hover:bg-[#00BFFF]/85 text-black transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                Write Review
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reviews Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 skeleton rounded-2xl w-full animate-pulse" />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-5 divide-y divide-white/5">
            {reviews.map((review, idx) => {
              const hasLiked = currentUserId && review.helpfulUsers?.includes(currentUserId);
              return (
                <div key={review.id} className={`pt-5 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 items-center">
                      <Avatar 
                        src={review.reviewerPhoto} 
                        name={review.reviewerName} 
                        size="sm"
                      />
                      <div>
                        <span className="text-sm font-bold text-white block">{review.reviewerName}</span>
                        <span className="text-[10px] text-nc-muted font-semibold block uppercase tracking-wider">
                          Worked as: {review.workedAs}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-0.5 justify-end">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= review.rating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/10'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-nc-muted font-bold block mt-1">{review.dateFormatted}</span>
                    </div>
                  </div>

                  <p className="text-nc-muted text-sm leading-relaxed">{review.text}</p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => onHelpfulToggle(review.id, e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-colors ${
                        hasLiked 
                          ? 'bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/20' 
                          : 'bg-white/5 border-white/5 text-nc-muted hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Helpful ({review.helpfulCount || 0})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 rounded-3xl py-12 px-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5 text-nc-muted" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">No Reviews Yet</h3>
              <p className="text-[11px] text-nc-muted max-w-xs mx-auto mt-1 leading-relaxed">
                When you work with directors or actors on castings, they can leave reviews and ratings here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export type { Review };
