import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Task, Group, Viewport } from '../types';

interface InteractionState {
    type: 'idle' | 'panning' | 'selecting' | 'dragging_node' | 'dragging_group' | 'resizing_group' | 'connecting';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    targetIds?: string[]; 
    initialPositions?: Map<string, { x: number, y: number }>;
    // Group children optimization
    draggedChildrenIds?: string[];
    initialChildrenPositions?: Map<string, { x: number, y: number }>;
    
    connectionStartId?: string; // For drag-to-connect
}

interface GuideLine {
    type: 'horizontal' | 'vertical';
    pos: number;
}

interface UseCanvasInteractionProps {
    viewport: Viewport;
    setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
    scale: number;
    tasks: Task[];
    groups: Group[];
    selectedTaskIds: Set<string>;
    setSelectedTaskIds: (ids: Set<string>) => void;
    selectedGroupIds: Set<string>;
    setSelectedGroupIds: (ids: Set<string>) => void;
    onTasksUpdate: (updates: { id: string, x: number, y: number }[]) => void;
    onGroupsUpdate: (updates: { id: string, x: number, y: number }[]) => void;
    onGroupResize: (id: string, width: number, height: number) => void;
    pushHistory: () => void;
    onConnect: (parentId: string, childId: string) => void;
    interactionMode: 'pointer' | 'hand';
}

