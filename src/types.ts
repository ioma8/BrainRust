export interface Node {
    id: string;
    content: string;
    children: string[];
    parent: string | null;
    x: number;
    y: number;
    icons: string[];
}

export interface MindMap {
    nodes: Record<string, Node>;
    root_id: string;
    selected_node_id: string;
}

export enum Navigation {
    Up = "Up",
    Down = "Down",
    Left = "Left",
    Right = "Right"
}
