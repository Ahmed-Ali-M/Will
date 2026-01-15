import React, { useEffect, useRef } from 'react';
import { Trash2, Copy, Edit2, Unlink, Layers, ArrowUpRight, Palette } from 'lucide-react';

export type ContextMenuType = 'TASK' | 'GROUP' | 'CANVAS' | 'CONNECTION';

export interface ContextMenuProps {
    x: number;
    y: number;
    type: ContextMenuType;
    targetId?: string;
    onClose: () => void;
    onAction: (action: string, targetId?: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, type, targetId, onClose, onAction }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Prevent menu from going off-screen
    const style = {
        top: y,
        left: x,
        transform: `translate(${x + 200 > window.innerWidth ? '-100%' : '0'}, ${y + 300 > window.innerHeight ? '-100%' : '0'})`
    };

    return (
        <div 
            ref={menuRef}
            className="fixed z-[100] w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 animate-[scaleIn_0.1s_ease-out] overflow-hidden"
            style={style}
            onContextMenu={(e) => e.preventDefault()}
        >
            {type === 'TASK' && (
                <>
                    <button onClick={() => onAction('edit', targetId)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Edit2 size={14} className="text-slate-400" /> Edit
                    </button>
                    <button onClick={() => onAction('duplicate', targetId)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Copy size={14} className="text-slate-400" /> Duplicate
                    </button>
                    <button onClick={() => onAction('unlink', targetId)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Unlink size={14} className="text-slate-400" /> Disconnect All
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                    <button onClick={() => onAction('delete', targetId)} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                        <Trash2 size={14} /> Delete
                    </button>
                </>
            )}

            {type === 'GROUP' && (
                <>
                    <button onClick={() => onAction('rename', targetId)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Edit2 size={14} className="text-slate-400" /> Rename
                    </button>
                    <button onClick={() => onAction('ungroup', targetId)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Unlink size={14} className="text-slate-400" /> Delete Group Only
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                    <button onClick={() => onAction('delete', targetId)} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                        <Trash2 size={14} /> Delete All
                    </button>
                </>
            )}

            {type === 'CONNECTION' && (
                <>
                    <button onClick={() => onAction('delete_connection', targetId)} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                        <Unlink size={14} /> Remove Connection
                    </button>
                </>
            )}

            {type === 'CANVAS' && (
                <>
                    <button onClick={() => onAction('new_task')} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <ArrowUpRight size={14} className="text-slate-400" /> New Task
                    </button>
                    <button onClick={() => onAction('layout')} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Layers size={14} className="text-slate-400" /> Tidy Up
                    </button>
                    <button onClick={() => onAction('paste')} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Copy size={14} className="text-slate-400" /> Paste
                    </button>
                </>
            )}
        </div>
    );
};

export default ContextMenu;