export const useCanvasInteraction = ({
    viewport,
    setViewport,
    scale,
    tasks,
    groups,
    selectedTaskIds,
    setSelectedTaskIds,
    selectedGroupIds,
    setSelectedGroupIds,
    onTasksUpdate,
    onGroupsUpdate,
    onGroupResize,
    pushHistory,
    onConnect,
    interactionMode
}: UseCanvasInteractionProps) => {
    
    const [interaction, setInteraction] = useState<InteractionState>({
        type: 'idle',
        startX: 0, startY: 0, currentX: 0, currentY: 0
    });
    
    const [guides, setGuides] = useState<GuideLine[]>([]);
    
    // Performance refs
    const rAF = useRef<number | null>(null);
    const lastEventRef = useRef<{ clientX: number, clientY: number } | null>(null);

    const isSpacePressed = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') isSpacePressed.current = true; };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') isSpacePressed.current = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const isInteractionActive = interaction.type !== 'idle';
    
    const screenToCanvas = useCallback((sx: number, sy: number) => {
        return {
            x: (sx - viewport.x) / viewport.scale,
            y: (sy - viewport.y) / viewport.scale
        };
    }, [viewport]);

    // --- Snap Logic ---
    const calculateSnap = (id: string, proposedX: number, proposedY: number, width: number, height: number) => {
        const SNAP_THRESHOLD = 8;
        let newX = proposedX;
        let newY = proposedY;
        const newGuides: GuideLine[] = [];

        // Check against other tasks
        tasks.forEach(other => {
            if (other.id === id) return;
            const otherW = other.width || 300;
            const otherH = other.height || 100;
            const otherCx = other.x + otherW / 2;
            const otherCy = other.y + otherH / 2;

            const myCx = proposedX + width / 2;
            const myCy = proposedY + height / 2;

            // Horizontal Alignments (Vertical Lines)
            if (Math.abs(proposedX - other.x) < SNAP_THRESHOLD) { newX = other.x; newGuides.push({ type: 'vertical', pos: other.x }); }
            if (Math.abs(myCx - otherCx) < SNAP_THRESHOLD) { newX = otherCx - width / 2; newGuides.push({ type: 'vertical', pos: otherCx }); }
            
            // Vertical Alignments (Horizontal Lines)
            if (Math.abs(proposedY - other.y) < SNAP_THRESHOLD) { newY = other.y; newGuides.push({ type: 'horizontal', pos: other.y }); }
            if (Math.abs(myCy - otherCy) < SNAP_THRESHOLD) { newY = otherCy - height / 2; newGuides.push({ type: 'horizontal', pos: otherCy }); }
        });

        setGuides(newGuides);
        return { x: newX, y: newY };
    };


    // --- Handlers ---

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if(e.button === 2) return; // Ignore right click
        
        // Panning trigger: Middle Mouse, Spacebar active, OR Hand Mode active
        if (e.button === 1 || (e.button === 0 && (isSpacePressed.current || interactionMode === 'hand'))) {
            setInteraction({
                type: 'panning',
                startX: e.clientX, startY: e.clientY,
                currentX: e.clientX, currentY: e.clientY
            });
            return;
        }

        if (e.button === 0) {
            if (!e.shiftKey) {
                setSelectedTaskIds(new Set());
                setSelectedGroupIds(new Set());
            }
            setInteraction({
                type: 'selecting',
                startX: e.clientX, startY: e.clientY,
                currentX: e.clientX, currentY: e.clientY
            });
        }
    }, [setSelectedTaskIds, setSelectedGroupIds, interactionMode]);

    const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string, type: 'task' | 'group') => {
        e.stopPropagation();
        if (e.button !== 0) return;

        // If Hand Mode is active, clicking a node should probably just pan (or do nothing), 
        // but typically users expect to be able to select even in hand mode? 
        // Convention: Hand mode implies "Safe Panning", so we shouldn't drag nodes.
        if (interactionMode === 'hand') return;

        // Shift select logic
        if (type === 'task') {
            if (e.shiftKey) {
                const newSet = new Set(selectedTaskIds);
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
                setSelectedTaskIds(newSet);
            } else if (!selectedTaskIds.has(id)) {
                setSelectedTaskIds(new Set([id]));
                setSelectedGroupIds(new Set());
            }
        } else {
             if (!selectedGroupIds.has(id)) {
                 setSelectedGroupIds(new Set([id]));
                 setSelectedTaskIds(new Set());
             }
        }

        // Must capture state NOW, before async updates
        const currentSelectedTaskIds = type === 'task' 
            ? (selectedTaskIds.has(id) ? Array.from(selectedTaskIds) : [id])
            : Array.from(selectedTaskIds);
            
        const currentSelectedGroupIds = type === 'group'
            ? (selectedGroupIds.has(id) ? Array.from(selectedGroupIds) : [id])
            : Array.from(selectedGroupIds);

        const initialPos = new Map<string, { x: number, y: number }>();
        const initialChildrenPos = new Map<string, { x: number, y: number }>();
        const childrenIds: string[] = [];

        const targetIds = type === 'task' ? currentSelectedTaskIds : currentSelectedGroupIds;
        
        if(type === 'task') {
             // For tasks, targetIds contains task IDs
             tasks.filter(t => targetIds.includes(t.id)).forEach(t => initialPos.set(t.id, { x: t.x, y: t.y }));
        } else {
             // For groups, targetIds contains group IDs
             groups.filter(g => targetIds.includes(g.id)).forEach(g => {
                 initialPos.set(g.id, { x: g.x, y: g.y });
                 
                 // Pre-calculate children
                 tasks.forEach(t => {
                     const tW = t.width || 300;
                     const tH = t.height || 150;
                     const cx = t.x + tW / 2;
                     const cy = t.y + tH / 2;
                     
                     if (cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height) {
                         childrenIds.push(t.id);
                         initialChildrenPos.set(t.id, { x: t.x, y: t.y });
                     }
                 });
             });
        }

        pushHistory(); 

        setInteraction({
            type: type === 'task' ? 'dragging_node' : 'dragging_group',
            startX: e.clientX, startY: e.clientY,
            currentX: e.clientX, currentY: e.clientY,
            targetIds,
            initialPositions: initialPos,
            draggedChildrenIds: childrenIds,
            initialChildrenPositions: initialChildrenPos
        });
    }, [tasks, groups, selectedTaskIds, selectedGroupIds, setSelectedTaskIds, setSelectedGroupIds, pushHistory, interactionMode]);

    const handleConnectionStart = useCallback((e: React.MouseEvent, taskId: string) => {
        if (interactionMode === 'hand') return;
        e.stopPropagation();
        e.preventDefault();
        setInteraction({
            type: 'connecting',
            startX: e.clientX, startY: e.clientY,
            currentX: e.clientX, currentY: e.clientY,
            connectionStartId: taskId
        });
    }, [interactionMode]);

    const handleConnectionEnd = useCallback((e: React.MouseEvent, targetId: string) => {
        if (interaction.type === 'connecting' && interaction.connectionStartId && interaction.connectionStartId !== targetId) {
            e.stopPropagation();
            onConnect(interaction.connectionStartId, targetId);
        }
    }, [interaction, onConnect]);

    const handleGroupResizeStart = useCallback((e: React.MouseEvent, id: string) => {
        if (interactionMode === 'hand') return;
        e.stopPropagation();
        pushHistory();
        const group = groups.find(g => g.id === id);
        if(!group) return;

        setInteraction({
            type: 'resizing_group',
            startX: e.clientX, startY: e.clientY,
            currentX: e.clientX, currentY: e.clientY,
            targetIds: [id],
            initialPositions: new Map([[id, { x: group.width, y: group.height }]])
        });
    }, [groups, pushHistory, interactionMode]);

    const processMouseMove = useCallback((e: { clientX: number, clientY: number }) => {
        if (interaction.type === 'idle') return;

        const deltaX = e.clientX - interaction.startX;
        const deltaY = e.clientY - interaction.startY;
        
        // Panning Logic (Requires state update for next frame delta)
        if (interaction.type === 'panning') {
            setViewport(prev => ({
                ...prev,
                x: prev.x + (e.clientX - interaction.currentX),
                y: prev.y + (e.clientY - interaction.currentY)
            }));
            setInteraction(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
            return;
        }

        // Selection & Connection (Require visual feedback state update)
        if (interaction.type === 'selecting' || interaction.type === 'connecting') {
             setInteraction(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
        }

        // IMPORTANT: For dragging nodes/groups, we DO NOT call setInteraction.
        // We only call onTasksUpdate/onGroupsUpdate. This prevents double rendering.
        
        if (interaction.type === 'dragging_node' && interaction.initialPositions) {
            const updates = [];
            const primaryId = interaction.targetIds?.[0];

            for (const [id, startPos] of interaction.initialPositions.entries()) {
                let px = startPos.x + (deltaX / scale);
                let py = startPos.y + (deltaY / scale);
                
                if (interaction.initialPositions.size === 1 && id === primaryId) {
                    const snapped = calculateSnap(id, px, py, 300, 100); 
                    px = snapped.x;
                    py = snapped.y;
                } else if (interaction.initialPositions.size > 1) {
                    setGuides([]); 
                }

                updates.push({ id, x: px, y: py });
            }
            onTasksUpdate(updates);
        }

        if (interaction.type === 'dragging_group' && interaction.initialPositions) {
            const groupUpdates = [];
            setGuides([]);
            
            // Move Group
            for (const [id, startPos] of interaction.initialPositions.entries()) {
                groupUpdates.push({ id, x: startPos.x + (deltaX / scale), y: startPos.y + (deltaY / scale) });
            }
            onGroupsUpdate(groupUpdates);

            // Move Children
            if (interaction.initialChildrenPositions && interaction.initialChildrenPositions.size > 0) {
                const childUpdates = [];
                for (const [childId, startPos] of interaction.initialChildrenPositions.entries()) {
                    childUpdates.push({ id: childId, x: startPos.x + (deltaX / scale), y: startPos.y + (deltaY / scale) });
                }
                onTasksUpdate(childUpdates);
            }
        }

        if (interaction.type === 'resizing_group' && interaction.initialPositions && interaction.targetIds) {
            const id = interaction.targetIds[0];
            const startDims = interaction.initialPositions.get(id);
            if(startDims) {
                const newW = Math.max(200, startDims.x + (deltaX / scale));
                const newH = Math.max(100, startDims.y + (deltaY / scale));
                onGroupResize(id, newW, newH);
            }
        }
    }, [interaction, scale, setViewport, onTasksUpdate, onGroupsUpdate, onGroupResize, tasks]); // Tasks dependency is needed for snap calculation, but careful with re-renders

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        // Extract properties immediately to avoid event pooling issues or stale references
        const { clientX, clientY } = e;
        lastEventRef.current = { clientX, clientY };
        
        if (!rAF.current) {
            rAF.current = requestAnimationFrame(() => {
                if (lastEventRef.current) {
                    processMouseMove(lastEventRef.current);
                }
                rAF.current = null;
            });
        }
    }, [processMouseMove]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (rAF.current) {
            cancelAnimationFrame(rAF.current);
            rAF.current = null;
        }
        
        if (interaction.type === 'selecting') {
            const start = screenToCanvas(interaction.startX, interaction.startY);
            const end = screenToCanvas(e.clientX, e.clientY);
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const w = Math.abs(end.x - start.x);
            const h = Math.abs(end.y - start.y);

            const intersectedIds = new Set<string>();
            if (w > 5 || h > 5) {
                tasks.forEach(t => {
                    const tW = t.width || 300;
                    const tH = t.height || 150;
                    if (t.x < x + w && t.x + tW > x && t.y < y + h && t.y + tH > y) intersectedIds.add(t.id);
                });
                
                if (e.shiftKey) {
                    const newSelection = new Set(selectedTaskIds);
                    intersectedIds.forEach(id => {
                        if (newSelection.has(id)) newSelection.delete(id);
                        else newSelection.add(id);
                    });
                    setSelectedTaskIds(newSelection);
                } else {
                    setSelectedTaskIds(intersectedIds);
                }
            }
        }

        setGuides([]); 
        setInteraction({ type: 'idle', startX: 0, startY: 0, currentX: 0, currentY: 0 });
    }, [interaction, screenToCanvas, tasks, selectedTaskIds, setSelectedTaskIds]);

    // --- Touch Adaptors ---

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            // Simulate middle click/space+click for pan
            const touch = e.touches[0];
            setInteraction({
                type: 'panning',
                startX: touch.clientX, startY: touch.clientY,
                currentX: touch.clientX, currentY: touch.clientY
            });
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY } as any;
            handleMouseMove(fakeEvent);
        }
    }, [handleMouseMove]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const fakeEvent = { clientX: 0, clientY: 0 } as any; 
        handleMouseUp(fakeEvent);
    }, [handleMouseUp]);


    return {
        interaction,
        guides,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleNodeMouseDown,
        handleGroupResizeStart,
        handleConnectionStart,
        handleConnectionEnd,
        isInteractionActive,
        screenToCanvas,
        // Expose touch handlers
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    };
};