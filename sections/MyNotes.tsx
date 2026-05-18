import React, { useState, useEffect } from 'react';
import { ElevatedMetallicCard, Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { IconFileText, IconPlus, IconChevronLeft, IconSave, IconClock, IconEdit, IconTrash } from '../components/Icons';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { addToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function MyNotes() {
  const { profile } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewState, setViewState] = useState<'grid' | 'creating' | 'editing'>('grid');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  
  // Temporary states for editing
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchNotes();
    }
  }, [profile?.id, viewState]); // Refresh notes when returning to grid

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        // Fallback for missing table - graceful degradation
        if (error.code === '42P01') {
           console.log("Notes table not found. Please run the SQL migration.");
        } else {
           throw error;
        }
      }
      if (data) {
        setNotes(data as Note[]);
      }
    } catch (err: any) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditTitle('');
    setIsModalOpen(true);
  };

  const handleModalCreate = () => {
    if (!editTitle.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'Please enter a note title.' });
      return;
    }
    setEditContent('');
    setCurrentNote(null);
    setIsModalOpen(false);
    setViewState('creating');
  };

  const handleOpenNote = (note: Note) => {
    setCurrentNote(note);
    setEditTitle(note.title);
    setEditContent(note.content || '');
    setViewState('editing');
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    if (!editTitle.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'Title cannot be empty.' });
      return;
    }

    setIsSaving(true);
    try {
      if (viewState === 'creating') {
        const { data, error } = await supabase
          .from('user_notes')
          .insert({
            user_id: profile.id,
            title: editTitle,
            content: editContent
          })
          .select()
          .single();

        if (error) throw error;
        
        setCurrentNote(data as Note);
        setViewState('editing');
        addToast({ type: 'success', title: 'Created', message: 'Note created successfully.' });
      } else if (viewState === 'editing' && currentNote) {
        const { error } = await supabase
          .from('user_notes')
          .update({
            title: editTitle,
            content: editContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentNote.id);

        if (error) throw error;
        addToast({ type: 'success', title: 'Saved', message: 'Note updated successfully.' });
      }
    } catch (err: any) {
      console.error('Error saving note:', err);
      // Fallback if table doesn't exist
      if (err.code === '42P01') {
        addToast({ type: 'error', title: 'Database Setup Required', message: 'The user_notes table has not been created yet.' });
      } else {
        addToast({ type: 'error', title: 'Error', message: 'Failed to save note.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDelete(id);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      const { error } = await supabase.from('user_notes').delete().eq('id', noteToDelete);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      addToast({ type: 'success', title: 'Deleted', message: 'Note deleted successfully.' });
    } catch (err) {
      console.error('Delete error:', err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete note.' });
    } finally {
      setNoteToDelete(null);
    }
  };

  const handleBack = () => {
    setViewState('grid');
    setCurrentNote(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // --- EDITOR VIEW ---
  if (viewState === 'creating' || viewState === 'editing') {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0 rounded-full w-10 h-10 p-0 flex items-center justify-center">
              <IconChevronLeft size={18} />
            </Button>
            
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter note title..."
              className="bg-transparent border-none text-2xl font-black text-white focus:outline-none focus:ring-0 placeholder:text-gray-600 w-full"
              autoFocus={viewState === 'creating'}
            />
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {currentNote && (
              <p className="text-[10px] text-gray-500 font-medium hidden sm:block uppercase tracking-wider">
                Last updated: {formatDate(currentNote.updated_at)}
              </p>
            )}
            <Button
              variant="metallic"
              size="sm"
              leftIcon={<IconSave size={16} />}
              onClick={handleSave}
              isLoading={isSaving}
            >
              Save Note
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <ElevatedMetallicCard className="h-full flex flex-col min-h-0 shadow-2xl border-white/[0.05]" bodyClassName="flex-1 p-0 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-white/[0.05] bg-white/[0.02] flex items-center gap-2">
              <IconEdit size={14} className="text-gray-400" />
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-500">Editor (Markdown)</span>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Start typing your note here... (Markdown supported)"
              className="flex-1 w-full bg-transparent border-none resize-none p-6 text-sm text-gray-300 focus:outline-none focus:ring-0 placeholder:text-gray-600 leading-relaxed font-mono"
            />
          </ElevatedMetallicCard>

          <ElevatedMetallicCard className="h-full flex flex-col min-h-0 shadow-2xl border-white/[0.05] bg-black/20" bodyClassName="flex-1 p-0 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            <div className="px-4 py-2 border-b border-white/[0.05] bg-surface-card flex items-center gap-2 sticky top-0 z-10">
              <IconFileText size={14} className="text-brand-primary" />
              <span className="text-[10px] uppercase tracking-widest font-black text-brand-primary">Live Preview</span>
            </div>
            <div className="p-8 prose prose-invert max-w-none prose-headings:text-white prose-a:text-brand-primary hover:prose-a:text-brand-secondary prose-strong:text-white prose-code:text-brand-primary prose-code:bg-brand-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-surface-card prose-pre:border prose-pre:border-white/10 prose-blockquote:border-brand-primary prose-blockquote:bg-brand-primary/5 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-300">
              {editContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {editContent}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-600 italic">Preview will appear here...</p>
              )}
            </div>
          </ElevatedMetallicCard>
        </div>
      </div>
    );
  }

  // --- GRID VIEW ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-end">
        <Button 
          variant="metallic" 
          onClick={handleCreateNew}
          leftIcon={<IconPlus size={18} />}
        >
          New Note
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">


          {/* Existing Notes */}
          {notes.map(note => (
            <ElevatedMetallicCard 
              key={note.id} 
              className="min-h-[220px] flex flex-col group cursor-pointer hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300"
              bodyClassName="flex-1 flex flex-col p-6 relative"
              onClick={() => handleOpenNote(note)}
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                   onClick={(e) => handleDelete(note.id, e)}
                   className="w-8 h-8 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-gray-400 hover:text-brand-error hover:border-brand-error/50 hover:bg-brand-error/10 transition-colors"
                 >
                   <IconTrash size={14} />
                 </button>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10 shadow-inner group-hover:border-brand-primary/30 transition-colors">
                  <IconFileText size={18} className="text-gray-300 group-hover:text-brand-primary transition-colors" />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">
                {note.title}
              </h3>
              
              <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-1">
                {note.content?.substring(0, 150) || <span className="italic">Empty note</span>}
              </p>
              
              <div className="pt-4 border-t border-white/[0.05] mt-auto flex items-center justify-between text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                {(() => {
                  const isEdited = note.updated_at && note.created_at && Math.abs(new Date(note.updated_at).getTime() - new Date(note.created_at).getTime()) > 1000;
                  const dateToUse = isEdited ? note.updated_at : (note.created_at || note.updated_at || new Date().toISOString());
                  return (
                    <>
                      <span>{isEdited ? 'Last Updated At' : 'Created At'}</span>
                      <span className="text-right">
                        {new Date(dateToUse).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; {new Date(dateToUse).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </>
                  );
                })()}
              </div>
            </ElevatedMetallicCard>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New Note" 
        size="md"
        isElevatedHeader
        isElevatedFooter
        footer={(
          <div className="flex justify-end gap-3 items-center">
            <Button variant="recessed" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="metallic" onClick={handleModalCreate}>
              Create Note
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Note Title</label>
            <Input
              variant="recessed"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Brainstorming session..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleModalCreate();
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        title="Delete Note"
        size="sm"
        isElevatedHeader
        isElevatedFooter
        footer={(
          <div className="flex justify-end gap-3 items-center">
            <Button variant="recessed" onClick={() => setNoteToDelete(null)}>
              Cancel
            </Button>
            <Button variant="metallic-error" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        )}
      >
        <div className="p-2 space-y-4">
          <p className="text-gray-300 text-sm">
            Are you sure you want to delete this note? This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};
