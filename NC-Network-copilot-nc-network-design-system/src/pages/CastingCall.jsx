import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, ClipboardList, SortDesc, ChevronDown, Check, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import { subscribeToCastingCalls } from '../services/casting';
import { CATEGORIES } from '../constants/categories';

export default function CastingCall({ onNavigate }) {
  const [filter, setFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [savedIds, setSavedIds] = useState([]); 
  const [activeSort, setActiveSort] = useState('recent');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const types = ['All', 'Saved', ...CATEGORIES];
  const sortOptions = [
    { id: 'recent', label: 'Latest Posted' },
    { id: 'budget', label: 'Highest Budget' },
    { id: 'urgent', label: 'Urgent First' }
  ];

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToCastingCalls(filter, (data) => {
      setCalls(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [filter]);

  return (
    <div className="min-h-screen bg-nc-dark pt-2 pb-24">
      {/* Header */}
      <div className="bg-nc-surface border-b border-nc-border">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
          <h1 className="text-3xl font-black text-white">Casting Calls</h1>
          <p className="text-nc-muted mt-2">Open opportunities from verified productions</p>
          <div className="flex items-center justify-between mt-6 gap-4 relative">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1 min-w-0 pr-20">
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    filter === t
                      ? 'bg-nc-accent text-nc-darker shadow-lg shadow-nc-accent/20'
                      : 'bg-nc-card border border-nc-border text-nc-secondary hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full bg-nc-card border border-nc-border text-sm font-bold text-nc-secondary hover:text-white transition-all ${isSortOpen ? 'border-nc-accent text-nc-accent' : ''}`}
              >
                <SortDesc size={14} />
                <span className="hidden sm:inline">Sort</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-[#111] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-[100] py-2 overflow-hidden"
                  >
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setActiveSort(opt.id); setIsSortOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          activeSort === opt.id 
                            ? 'bg-nc-accent text-nc-darker' 
                            : 'text-nc-secondary hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                           {opt.id === 'urgent' && <Zap size={12} className={activeSort === 'urgent' ? 'text-nc-darker' : 'text-red-400'} />}
                           {opt.label}
                        </div>
                        {activeSort === opt.id && <Check size={12} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 space-y-5">
        {isLoading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-nc-card border border-nc-border rounded-3xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-3 w-1/2">
                    <div className="flex gap-2"><div className="h-6 w-16 bg-nc-surface rounded-lg" /><div className="h-6 w-20 bg-nc-surface rounded-lg" /></div>
                    <div className="h-6 bg-nc-surface rounded w-3/4" />
                    <div className="h-4 bg-nc-surface rounded w-1/2" />
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-6 bg-nc-surface rounded w-24 ml-auto" />
                    <div className="h-4 bg-nc-surface rounded w-32 ml-auto" />
                  </div>
                </div>
                <div className="pt-4 border-t border-nc-border flex justify-between items-center">
                  <div className="h-4 bg-nc-surface rounded w-1/4" />
                  <div className="h-10 bg-nc-surface rounded w-32" />
                </div>
              </div>
            ))}
          </>
        ) : (
          (() => {
            let filteredCalls = calls.filter(c => filter === 'Saved' ? savedIds.includes(c.id) : true);
            
            // Apply Sorting
            filteredCalls = [...filteredCalls].sort((a, b) => {
              if (activeSort === 'budget') {
                const getBudget = (s) => {
                  if (!s || typeof s !== 'string') return 0;
                  return parseInt(s.replace(/[^0-9]/g, '')) || 0;
                };
                return getBudget(b.budget) - getBudget(a.budget);
              }
              if (activeSort === 'urgent') {
                return (b.urgent === a.urgent) ? 0 : b.urgent ? -1 : 1;
              }
              return 0; // Default to 'recent' (already handled by service)
            });
            if (filteredCalls.length === 0) {
              return (
                <div className="text-center py-20 bg-nc-card border border-nc-border rounded-2xl px-4">
                  <div className="text-nc-accent mb-4 flex justify-center">
                    <Bookmark size={48} className="opacity-20" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No {filter === 'Saved' ? 'Saved Casting Calls' : 'Casting Calls Found'}</h3>
                  <p className="text-nc-muted text-sm max-w-sm mx-auto mb-6">
                    {filter === 'Saved' 
                      ? "You haven't bookmarked any opportunities yet. Browse the board to save some!" 
                      : "Be the first to post a casting call or check back later."}
                  </p>
                  {filter !== 'Saved' && (
                    <Button 
                      size="sm" 
                      onClick={() => onNavigate('casting-create')} 
                      className="px-8 shadow-lg shadow-nc-accent/20"
                    >
                      Create Casting Call
                    </Button>
                  )}
                </div>
              );
            }
            return filteredCalls.map(call => (
            <div
            key={call.id}
            className="bg-nc-card border border-nc-border rounded-3xl p-6 hover:border-nc-accent/30 transition-all"
          >
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {call.urgent && <Tag color="red">Urgent</Tag>}
                  <Tag color="blue">{call.type}</Tag>
                  <Tag color="default">{call.location || 'Remote'}</Tag>
                </div>
                <h2 className="text-xl font-black text-white">{call.title}</h2>
                <p className="text-nc-muted mt-1">{call.production || 'Independent Production'}</p>
              </div>
              <div className="text-right">
                <div className="text-nc-accent font-black text-lg">{call.budget || 'Competitive'}</div>
                <div className="text-nc-muted text-sm">Deadline: {call.deadline || 'Open'}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-nc-muted text-xs uppercase tracking-wider mb-2">Roles Available</p>
                <div className="flex gap-2 flex-wrap">
                  {call.roles?.map((role, idx) => {
                    const roleName = typeof role === 'string' ? role : (role.name || 'Untitled Role');
                    return <Tag key={idx} color="default">{roleName}</Tag>;
                  })}
                </div>
              </div>
              <div className="pt-4 border-t border-nc-border flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-3">
                  <button onClick={() => onNavigate('casting-detail', call.id)} className="text-nc-muted text-sm hover:text-white transition-colors flex items-center gap-1.5">
                    <ClipboardList size={14} /> View Details
                  </button>
                  <button 
                    onClick={() => setSavedIds(prev => prev.includes(call.id) ? prev.filter(id => id !== call.id) : [...prev, call.id])}
                    className={`text-sm transition-colors ${savedIds.includes(call.id) ? 'text-nc-accent font-medium hover:text-sky-300' : 'text-nc-muted hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Bookmark size={14} fill={savedIds.includes(call.id) ? "currentColor" : "none"} /> 
                      {savedIds.includes(call.id) ? 'Saved' : 'Save'}
                    </span>
                  </button>
                </div>
                <Button onClick={() => onNavigate('casting-detail', call.id)}>Apply Now</Button>
              </div>
            </div>
          </div>
          ));
          })()
        )}
      </div>
    </div>
  );
}
