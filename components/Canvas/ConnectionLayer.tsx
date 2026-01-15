import React, { useMemo } from 'react';
import { Task, Viewport } from '../../types';
import { getSmartAnchors } from '../../utils/layoutUtils';

interface ConnectionLayerProps {
  tasks: Task[];
  viewport: Viewport;
  windowSize: { width: number; height: number };
  onContextMenu: (e: React.MouseEvent, parentId: string, childId: string) => void;
}

const ConnectionLayer: React.FC<ConnectionLayerProps> = ({ tasks, viewport, windowSize, onContextMenu }) => {
  // Create a map for fast lookup
  const taskMap = useMemo(() => new Map<string, Task>(tasks.map(t => [t.id, t])), [tasks]);

  // Calculate visible bounds
  const renderBounds = useMemo(() => {
     const buffer = 500;
     const minX = -viewport.x / viewport.scale - buffer;
     const minY = -viewport.y / viewport.scale - buffer;
     const maxX = (windowSize.width - viewport.x) / viewport.scale + buffer;
     const maxY = (windowSize.height - viewport.y) / viewport.scale + buffer;
     return { minX, minY, maxX, maxY };
  }, [viewport, windowSize]);

  // Helper to check if a point is visible
  const isPointVisible = (x: number, y: number) => {
      return x >= renderBounds.minX && x <= renderBounds.maxX &&
             y >= renderBounds.minY && y <= renderBounds.maxY;
  };

  const getPathData = (start: {x: number, y: number}, end: {x: number, y: number}) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Calculate control points based on distance and orientation
    let cp1, cp2;
    
    // Smoothing factor
    const curvature = Math.min(Math.max(absDx, absDy) * 0.5, 150);

    // If mainly horizontal
    if (absDx > absDy) {
        cp1 = { x: start.x + (dx > 0 ? curvature : -curvature), y: start.y };
        cp2 = { x: end.x + (dx > 0 ? -curvature : curvature), y: end.y };
    } 
    // If mainly vertical
    else {
        cp1 = { x: start.x, y: start.y + (dy > 0 ? curvature : -curvature) };
        cp2 = { x: end.x, y: end.y + (dy > 0 ? -curvature : curvature) };
    }

    return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  };

  return (
    <svg 
        className="absolute top-0 left-0 w-full h-full overflow-visible z-0 pointer-events-none"
        shapeRendering="geometricPrecision"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
        <marker
          id="arrowhead-done"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
        </marker>
      </defs>
      {tasks.map(task => {
        if (!task.parentId) return null;
        
        // HIDE CONNECTION IF CHILD IS DONE (Matching board visibility logic)
        if (task.isCompleted) return null;

        const parent = taskMap.get(task.parentId);
        if (!parent) return null;
        
        // HIDE CONNECTION IF PARENT IS DONE
        if (parent.isCompleted) return null;

        // Use smart anchors
        const { start, end } = getSmartAnchors(
            { x: parent.x, y: parent.y, w: 300, h: parent.height || 150 }, // Parent Rect
            { x: task.x, y: task.y, w: 300, h: task.height || 150 }      // Task Rect
        );

        const startVisible = isPointVisible(start.x, start.y);
        const endVisible = isPointVisible(end.x, end.y);
        
        if (!startVisible && !endVisible) {
             const lineMinX = Math.min(start.x, end.x);
             const lineMaxX = Math.max(start.x, end.x);
             const lineMinY = Math.min(start.y, end.y);
             const lineMaxY = Math.max(start.y, end.y);
             
             if (lineMaxX < renderBounds.minX || lineMinX > renderBounds.maxX ||
                 lineMaxY < renderBounds.minY || lineMinY > renderBounds.maxY) {
                 return null;
             }
        }

        const isDone = task.isCompleted && parent.isCompleted;
        const color = isDone ? '#22c55e' : '#94a3b8';
        const strokeWidth = isDone ? 2.5 : 2;
        const marker = isDone ? 'url(#arrowhead-done)' : 'url(#arrowhead)';
        const pathData = getPathData(start, end);

        return (
            <g key={`${parent.id}-${task.id}`} className="group/line pointer-events-auto">
                {/* Background "Halo" for visual separation */}
                <path 
                    d={pathData} 
                    strokeWidth="5" 
                    fill="none" 
                    className="stroke-slate-50 dark:stroke-slate-900 transition-colors duration-300"
                />
                
                {/* Invisible wide stroke for easier clicking/hovering */}
                <path 
                    d={pathData} 
                    stroke="transparent" 
                    strokeWidth="20" 
                    fill="none" 
                    className="cursor-context-menu"
                    onContextMenu={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onContextMenu(e, parent.id, task.id);
                    }}
                />

                {/* Visible Path */}
                <path
                    d={pathData}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    markerEnd={marker}
                    strokeDasharray={isDone ? 'none' : '5,5'}
                    strokeLinecap="round"
                    className="transition-all duration-300 group-hover/line:stroke-blue-400 group-hover/line:stroke-[3px]"
                    style={{ 
                        filter: isDone ? 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.3))' : 'none',
                    }}
                />
            </g>
        );
      })}
    </svg>
  );
};

export default React.memo(ConnectionLayer);