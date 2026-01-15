import React from 'react';
import { Group } from '../../types';
import { X, Lock, Unlock, GripHorizontal, Maximize2 } from 'lucide-react';

interface GroupNodeProps {
  group: Group;
  onUpdate: (group: Group) => void;
  onDelete: (id: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent, group: Group) => void;
  isSelected: boolean;
}

const COLORS = [
  '#94a3b8', // Slate
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
];

const GroupNode: React.FC<GroupNodeProps> = ({ group, onUpdate, onDelete, onMouseDown, onResizeStart, onDoubleClick, onContextMenu, isSelected }) => {
  return (
    <div
      className={`absolute flex flex-col group/container transition-all duration-500 rounded-3xl animate-fadeIn
        ${group.locked ? 'border-2 border-slate-200 dark:border-slate-700 border-dashed' : 'border-2 hover:shadow-xl dark:shadow-slate-900/50'}
        ${isSelected && !group.locked ? 'ring-2 ring-blue-400 shadow-lg' : ''}
      `}
      style={{
        left: group.x,
        top: group.y,
        width: group.width,
        height: group.height,
        borderColor: group.locked ? (document.documentElement.classList.contains('dark') ? '#334155' : '#cbd5e1') : (isSelected ? '#60a5fa' : group.color),
        backgroundColor: `${group.color}15`, // Increased opacity for better dark mode visibility
      }}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => onContextMenu(e, group)}
      onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick();
      }}
    >
        {/* Header / Label */}
        <div className="flex items-center justify-between px-4 py-2 bg-transparent cursor-grab active:cursor-grabbing">
             <div className="flex items-center gap-2 flex-1 min-w-0">
                 {group.locked && <Lock size={14} className="text-slate-400 flex-shrink-0" />}
                 <input
                    value={group.title}
                    onChange={(e) => onUpdate({...group, title: e.target.value})}
                    onMouseDown={(e) => e.stopPropagation()}
                    readOnly={group.locked}
                    className={`bg-transparent font-bold outline-none text-base w-full py-1 truncate
                        ${group.locked ? 'text-slate-400 cursor-default' : 'text-slate-600 dark:text-slate-300 focus:text-slate-900 dark:focus:text-white'}
                    `}
                    placeholder="Group Title"
                    style={{ color: group.locked ? undefined : group.color }}
                 />
             </div>
             
             {/* Controls - Visible on Hover OR if Locked (to allow unlock) */}
             <div className={`flex items-center gap-1 transition-opacity duration-200 
                ${group.locked ? 'opacity-100' : 'opacity-0 group-hover/container:opacity-100'}
             `}>
                {/* Lock Toggle */}
                <button
                    onClick={(e) => { e.stopPropagation(); onUpdate({...group, locked: !group.locked}); }}
                    className={`p-1.5 rounded-full transition-colors z-20 ${group.locked ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/50 ring-1 ring-amber-200 dark:ring-amber-800' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                    title={group.locked ? "Unlock Group" : "Lock Group"}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {group.locked ? <Unlock size={14} /> : <Lock size={14} />}
                </button>

                {!group.locked && (
                    <>
                        {/* Color Palette */}
                        <div className="flex items-center gap-1 mx-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur rounded-full px-2 py-1 border border-slate-100 dark:border-slate-700 shadow-sm">
                            {COLORS.slice(0, 5).map(c => (
                                <button
                                    key={c}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); onUpdate({...group, color: c}); }}
                                    className={`w-3 h-3 rounded-full border border-white/50 dark:border-slate-600 hover:scale-125 transition-transform ${group.color === c ? 'ring-2 ring-slate-400 dark:ring-slate-500' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(group.id); }}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 rounded-full transition-colors bg-white/50 dark:bg-slate-800/50 shadow-sm border border-transparent hover:border-red-200 dark:hover:border-red-800"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <X size={14} />
                        </button>
                    </>
                )}
             </div>
        </div>
        
        {/* Double click hint if empty and hovered */}
        {!group.locked && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/container:opacity-5 pointer-events-none">
                 <Maximize2 size={48} className="text-slate-400" />
            </div>
        )}

        {/* Resize Handle */}
        {!group.locked && (
            <div
                className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-end justify-end p-2 opacity-0 group-hover/container:opacity-100 transition-opacity"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onResizeStart(e);
                }}
            >
                <div className="w-4 h-4 border-r-2 border-b-2 rounded-br" style={{ borderColor: group.color }} />
            </div>
        )}
    </div>
  );
};

export default React.memo(GroupNode);