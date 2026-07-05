import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  collection, query, orderBy, 
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

const AdminDataRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const [downloadLinks, setDownloadLinks] = useState({});

  const { showToast: ctxShowToast } = useOutletContext() || {};
  const showToast = (msg, type = 'success') => {
    if (ctxShowToast) {
      ctxShowToast(msg, type);
    } else {
      alert(msg);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'data_requests'),
      orderBy('requestedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching requests:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  
  const filtered = requests.filter(r => 
    filter === 'all' ? true : r.status === filter
  );

  const pendingCount = requests.filter(
    r => r.status === 'pending'
  ).length;

  
  const handleApprove = async (requestId, userEmail, userName) => {
    try {
      setProcessing(true);
      const token = await auth.currentUser.getIdToken();
      
      const response = await fetch(
        `/api/data-requests/${requestId}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let errMsg = 'Approval failed';
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || parsed.message || errMsg;
        } catch {
          if (text) errMsg = text.slice(0, 150);
        }
        throw new Error(errMsg);
      }

      const result = await response.json();
      const link = result.downloadLink;

      
      if (link) {
        setDownloadLinks(prev => ({ ...prev, [requestId]: link }));
      }

      showToast(`✅ Approved — download link is ready below`);

    } catch (error) {
      showToast('Failed to approve: ' + error.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  
  const handleReject = async (requestId, userEmail) => {
    if (!rejectReason || rejectReason.trim().length < 5) {
      showToast('Please enter a rejection reason', 'error');
      return;
    }

    try {
      setProcessing(true);
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `/api/data-requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let errMsg = 'Rejection failed';
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || parsed.message || errMsg;
        } catch {
          if (text) errMsg = text.slice(0, 150);
        }
        throw new Error(errMsg);
      }

      setRejectReason('');
      setSelectedId(null);
      showToast('Request rejected');

    } catch (error) {
      showToast('Failed to reject', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ 
      padding: 24, 
      background: '#0a0a0a', 
      minHeight: '100vh' 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h1 style={{ color: '#fff', margin: 0 }}>
          Data Archive Requests
        </h1>
        {pendingCount > 0 && (
          <span style={{
            background: 'rgba(251,183,36,0.15)',
            color: '#FBB724',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
          }}>
            {pendingCount} Pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'pending', 'approved', 'rejected', 'downloaded'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === f ? '#00BFFF' : '#333',
              background: filter === f 
                ? 'rgba(0,191,255,0.15)' 
                : 'transparent',
              color: filter === f ? '#00BFFF' : '#888',
              cursor: 'pointer',
              fontSize: 13,
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: '#888' }}>Loading requests...</p>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: '#444', fontSize: 40 }}>📭</p>
          <p style={{ color: '#666' }}>No requests found</p>
        </div>
      )}

      {/* Request cards */}
      {filtered.map(request => (
        <div key={request.id} style={{
          background: '#111',
          border: `1px solid ${
            request.status === 'pending' 
              ? 'rgba(251,183,36,0.3)' 
              : '#222'
          }`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 12,
        }}>
          {/* User info */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div>
              <p style={{ 
                color: '#fff', 
                fontWeight: 700, 
                margin: 0,
                fontSize: 16,
              }}>
                {request.userName || 'Unknown User'}
              </p>
              <p style={{ 
                color: '#888', 
                fontSize: 13, 
                margin: '4px 0 0' 
              }}>
                {request.userEmail}
              </p>
              <p style={{ 
                color: '#666', 
                fontSize: 12, 
                margin: '4px 0 0' 
              }}>
                Requested:{' '}
                {request.requestedAt?.toDate
                  ? new Date(request.requestedAt.toDate())
                      .toLocaleString()
                  : 'Unknown date'}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          {/* Data types requested */}
          <div style={{ 
            display: 'flex', 
            gap: 6, 
            flexWrap: 'wrap',
            marginBottom: 16,
          }}>
            {(request.dataTypes || []).map(type => (
              <span key={type} style={{
                background: 'rgba(0,191,255,0.1)',
                color: '#00BFFF',
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: 11,
                textTransform: 'capitalize',
              }}>
                {type}
              </span>
            ))}
          </div>

          {/* ── Action buttons (pending only) ── */}
          {request.status === 'pending' && (
            <div>
              {selectedId === request.id ? (
                <div>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason (required)..."
                    style={{
                      width: '100%',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: 8,
                      padding: 12,
                      color: '#fff',
                      fontSize: 13,
                      minHeight: 80,
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    marginTop: 8 
                  }}>
                    <button
                      onClick={() => {
                        setSelectedId(null);
                        setRejectReason('');
                      }}
                      style={{
                        background: '#222',
                        color: '#888',
                        border: '1px solid #333',
                        borderRadius: 8,
                        padding: '8px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(
                        request.id, 
                        request.userEmail
                      )}
                      disabled={processing}
                      style={{
                        background: 'rgba(239,68,68,0.2)',
                        color: '#EF4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8,
                        padding: '8px 20px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleApprove(
                      request.id,
                      request.userEmail,
                      request.userName,
                    )}
                    disabled={processing}
                    style={{
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10B981',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 8,
                      padding: '10px 24px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => setSelectedId(request.id)}
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      color: '#EF4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 8,
                      padding: '10px 24px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Download button (approved) ── */}
          {request.status === 'approved' && downloadLinks[request.id] && (
            <div style={{
              marginTop: 12,
              padding: '12px 16px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <p style={{ color: '#10B981', fontWeight: 600, margin: 0, fontSize: 13 }}>
                  📦 Data archive ready
                </p>
                <p style={{ color: '#666', fontSize: 11, margin: '2px 0 0' }}>
                  Link expires in 24 hours · single use
                </p>
              </div>
              <a
                href={downloadLinks[request.id]}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#10B981',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '8px 20px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                📥 Download Data
              </a>
            </div>
          )}

          {/* ── Rejection reason ── */}
          {request.status === 'rejected' && 
           request.rejectionReason && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              borderRadius: 8,
              padding: 12,
              marginTop: 8,
            }}>
              <p style={{ 
                color: '#888', 
                fontSize: 12, 
                margin: '0 0 4px' 
              }}>
                Rejection reason:
              </p>
              <p style={{ 
                color: '#EF4444', 
                fontSize: 13, 
                margin: 0 
              }}>
                {request.rejectionReason}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    pending:    { bg: 'rgba(251,183,36,0.15)', color: '#FBB724', text: '⏳ Pending' },
    approved:   { bg: 'rgba(16,185,129,0.15)', color: '#10B981', text: '✅ Approved' },
    rejected:   { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444', text: '❌ Rejected' },
    downloaded: { bg: 'rgba(0,191,255,0.15)',  color: '#00BFFF', text: '📥 Downloaded' },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      height: 'fit-content',
    }}>
      {s.text}
    </span>
  );
};

export default AdminDataRequests;
