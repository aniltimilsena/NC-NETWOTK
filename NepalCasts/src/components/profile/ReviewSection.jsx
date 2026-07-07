import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  collection, addDoc, query, 
  where, getDocs, serverTimestamp,
  doc, updateDoc, increment, orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

const ReviewSection = ({ targetUserId, targetUserName, user: propUser, showToast: propShowToast }) => {
  const context = useOutletContext();
  const currentUser = propUser || context?.user;

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [reviews, setReviews] = useState([]);

  
  useEffect(() => {
    if (!targetUserId) return;
    loadReviews();
    checkExistingReview();
  }, [targetUserId, currentUser?.uid]);

  const loadReviews = async () => {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('targetUserId', '==', targetUserId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setReviews(snapshot.docs.map(d => ({ 
        id: d.id, ...d.data() 
      })));
    } catch (error) {
      console.error('Load reviews error:', error);
    }
  };

  
  const checkExistingReview = async () => {
    if (!currentUser?.uid || !targetUserId) return;
    
    try {
      const q = query(
        collection(db, 'reviews'),
        where('targetUserId', '==', targetUserId),
        where('reviewerId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setUserReview({ 
          id: snapshot.docs[0].id, 
          ...snapshot.docs[0].data() 
        });
        
        setRating(snapshot.docs[0].data().rating);
        setReviewText(snapshot.docs[0].data().text);
      }
    } catch (error) {
      console.error('Check existing review error:', error);
    }
  };

  const handleSubmitReview = async () => {
    
    setError('');

    
    if (!currentUser?.uid) {
      setError('Please log in to leave a review');
      return;
    }

    
    if (currentUser.uid === targetUserId) {
      setError('You cannot review your own profile');
      return;
    }

    
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    
    if (!reviewText.trim()) {
      setError('Please write a review');
      return;
    }

    if (reviewText.trim().length < 10) {
      setError('Review must be at least 10 characters');
      return;
    }

    if (reviewText.trim().length > 500) {
      setError('Review must be under 500 characters');
      return;
    }

    try {
      setLoading(true);

      const reviewData = {
        targetUserId,
        targetUid: targetUserId,          
        targetUserName,
        reviewerId: currentUser.uid,      
        reviewerName: currentUser.displayName || 'Anonymous',
        reviewerPhoto: currentUser.photoURL || null,
        rating: Number(rating),            
        text: reviewText.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (userReview) {
        
        await updateDoc(
          doc(db, 'reviews', userReview.id),
          {
            rating: Number(rating),
            text: reviewText.trim(),
            updatedAt: serverTimestamp(),
          }
        );
      } else {
        
        await addDoc(collection(db, 'reviews'), reviewData);

        
        await updateDoc(
          doc(db, 'users', targetUserId),
          {
            reviewCount: increment(1),
            totalRating: increment(Number(rating)),
          }
        );
      }

      setSuccess(true);
      setReviewText('');
      loadReviews(); 

      
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      console.error('Submit review error:', error);
      if (error && error.code === 'permission-denied') {
        setError(
          'Permission denied. Make sure you are logged in ' +
          'and have not already reviewed this profile.'
        );
      } else {
        setError('Failed to submit review. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  
  if (currentUser?.uid === targetUserId) {
    return null; 
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ color: '#fff', marginBottom: 16 }}>
        {userReview ? 'Edit Your Review' : 'Leave a Review'}
      </h3>

      {/* Star Rating Selector */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 16 
      }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              setRating(star);
              setError('');
            }}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 32,
              padding: 4,
              color: star <= (hoveredRating || rating)
                ? '#FFD700'   
                : '#333',     
              transition: 'color 0.15s ease',
            }}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span style={{ 
            color: '#FFD700', 
            alignSelf: 'center',
            fontSize: 14,
            fontWeight: 600,
          }}>
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Review Text */}
      <textarea
        value={reviewText}
        onChange={(e) => {
          setReviewText(e.target.value);
          setError('');
        }}
        placeholder={`Share your experience working with ${targetUserName}...`}
        maxLength={500}
        style={{
          width: '100%',
          background: '#1a1a1a',
          border: `1px solid ${error ? '#EF4444' : '#333'}`,
          borderRadius: 10,
          padding: 14,
          color: '#fff',
          fontSize: 14,
          resize: 'vertical',
          minHeight: 100,
          boxSizing: 'border-box',
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: 1.5,
        }}
      />

      {/* Character count */}
      <p style={{ 
        color: reviewText.length > 450 ? '#F59E0B' : '#555',
        fontSize: 12,
        textAlign: 'right',
        margin: '4px 0 12px',
      }}>
        {reviewText.length}/500
      </p>

      {/* Error message */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 12,
          color: '#EF4444',
          fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 12,
          color: '#10B981',
          fontSize: 13,
        }}>
          ✅ Review submitted successfully!
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmitReview}
        disabled={loading || rating === 0 || !reviewText.trim()}
        style={{
          width: '100%',
          padding: '14px',
          background: loading || rating === 0 || !reviewText.trim()
            ? '#222'
            : 'linear-gradient(135deg, #00BFFF, #0099DD)',
          color: loading || rating === 0 || !reviewText.trim()
            ? '#555'
            : '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          cursor: loading || rating === 0 || !reviewText.trim()
            ? 'not-allowed'
            : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {loading 
          ? 'Submitting...' 
          : userReview 
          ? 'Update Review' 
          : 'Submit Review'
        }
      </button>

      {/* Existing reviews list */}
      {reviews.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ color: '#fff', marginBottom: 16 }}>
            Reviews ({reviews.length})
          </h3>
          {reviews.map(review => (
            <ReviewCard 
              key={review.id} 
              review={review}
              isOwn={review.reviewerId === currentUser?.uid}
            />
          ))}
        </div>
      )}
    </div>
  );
};


const ReviewCard = ({ review, isOwn }) => (
  <div style={{
    background: '#111',
    border: `1px solid ${isOwn ? 'rgba(0,191,255,0.2)' : '#222'}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 12,
      marginBottom: 8,
    }}>
      {/* Reviewer avatar */}
      <img
        src={review.reviewerPhoto || '/default-avatar.png'}
        alt={review.reviewerName}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
        onError={(e) => {
          e.target.src = '/default-avatar.png';
        }}
      />
      <div>
        <p style={{ 
          color: '#fff', 
          fontWeight: 600, 
          margin: 0,
          fontSize: 14,
        }}>
          {review.reviewerName}
          {isOwn && (
            <span style={{ 
              color: '#00BFFF', 
              fontSize: 11,
              marginLeft: 6,
            }}>
              (Your review)
            </span>
          )}
        </p>
        {/* Star display */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(star => (
            <span 
              key={star}
              style={{ 
                color: star <= review.rating ? '#FFD700' : '#333',
                fontSize: 14,
              }}
            >
              ★
            </span>
          ))}
        </div>
      </div>
      {/* Date */}
      <p style={{ 
        color: '#555', 
        fontSize: 12, 
        margin: '0 0 0 auto',
      }}>
        {review.createdAt?.toDate
          ? new Date(review.createdAt.toDate())
              .toLocaleDateString()
          : 'Recently'}
      </p>
    </div>
    <p style={{ 
      color: '#ccc', 
      fontSize: 14, 
      margin: 0,
      lineHeight: 1.6,
    }}>
      {review.text}
    </p>
  </div>
);

export default ReviewSection;
