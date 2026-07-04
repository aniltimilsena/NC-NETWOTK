import { useState, useEffect } from 'react';
import { 
  collection, query, where, getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

const RatingOverview = ({ targetUserId }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchStats = async () => {
      const q = query(
        collection(db, 'reviews'),
        where('targetUserId', '==', targetUserId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setStats({ average: 0, total: 0, breakdown: {1:0, 2:0, 3:0, 4:0, 5:0} });
        return;
      }

      const ratings = snapshot.docs.map(d => d.data().rating);
      const total = ratings.length;
      const average = ratings.reduce((a, b) => a + b, 0) / total;
      
      // Count per star
      const breakdown = {1:0, 2:0, 3:0, 4:0, 5:0};
      ratings.forEach(r => {
        const val = Math.round(r);
        if (breakdown[val] !== undefined) {
          breakdown[val]++;
        }
      });

      setStats({ average, total, breakdown });
    };

    fetchStats();
  }, [targetUserId]);

  if (!stats || stats.total === 0) return null;

  return (
    <div style={{
      background: '#111',
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* Average score */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            color: '#FFD700', 
            fontSize: 48, 
            fontWeight: 900,
            margin: 0,
            lineHeight: 1,
          }}>
            {stats.average.toFixed(1)}
          </p>
          <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {[1,2,3,4,5].map(star => (
              <span 
                key={star}
                style={{
                  color: star <= Math.round(stats.average) 
                    ? '#FFD700' : '#333',
                  fontSize: 16,
                }}
              >
                ★
              </span>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: 12, margin: '4px 0 0' }}>
            {stats.total} review{stats.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Rating breakdown bars */}
        <div style={{ flex: 1 }}>
          {[5,4,3,2,1].map(star => (
            <div key={star} style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}>
              <span style={{ color: '#FFD700', fontSize: 12, width: 20 }}>
                {star}★
              </span>
              <div style={{ 
                flex: 1, 
                height: 6, 
                background: '#222',
                borderRadius: 3,
              }}>
                <div style={{
                  height: '100%',
                  width: `${stats.total > 0 
                    ? (stats.breakdown[star] / stats.total) * 100 
                    : 0}%`,
                  background: '#FFD700',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ color: '#555', fontSize: 11, width: 20 }}>
                {stats.breakdown[star]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RatingOverview;
