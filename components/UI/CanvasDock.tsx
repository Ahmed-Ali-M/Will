import React from 'react';
import { MousePointer2, Hand, ZoomIn, ZoomOut, Maximize, Plus, Search, PanelLeft } from 'lucide-react';

interface CanvasDockProps {
    scale: number;
    mode: 'pointer' | 'hand';
    isSidebarOpen: boolean;
    onSetMode: (mode: 'pointer' | 'hand') => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitContent: () => void;
    onToggleSidebar: () => void;
    onOpenSearch: () => void;
    onCreateNew: (e: React.MouseEvent) => void;
}

const CanvasDock: React.FC<CanvasDockProps> = ({ 
    scale, 
    mode, 
    isSidebarOpen,
    onSetMode, 
    onZoomIn, 
    onZoomOut, 
    onFitContent,
    onToggleSidebar,
    onOpenSearch,
    onCreateNew
}) => {
    
    const ButtonBase = ({ 
        active, 
        onClick, 
        children, 
        title,
        highlight = false 
    }: { 
        active?: boolean, 
        onClick: (e: React.MouseEvent) => void, 
        children: React.ReactNode, 
        title: string,
        highlight?: boolean
    }) => (
        <button
            onClick={onClick}
            title={title}
            className={`
                relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out group
                ${highlight 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-110 hover:-translate-y-1' 
                    : active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-105'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }
            `}
        >
            {children}
            {!highlight && active && (
                <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-slate-900 dark:bg-white" />
            )}
        </button>
    );

    const Separator = () => (
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-2" />
    );

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_0.5s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-full shadow-2xl border border-white/50 dark:border-slate-700/50 ring-1 ring-slate-900/5 transition-all duration-300 hover:shadow-3xl hover:scale-[1.01]">
                
                {/* Primary Tools */}
                <div className="flex gap-1 px-1">
                    <ButtonBase 
                        active={mode === 'pointer'} 
                        onClick={() => onSetMode('pointer')} 
                        title="Pointer (V)"
                    >
                        <MousePointer2 size={18} />
                    </ButtonBase>
                    <ButtonBase 
                        active={mode === 'hand'} 
                        onClick={() => onSetMode('hand')} 
                        title="Hand Tool (H)"
                    >
                        <Hand size={18} />
                    </ButtonBase>
                </div>

                <Separator />

                {/* Primary Actions */}
                <div className="flex gap-1 px-1">
                     <ButtonBase 
                        active={false} 
                        onClick={onOpenSearch} 
                        title="Search (Cmd+K)"
                    >
                        <Search size={18} strokeWidth={2.5} />
                    </ButtonBase>
                    
                    <ButtonBase 
                        active={isSidebarOpen} 
                        onClick={onToggleSidebar} 
                        title="Toggle Sidebar"
                    >
                        <PanelLeft size={18} strokeWidth={2.5} />
                    </ButtonBase>
                </div>

                {/* Create CTA */}
                <div className="mx-2">
                    <ButtonBase 
                        onClick={onCreateNew} 
                        title="Create New Task"
                        highlight
                    >
                        <Plus size={24} strokeWidth={2.5} />
                    </ButtonBase>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 px-1">
                    <ButtonBase 
                        onClick={onZoomOut} 
                        title="Zoom Out"
                        active={false}
                    >
                        <ZoomOut size={18} />
                    </ButtonBase>
                    
                    <span className="w-10 text-center text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 select-none">
                        {Math.round(scale * 100)}%
                    </span>
                    
                    <ButtonBase 
                        onClick={onZoomIn} 
                        title="Zoom In"
                        active={false}
                    >
                        <ZoomIn size={18} />
                    </ButtonBase>
                     <ButtonBase 
                        onClick={onFitContent} 
                        title="Fit to Content"
                        active={false}
                    >
                        <Maximize size={18} />
                    </ButtonBase>
                </div>
            </div>
        </div>
    );
};

export default CanvasDock;