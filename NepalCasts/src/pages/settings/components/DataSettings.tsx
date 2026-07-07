import React, { useState } from 'react';
import { Database, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { ServiceResult } from '../../../types';

interface DataSettingsProps {
  requests: any[];
  onRequestExport: () => Promise<ServiceResult>;
  showAlert: (message: string, type?: any) => void;
}

export default function DataSettings({ requests, onRequestExport, showAlert }: DataSettingsProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      const res = await onRequestExport();
      if (res.success) {
        showAlert('Data export request submitted successfully!', 'success');
      } else {
        showAlert(res.error || 'Failed to submit request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to submit request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* GDPR Info panel */}
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-[#00BFFF]" />
          GDPR & Account Data Export
        </h2>
        <p className="text-xs text-nc-muted leading-relaxed text-left">
          Under the General Data Protection Regulation (GDPR), you have the right to request a download of all personal data we store associated with your account, including profile info and message archives.
        </p>

        <div className="pt-2 text-left">
          <Button
            onClick={handleRequest}
            loading={submitting}
            disabled={requests.some(r => r.status === 'pending')}
            className="rounded-2xl px-6"
          >
            Request Data Download Archive
          </Button>
        </div>
      </div>

      {/* Requests History List */}
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
        <h2 className="text-lg font-black text-white">Request History</h2>

        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((req) => {
              const date = req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'N/A';
              
              return (
                <div key={req.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <div className="text-left space-y-1 min-w-0">
                    <span className="text-sm font-bold text-white block truncate">Archive Request</span>
                    <span className="text-[10px] text-nc-muted block font-medium">Requested on {date}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                      </div>
                    )}

                    {req.status === 'rejected' && (
                      <div className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Rejected
                      </div>
                    )}

                    {req.status === 'approved' && (
                      <>
                        <div className="flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Ready
                        </div>
                        {req.downloadLink && (
                          <a
                            href={req.downloadLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#00BFFF] hover:bg-[#00BFFF]/80 text-black p-2 rounded-xl transition-all"
                            title="Download Archive"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-nc-muted py-6">No data export history found.</p>
        )}
      </div>
    </div>
  );
}
export type { DataSettingsProps };
