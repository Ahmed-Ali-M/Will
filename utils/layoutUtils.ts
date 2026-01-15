
import { Task } from '../types';

interface LayoutNode {
    task: Task;
    children: LayoutNode[];
    width: number;
    height: number;
    x: number;
    y: number;
    offsetY: number;
}

export const performAutoLayout = (tasks: Task[], selectedIds: Set<string>): { id: string, x: number, y: number }[] => {
    // 1. Identify which tasks to layout
    const tasksToLayout = selectedIds.size > 0 
        ? tasks.filter(t => selectedIds.has(t.id)) 
        : tasks;

    if (tasksToLayout.length === 0) return [];

    const taskMap = new Map(tasksToLayout.map(t => [t.id, t]));
    const updates: { id: string, x: number, y: number }[] = [];
    const visited = new Set<string>();
    
    // 2. Build Tree Structure from selection
    // Find "Roots" (nodes whose parents are NOT in the current selection set)
    const roots = tasksToLayout.filter(t => !t.parentId || !taskMap.has(t.parentId));
    
    // Sort roots by Y position to maintain relative vertical order roughly
    roots.sort((a, b) => a.y - b.y);

    let currentY = roots.length > 0 ? roots[0].y : 0;
    const startX = roots.length > 0 ? roots[0].x : 0;
    const HORIZONTAL_GAP = 350;
    const VERTICAL_GAP = 40;

    // Recursive layout function
    const layoutTree = (taskId: string, x: number, y: number): number => {
        visited.add(taskId);
        const task = taskMap.get(taskId);
        if (!task) return y;

        // Find children in the selection
        const children = tasksToLayout
            .filter(t => t.parentId === taskId)
            .sort((a, b) => a.y - b.y); // Sort children by current Y to prevent jumping

        let subtreeHeight = 0;
        const myHeight = task.height || 150;

        if (children.length === 0) {
            subtreeHeight = myHeight + VERTICAL_GAP;
            updates.push({ id: taskId, x, y });
            return y + subtreeHeight;
        }

        // Layout children
        let childY = y;
        children.forEach(child => {
            childY = layoutTree(child.id, x + HORIZONTAL_GAP, childY);
        });

        // Center parent vertically relative to children
        const childrenTotalHeight = childY - y;
        const centeredY = y + (childrenTotalHeight / 2) - (myHeight / 2);
        
        updates.push({ id: taskId, x, y: centeredY });
        
        return childY;
    };

    // 3. Execute Layout
    roots.forEach(root => {
        currentY = layoutTree(root.id, startX, currentY);
    });

    return updates;
};

// --- Smart Link Utils ---

type Point = { x: number, y: number };
type Rect = { x: number, y: number, w: number, h: number };

export const getSmartAnchors = (startNode: Rect, endNode: Rect): { start: Point, end: Point } => {
    // Define 4 anchor points for each node
    const getAnchors = (r: Rect) => ({
        top: { x: r.x + r.w / 2, y: r.y },
        bottom: { x: r.x + r.w / 2, y: r.y + r.h },
        left: { x: r.x, y: r.y + r.h / 2 },
        right: { x: r.x + r.w, y: r.y + r.h / 2 }
    });

    const startAnchors = getAnchors(startNode);
    const endAnchors = getAnchors(endNode);

    // Heuristic: Determine relative direction
    const centerStart = { x: startNode.x + startNode.w/2, y: startNode.y + startNode.h/2 };
    const centerEnd = { x: endNode.x + endNode.w/2, y: endNode.y + endNode.h/2 };
    
    const dx = centerEnd.x - centerStart.x;
    const dy = centerEnd.y - centerStart.y;
    
    // Default: Right to Left (Kanban/Timeline flow)
    let startPoint = startAnchors.right;
    let endPoint = endAnchors.left;

    // Logic: Choose best faces based on angle
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal relationship
        if (dx > 0) {
            // End is to the Right
            startPoint = startAnchors.right;
            endPoint = endAnchors.left;
        } else {
            // End is to the Left
            startPoint = startAnchors.left;
            endPoint = endAnchors.right;
        }
    } else {
        // Vertical relationship
        if (dy > 0) {
            // End is Below
            startPoint = startAnchors.bottom;
            endPoint = endAnchors.top;
        } else {
            // End is Above
            startPoint = startAnchors.top;
            endPoint = endAnchors.bottom;
        }
    }

    return { start: startPoint, end: endPoint };
};
