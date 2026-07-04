import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  collection, query, where, 
  orderBy, onSnapshot, 
  doc, deleteDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const SavedCastingCalls = ({ user: propUser, onNavigate, showToast: propShowToast }) => {
  const navigate = useNavigate();
  const context = useOutletContext();
  const currentUser = propUser || context?.user;
  const showToast = propShowToast || context?.showToast || ((msg, type) => alert(msg));

  const [savedCalls, setSavedCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Query saved_calls collection
    const q = query(
      collection(db, 'saved_calls'),
      where('userId', '==', currentUser.uid),
      orderBy('savedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Get casting call details for each saved item
      const savedData = await Promise.all(
        snapshot.docs.map(async (savedDoc) => {
          const saveData = savedDoc.data();
          
          // Fetch the actual casting call data
          try {
            const castingDoc = await getDoc(
              doc(db, 'casting_calls', saveData.castingId)
            );
            
            if (castingDoc.exists()) {
              return {
                saveId: savedDoc.id,
                savedAt: saveData.savedAt,
                castingId: saveData.castingId,
                ...castingDoc.data(),
              };
            }
            return null; // casting deleted
          } catch {
            return null;
          }
        })
      );

      // Filter out nulls (deleted castings)
      setSavedCalls(savedData.filter(Boolean));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Remove from saved
  const handleUnsave = async (saveId, castingTitle) => {
    try {
      setRemoving(saveId);
      await deleteDoc(doc(db, 'saved_calls', saveId));
      showToast(`Removed "${castingTitle}" from saved`, 'success');
    } catch (error) {
      showToast('Failed to remove', 'error');
    } finally {
      setRemoving(null);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      navigate(-1);
    }
  };

  const handleBrowse = () => {
    if (onNavigate) {
      onNavigate('casting');
    } else {
      navigate('/casting');
    }
  };

  const handleViewDetails = (castingId) => {
    if (onNavigate) {
      onNavigate('casting-detail', castingId);
    } else {
      navigate(`/casting/${castingId}`);
    }
  };

  return (
    <div style={{ 
      maxWidth: 600, 
      margin: '0 auto', 
      padding: 16 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        marginBottom: 24,
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ←
        </button>
        <h1 style={{ color: '#fff', margin: 0, fontSize: 20 }}>
          Saved Casting Calls
        </h1>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: 120,
              background: '#1a1a1a',
              borderRadius: 12,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && savedCalls.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: 48, margin: 0 }}>🎬</p>
          <h3 style={{ color: '#fff', margin: '16px 0 8px' }}>
            No Saved Casting Calls
          </h3>
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px' }}>
            Save casting calls to find them here later
          </p>
          <button
            onClick={handleBrowse}
            style={{
              background: 'linear-gradient(135deg, #00BFFF, #0099DD)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Browse Casting Calls
          </button>
        </div>
      )}

      {/* Saved casting call cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {savedCalls.map(casting => (
          <div
            key={casting.saveId}
            style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Banner image */}
            {casting.bannerUrl && (
              <div style={{ position: 'relative', height: 120 }}>
                <img
                  src={casting.bannerUrl}
                  alt={casting.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                }} />
              </div>
            )}

            {/* Content */}
            <div style={{ padding: 16 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    color: '#fff', 
                    margin: '0 0 4px',
                    fontSize: 16,
                  }}>
                    {casting.title}
                  </h3>
                  <p style={{ 
                    color: '#888', 
                    fontSize: 13, 
                    margin: '0 0 8px' 
                  }}>
                    {casting.category}
                  </p>

                  {/* Deadline badge */}
                  {casting.deadline && (
                    <DeadlineBadge deadline={casting.deadline} />
                  )}
                </div>

                {/* Unsave button */}
                <button
                  onClick={() => handleUnsave(
                    casting.saveId, 
                    casting.title
                  )}
                  disabled={removing === casting.saveId}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    marginLeft: 12,
                  }}
                >
                  {removing === casting.saveId ? '...' : '🗑 Remove'}
                </button>
              </div>

              {/* View details button */}
              <button
                onClick={() => handleViewDetails(casting.castingId)}
                style={{
                  width: '100%',
                  marginTop: 12,
                  background: 'rgba(0,191,255,0.1)',
                  color: '#00BFFF',
                  border: '1px solid rgba(0,191,255,0.2)',
                  borderRadius: 8,
                  padding: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Deadline badge component
const DeadlineBadge = ({ deadline }) => {
  const deadlineDate = deadline?.toDate 
    ? deadline.toDate() 
    : new Date(deadline);
  const daysLeft = Math.ceil(
    (deadlineDate - new Date()) / (1000 * 60 * 60 * 24)
  );

  const color = daysLeft < 3 
    ? '#EF4444'   // red — urgent
    : daysLeft < 7 
    ? '#F59E0B'   // yellow — soon
    : '#888';     // grey — plenty of time

  return (
    <span style={{
      color,
      fontSize: 12,
      fontWeight: 600,
    }}>
      ⏰ {daysLeft > 0
        ? `${daysLeft} days left`
        : daysLeft === 0
        ? 'Deadline today!'
        : 'Deadline passed'
      }
    </span>
  );
};

export default SavedCastingCalls;
