import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Task, Group, Viewport } from '../types';

interface InteractionState {
    type: 'idle' | 'panning' | 'selecting' | 'dragging_node' | 'dragging_group' | 'resizing_group' | 'connecting';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    targetIds?: string[]; 
    primaryId?: string; // The specific node being grabbed in a selection
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
    
    // Performance refs to break dependency cycles during drag
    const tasksRef = useRef(tasks);
    const groupsRef = useRef(groups);
    const interactionRef = useRef(interaction);
    const viewportRef = useRef(viewport);

    // Update refs on render
    useEffect(() => { tasksRef.current = tasks; }, [tasks]);
    useEffect(() => { groupsRef.current = groups; }, [groups]);
    useEffect(() => { interactionRef.current = interaction; }, [interaction]);
    useEffect(() => { viewportRef.current = viewport; }, [viewport]);

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
        // Use ref if available for latest viewport during callbacks, else prop
        const v = viewportRef.current || viewport;
        return {
            x: (sx - v.x) / v.scale,
            y: (sy - v.y) / v.scale
        };
    }, [viewport]);

    // --- Snap Logic ---
    const calculateSnap = (id: string, proposedX: number, proposedY: number, width: number, height: number, currentScale: number) => {
        // Threshold in screen pixels (e.g., 12px), converted to canvas units
        const SNAP_THRESHOLD = 12 / currentScale;
        const GRID_SIZE = 10;
        
        // Candidates for dragging object
        const my = {
            left: proposedX,
            right: proposedX + width,
            centerX: proposedX + width / 2,
            top: proposedY,
            bottom: proposedY + height,
            centerY: proposedY + height / 2
        };

        let bestDx = SNAP_THRESHOLD + 1;
        let bestX = null;
        let guideX = null;

        let bestDy = SNAP_THRESHOLD + 1;
        let bestY = null;
        let guideY = null;

        // Iterate all other tasks to find snap points
        tasksRef.current.forEach(other => {
            if (other.id === id) return;
            // Ignore if 'other' is also being dragged (in multi-selection)
            if (interactionRef.current.targetIds?.includes(other.id)) return;

            const otherW = other.width || 300;
            const otherH = other.height || 100; // Best effort height
            
            const target = {
                left: other.x,
                right: other.x + otherW,
                centerX: other.x + otherW / 2,
                top: other.y,
                bottom: other.y + otherH,
                centerY: other.y + otherH / 2
            };

            // Check X snaps
            const xSnaps = [
                { val: target.left, type: 'left', ref: 'left', dist: Math.abs(my.left - target.left) },
                { val: target.left - width, type: 'right', ref: 'left', dist: Math.abs(my.right - target.left) }, 
                { val: target.right, type: 'left', ref: 'right', dist: Math.abs(my.left - target.right) },
                { val: target.right - width, type: 'right', ref: 'right', dist: Math.abs(my.right - target.right) },
                { val: target.centerX - width/2, type: 'center', ref: 'center', dist: Math.abs(my.centerX - target.centerX) }
            ];

            for (const snap of xSnaps) {
                if (snap.dist < bestDx) {
                    bestDx = snap.dist;
                    bestX = snap.val;
                    guideX = snap.ref === 'left' ? target.left : snap.ref === 'right' ? target.right : target.centerX;
                }
            }

            // Check Y snaps
            const ySnaps = [
                { val: target.top, type: 'top', ref: 'top', dist: Math.abs(my.top - target.top) },
                { val: target.top - height, type: 'bottom', ref: 'top', dist: Math.abs(my.bottom - target.top) },
                { val: target.bottom, type: 'top', ref: 'bottom', dist: Math.abs(my.top - target.bottom) },
                { val: target.bottom - height, type: 'bottom', ref: 'bottom', dist: Math.abs(my.bottom - target.bottom) },
                { val: target.centerY - height/2, type: 'center', ref: 'center', dist: Math.abs(my.centerY - target.centerY) }
            ];

            for (const snap of ySnaps) {
                if (snap.dist < bestDy) {
                    bestDy = snap.dist;
                    bestY = snap.val;
                    guideY = snap.ref === 'top' ? target.top : snap.ref === 'bottom' ? target.bottom : target.centerY;
                }
            }
        });

        const newGuides: GuideLine[] = [];
        let finalX = proposedX;
        let finalY = proposedY;

        // Apply Snap or Grid Fallback
        if (bestX !== null && guideX !== null) {
            finalX = bestX;
            newGuides.push({ type: 'vertical', pos: guideX });
        } else {
            // Soft Grid Snap
            finalX = Math.round(proposedX / GRID_SIZE) * GRID_SIZE;
        }
        
        if (bestY !== null && guideY !== null) {
            finalY = bestY;
            newGuides.push({ type: 'horizontal', pos: guideY });
        } else {
            // Soft Grid Snap
            finalY = Math.round(proposedY / GRID_SIZE) * GRID_SIZE;
        }

        setGuides(newGuides);
        return { x: finalX, y: finalY };
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
             tasks.filter(t => targetIds.includes(t.id)).forEach(t => initialPos.set(t.id, { x: t.x, y: t.y }));
        } else {
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
            primaryId: id, // Track which node was actually clicked for snapping
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
        // Read current interaction from ref to avoid closure staleness without re-binding
        const currentInteraction = interactionRef.current;
        if (currentInteraction.type === 'idle') return;

        const deltaX = e.clientX - currentInteraction.startX;
        const deltaY = e.clientY - currentInteraction.startY;
        
        if (currentInteraction.type === 'panning') {
            setViewport(prev => ({
                ...prev,
                x: prev.x + (e.clientX - currentInteraction.currentX),
                y: prev.y + (e.clientY - currentInteraction.currentY)
            }));
            setInteraction(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
            return;
        }

        if (currentInteraction.type === 'selecting' || currentInteraction.type === 'connecting') {
             setInteraction(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
        }

        if (currentInteraction.type === 'dragging_node' && currentInteraction.initialPositions) {
            const updates: any[] = [];
            const primaryId = currentInteraction.primaryId || currentInteraction.targetIds?.[0];
            
            // Raw movement delta in canvas units
            let effectiveDeltaX = deltaX / scale;
            let effectiveDeltaY = deltaY / scale;

            // Apply Snapping based on the primary grabbed node
            if (primaryId && currentInteraction.initialPositions.has(primaryId)) {
                const startPos = currentInteraction.initialPositions.get(primaryId)!;
                const proposedX = startPos.x + effectiveDeltaX;
                const proposedY = startPos.y + effectiveDeltaY;
                
                const task = tasksRef.current.find(t => t.id === primaryId);
                if (task) {
                    const snapped = calculateSnap(primaryId, proposedX, proposedY, task.width||300, task.height||100, scale);
                    // Adjust the delta so the primary node lands exactly on the snap line
                    effectiveDeltaX = snapped.x - startPos.x;
                    effectiveDeltaY = snapped.y - startPos.y;
                }
            } else {
                setGuides([]);
            }

            // Apply calculated delta to ALL dragged nodes
            for (const [id, startPos] of currentInteraction.initialPositions.entries()) {
                updates.push({ 
                    id, 
                    x: startPos.x + effectiveDeltaX, 
                    y: startPos.y + effectiveDeltaY 
                });
            }
            onTasksUpdate(updates);
        }

        if (currentInteraction.type === 'dragging_group' && currentInteraction.initialPositions) {
            const groupUpdates: any[] = [];
            setGuides([]);
            
            for (const [id, startPos] of currentInteraction.initialPositions.entries()) {
                groupUpdates.push({ id, x: startPos.x + (deltaX / scale), y: startPos.y + (deltaY / scale) });
            }
            onGroupsUpdate(groupUpdates);

            if (currentInteraction.initialChildrenPositions && currentInteraction.initialChildrenPositions.size > 0) {
                const childUpdates: any[] = [];
                for (const [childId, startPos] of currentInteraction.initialChildrenPositions.entries()) {
                    childUpdates.push({ id: childId, x: startPos.x + (deltaX / scale), y: startPos.y + (deltaY / scale) });
                }
                onTasksUpdate(childUpdates);
            }
        }

        if (currentInteraction.type === 'resizing_group' && currentInteraction.initialPositions && currentInteraction.targetIds) {
            const id = currentInteraction.targetIds[0];
            const startDims = currentInteraction.initialPositions.get(id);
            if(startDims) {
                const newW = Math.max(200, startDims.x + (deltaX / scale));
                const newH = Math.max(100, startDims.y + (deltaY / scale));
                onGroupResize(id, newW, newH);
            }
        }
    }, [scale, onTasksUpdate, onGroupsUpdate, onGroupResize]); // removed 'tasks' and 'interaction' from deps

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        lastEventRef.current = { clientX, clientY };
        if (!rAF.current) {
            rAF.current = requestAnimationFrame(() => {
                if (lastEventRef.current) processMouseMove(lastEventRef.current);
                rAF.current = null;
            });
        }
    }, [processMouseMove]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (rAF.current) {
            cancelAnimationFrame(rAF.current);
            rAF.current = null;
        }
        
        const currentInteraction = interactionRef.current;

        if (currentInteraction.type === 'selecting') {
            const viewport = viewportRef.current;
            const start = screenToCanvas(currentInteraction.startX, currentInteraction.startY);
            const end = screenToCanvas(e.clientX, e.clientY);
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const w = Math.abs(end.x - start.x);
            const h = Math.abs(end.y - start.y);

            const intersectedIds = new Set<string>();
            if (w > 5 || h > 5) {
                tasksRef.current.forEach(t => {
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
    }, [screenToCanvas, selectedTaskIds, setSelectedTaskIds]);

    // Attach Window Listeners when interaction is active
    useEffect(() => {
        if (interaction.type === 'idle') return;

        const handleWindowMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            lastEventRef.current = { clientX, clientY };
            if (!rAF.current) {
                rAF.current = requestAnimationFrame(() => {
                    if (lastEventRef.current) processMouseMove(lastEventRef.current);
                    rAF.current = null;
                });
            }
        };

        const handleWindowMouseUp = (e: MouseEvent) => {
            // Bridge to the React callback logic
            handleMouseUp(e as any);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            if (rAF.current) cancelAnimationFrame(rAF.current);
        };
    }, [interaction.type, processMouseMove, handleMouseUp]);


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
        handleTouchStart: (e: React.TouchEvent) => {}, 
        handleTouchMove: (e: React.TouchEvent) => {}, 
        handleTouchEnd: (e: React.TouchEvent) => {}
    };
};