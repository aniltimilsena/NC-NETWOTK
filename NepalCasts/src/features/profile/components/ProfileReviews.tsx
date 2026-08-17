import React from 'react';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { ReviewSkeleton } from '../../../components/ui/Skeleton';

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
  onWriteReviewClick,
  onHelpfulToggle,
  currentUserId,
}: ProfileReviewsProps) {
  const averageRating =
    reviews.length > 0
      ? parseFloat((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
      : 0;

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-white/5 gap-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-white" />
          <span>Reviews &amp; Ratings</span>
        </h2>

        {/* Rating Metrics & Action */}
        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-start">
          {reviews.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-white">{averageRating}</span>
              <div className="flex flex-col">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${star <= Math.round(averageRating) ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/10'
                        }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400">
              <Star className="w-3.5 h-3.5 text-gray-500" />
              <span>No reviews yet</span>
            </div>
          )}

          {!isOwnProfile && (
            <button
              onClick={onWriteReviewClick}
              className="text-xs font-bold py-1.5 px-4 rounded-full bg-[#00BFFF] hover:bg-[#00BFFF]/85 text-black transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              Write Review
            </button>
          )}
        </div>
      </div>

      {/* Reviews Content */}
      <div className="space-y-6">
        {loading ? (
          <ReviewSkeleton count={2} />
        ) : reviews.length > 0 ? (
          <div className="space-y-6 divide-y divide-white/5">
            {reviews.map((review, idx) => {
              const hasLiked = currentUserId && review.helpfulUsers?.includes(currentUserId);
              return (
                <div key={review.id} className={`space-y-3 ${idx > 0 ? 'pt-6' : ''}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 items-center">
                      <Avatar
                        userId={review.reviewerId}
                        src={review.reviewerPhoto}
                        name={review.reviewerName}
                        size="sm"
                      />
                      <div>
                        <span className="text-sm font-bold text-white block">{review.reviewerName}</span>
                        <span className="text-[10px] text-gray-400 font-medium block uppercase tracking-wider">
                          Worked as: {review.workedAs}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-0.5 justify-end">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= review.rating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/10'
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium block mt-1">
                        {review.dateFormatted}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{review.text}</p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => onHelpfulToggle(review.id, e)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold transition-colors ${hasLiked
                          ? 'bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/20'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
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
          <div className="border border-dashed border-white/10 rounded-2xl py-10 px-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">No Reviews Yet</h3>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto mt-1 leading-relaxed font-medium">
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
