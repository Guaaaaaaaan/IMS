import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Save, AlertTriangle } from 'lucide-react';

interface StickySaveBarProps {
  show: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
  isDirty?: boolean; // Can be used to trigger 'show'
}

export function StickySaveBar({ show, onSave, onDiscard, isSaving }: StickySaveBarProps) {
  if (!show) return null;

  return (
    <div className="fixed top-16 left-64 right-0 bg-zinc-900 text-white z-40 px-6 py-3 flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Unsaved changes</span>
      </div>
      <div className="flex items-center gap-3">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onDiscard}
          className="bg-zinc-700 hover:bg-zinc-600 text-white border-transparent"
        >
          Discard
        </Button>
        <Button 
          size="sm" 
          onClick={onSave} 
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white border-transparent"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
