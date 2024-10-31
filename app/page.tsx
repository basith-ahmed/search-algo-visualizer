"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Info,
  Play,
  Pause,
  RotateCcw,
  Eraser,
  Pencil,
  Target,
  Flag,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import a priority queue implementation
import { MinPriorityQueue } from "@datastructures-js/priority-queue";

// Node types
type NodeType =
  | "start"
  | "end"
  | "wall"
  | "empty"
  | "path"
  | "visited"
  | "weight";

// Node interface
interface Node {
  row: number;
  col: number;
  type: NodeType;
  f: number;
  g: number;
  h: number;
  weight: number;
  parent: string | null;
}

// Grid size
const createInitialGrid = (rows: number, cols: number): Node[][] => {
  const grid: Node[][] = [];
  for (let row = 0; row < rows; row++) {
    const currentRow: Node[] = [];
    for (let col = 0; col < cols; col++) {
      currentRow.push({
        row,
        col,
        type: "empty",
        f: 0,
        g: 0,
        h: 0,
        weight: 1,
        parent: null,
      });
    }
    grid.push(currentRow);
  }
  return grid;
};

// Heuristic function for A*
const heuristic = (a: Node, b: Node): number => {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
};

// Helper to get node key
const getNodeKey = (node: Node): string => `${node.row},${node.col}`;

// Reconstruct path
const reconstructPath = (endNode: Node, grid: Node[][]): Node[] => {
  const path: Node[] = [];
  let current: Node | null = endNode;
  while (current && current.parent) {
    const [row, col] = current.parent.split(",").map(Number);
    current = grid[row][col];
    if (current && current.type !== "start" && current.type !== "end") {
      path.unshift(current);
    }
  }
  return path;
};

// Reconstruct bidirectional path
const reconstructBidirectionalPath = (
  meetingPoint: Node,
  forwardParents: Map<string, string | null>,
  backwardParents: Map<string, string | null>,
  grid: Node[][]
): Node[] => {
  const path: Node[] = [];
  let currentKey: string | null = getNodeKey(meetingPoint);

  // Reconstruct path from meeting point to start
  while (currentKey) {
    const [row, col] = currentKey.split(",").map(Number);
    const currentNode = grid[row][col];
    if (
      currentNode &&
      currentNode.type !== "start" &&
      currentNode.type !== "end"
    ) {
      path.unshift(currentNode);
    }
    currentKey = forwardParents.get(currentKey) || null;
  }

  // Reconstruct path from meeting point to end
  currentKey = backwardParents.get(getNodeKey(meetingPoint));
  while (currentKey) {
    const [row, col] = currentKey.split(",").map(Number);
    const currentNode = grid[row][col];
    if (
      currentNode &&
      currentNode.type !== "start" &&
      currentNode.type !== "end"
    ) {
      path.push(currentNode);
    }
    currentKey = backwardParents.get(currentKey) || null;
  }

  return path;
};

export default function Home() {
  const [rows, setRows] = useState(40);
  const [cols, setCols] = useState(60);
  const [grid, setGrid] = useState<Node[][]>([]);
  const [startNode, setStartNode] = useState<Node | null>(null);
  const [endNode, setEndNode] = useState<Node | null>(null);
  const [algorithm, setAlgorithm] = useState<
    | "astar"
    | "dijkstra"
    | "bfs"
    | "dfs"
    | "greedy"
    | "bidirectional"
    | "swarm"
    | "convergentSwarm"
    | "bidirectionalSwarm"
  >("astar");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [obstaclePercentage, setObstaclePercentage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<
    "wall" | "weight" | "erase" | "start" | "end"
  >("start");
  const [visualizationSpeed, setVisualizationSpeed] = useState(80);
  const [weightValue, setWeightValue] = useState(1);
  const [stats, setStats] = useState({
    visitedNodes: 0,
    pathLength: 0,
    executionTime: 0,
  });
  const [showHeatmap, setShowHeatmap] = useState(false);

  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const handlePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const newRows = Math.floor((window.innerHeight - 74) / 16);
      const newCols = Math.floor((window.innerWidth - (320 + 74)) / 16);
      setRows(newRows);
      setCols(newCols);
      setGrid(createInitialGrid(newRows, newCols));
    } else {
      setGrid(createInitialGrid(rows, cols));
    }
  }, []);

  // Reset grid
  const resetGrid = useCallback(() => {
    setGrid(createInitialGrid(rows, cols));
    setStartNode(null);
    setEndNode(null);
    setStats({ visitedNodes: 0, pathLength: 0, executionTime: 0 });
  }, [rows, cols]);

  // Set node type
  const setNodeType = (
    row: number,
    col: number,
    type: NodeType,
    weight: number = 1
  ) => {
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((r) => r.map((n) => ({ ...n }))); // Deep copy
      newGrid[row][col].type = type;
      newGrid[row][col].weight = weight;
      return newGrid;
    });

    if (type === "start") {
      setStartNode({ row, col, type, f: 0, g: 0, h: 0, weight, parent: null });
    } else if (type === "end") {
      setEndNode({ row, col, type, f: 0, g: 0, h: 0, weight, parent: null });
    }
  };

  // Handle node interaction
  const handleNodeInteraction = (row: number, col: number) => {
    if (isRunning) return;

    const node = grid[row][col];
    if (drawMode === "start" && node.type !== "start") {
      if (startNode) {
        setNodeType(startNode.row, startNode.col, "empty");
      }
      setNodeType(row, col, "start");
      setDrawMode("end");
    } else if (drawMode === "end" && node.type !== "end") {
      if (endNode) {
        setNodeType(endNode.row, endNode.col, "empty");
      }
      setNodeType(row, col, "end");
    } else {
      switch (drawMode) {
        case "wall":
          setNodeType(row, col, node.type === "wall" ? "empty" : "wall");
          break;
        case "weight":
          setNodeType(
            row,
            col,
            node.type === "weight" ? "empty" : "weight",
            weightValue
          );
          break;
        case "erase":
          if (node.type === "start") {
            setStartNode(null);
          }
          if (node.type === "end") {
            setEndNode(null);
          }
          setNodeType(row, col, "empty");
          break;
        default:
          break;
      }
    }
  };

  // Get neighbors
  const getNeighbors = (node: Node, currentGrid: Node[][]): Node[] => {
    const neighbors: Node[] = [];
    const { row, col } = node;

    if (row > 0) neighbors.push(currentGrid[row - 1][col]);
    if (row < rows - 1) neighbors.push(currentGrid[row + 1][col]);
    if (col > 0) neighbors.push(currentGrid[row][col - 1]);
    if (col < cols - 1) neighbors.push(currentGrid[row][col + 1]);

    return neighbors.filter((neighbor) => neighbor.type !== "wall");
  };

  // Visualize node
  const visualizeNode = async (row: number, col: number, type: NodeType) => {
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((r) => r.map((n) => ({ ...n })));
      if (
        newGrid[row][col].type !== "start" &&
        newGrid[row][col].type !== "end"
      ) {
        newGrid[row][col].type = type;
      }
      return newGrid;
    });
    setStats((prev) => ({ ...prev, visitedNodes: prev.visitedNodes + 1 }));
    if (visualizationSpeed > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, 101 - visualizationSpeed)
      );
    }
  };

  // Run algorithm
  const runAlgorithm = async () => {
    if (!startNode || !endNode || isRunning) return;

    setIsRunning(true);
    setIsPaused(false);
    setStats({ visitedNodes: 0, pathLength: 0, executionTime: 0 });

    // Reset previous paths and visited nodes
    setGrid((prevGrid) => {
      return prevGrid.map((row) =>
        row.map((node) => {
          if (node.type === "visited" || node.type === "path") {
            return { ...node, type: "empty", parent: null, f: 0, g: 0, h: 0 };
          }
          return node;
        })
      );
    });

    const startTime = performance.now();
    let path: Node[] | null = null;

    switch (algorithm) {
      case "astar":
        path = await astar();
        break;
      case "dijkstra":
        path = await dijkstra();
        break;
      case "bfs":
        path = await bfs();
        break;
      case "dfs":
        path = await dfs();
        break;
      case "greedy":
        path = await greedyBestFirstSearch();
        break;
      case "bidirectional":
        path = await bidirectionalSearch();
        break;
      case "swarm":
        path = await swarm();
        break;
      case "convergentSwarm":
        path = await convergentSwarm();
        break;
      case "bidirectionalSwarm":
        path = await bidirectionalSwarm();
        break;
      default:
        break;
    }

    const endTime = performance.now();

    if (path) {
      for (const node of path) {
        if (node.type !== "start" && node.type !== "end") {
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((row) => row.map((n) => ({ ...n })));
            newGrid[node.row][node.col].type = "path";
            return newGrid;
          });
          setStats((prev) => ({ ...prev, pathLength: prev.pathLength + 1 }));
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      setStats((prev) => ({
        ...prev,
        executionTime: endTime - startTime,
      }));
    } else {
      toast.error("No path found!");
    }

    setIsRunning(false);
  };

  const pauseAlgorithm = async () => {
    await new Promise<void>((resolve) => {
      const checkPause = () => {
        if (!isPausedRef.current) resolve();
        else setTimeout(checkPause, 100);
      };
      checkPause();
    });
  };

  // A* algorithm with priority queue
  const astar = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const openSet = new MinPriorityQueue<Node>((node) => node.f);
    const closedSet: Set<string> = new Set();

    // Initialize start node
    const start = grid[startNode.row][startNode.col];
    start.g = 0;
    start.h = heuristic(start, grid[endNode.row][endNode.col]);
    start.f = start.g + start.h;
    openSet.enqueue(start);

    const openSetMap = new Map<string, Node>();
    openSetMap.set(getNodeKey(start), start);

    while (!openSet.isEmpty()) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      const current = openSet.dequeue()!;
      openSetMap.delete(getNodeKey(current));

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.weight;

        if (tentativeG < neighbor.g || !openSetMap.has(neighborKey)) {
          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, grid[endNode.row][endNode.col]);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = getNodeKey(current);

          if (!openSetMap.has(neighborKey)) {
            openSet.enqueue(neighbor);
            openSetMap.set(neighborKey, neighbor);
            await visualizeNode(neighbor.row, neighbor.col, "visited");
          }
        }
      }
    }

    return null;
  };

  // Dijkstra's algorithm with priority queue
  const dijkstra = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const openSet = new MinPriorityQueue<Node>((node) => node.g);
    const closedSet: Set<string> = new Set();

    // Initialize start node
    const start = grid[startNode.row][startNode.col];
    start.g = 0;
    openSet.enqueue(start);

    const openSetMap = new Map<string, Node>();
    openSetMap.set(getNodeKey(start), start);

    while (!openSet.isEmpty()) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      const current = openSet.dequeue()!;
      openSetMap.delete(getNodeKey(current));

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.weight;

        if (tentativeG < neighbor.g || !openSetMap.has(neighborKey)) {
          neighbor.g = tentativeG;
          neighbor.parent = getNodeKey(current);

          if (!openSetMap.has(neighborKey)) {
            openSet.enqueue(neighbor);
            openSetMap.set(neighborKey, neighbor);
            await visualizeNode(neighbor.row, neighbor.col, "visited");
          }
        }
      }
    }

    return null;
  };

  // Greedy Best-First Search with priority queue
  const greedyBestFirstSearch = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const openSet = new MinPriorityQueue<Node>((node) => node.h);
    const closedSet: Set<string> = new Set();

    const start = grid[startNode.row][startNode.col];
    start.h = heuristic(start, grid[endNode.row][endNode.col]);
    openSet.enqueue(start);

    const openSetMap = new Map<string, Node>();
    openSetMap.set(getNodeKey(start), start);

    while (!openSet.isEmpty()) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      const current = openSet.dequeue()!;
      openSetMap.delete(getNodeKey(current));

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        neighbor.h = heuristic(neighbor, grid[endNode.row][endNode.col]);
        neighbor.parent = getNodeKey(current);

        if (!openSetMap.has(neighborKey)) {
          openSet.enqueue(neighbor);
          openSetMap.set(neighborKey, neighbor);
          await visualizeNode(neighbor.row, neighbor.col, "visited");
        }
      }
    }

    return null;
  };

  // BFS algorithm
  const bfs = async (): Promise<Node[] | null> => {
    // No changes needed; BFS is correct
    if (!startNode || !endNode) return null;

    const queue: Node[] = [];
    const visited: Set<string> = new Set();

    queue.push(grid[startNode.row][startNode.col]);
    visited.add(getNodeKey(grid[startNode.row][startNode.col]));

    while (queue.length > 0) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      const current = queue.shift()!;

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);
          neighbor.parent = getNodeKey(current);
          queue.push(neighbor);

          await visualizeNode(neighbor.row, neighbor.col, "visited");
        }
      }
    }

    return null;
  };

  // DFS algorithm
  const dfs = async (): Promise<Node[] | null> => {
    // No significant changes needed; DFS is correct
    if (!startNode || !endNode) return null;

    const stack: Node[] = [];
    const visited: Set<string> = new Set();

    stack.push(grid[startNode.row][startNode.col]);

    while (stack.length > 0) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      const current = stack.pop()!;

      const currentKey = getNodeKey(current);
      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      await visualizeNode(current.row, current.col, "visited");

      const neighbors = getNeighbors(current, grid);
      // Randomize neighbor order
      neighbors.sort(() => Math.random() - 0.5);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (!visited.has(neighborKey)) {
          neighbor.parent = currentKey;
          stack.push(neighbor);
        }
      }
    }

    return null;
  };

  // Bidirectional Search algorithm with fixed path reconstruction
  const bidirectionalSearch = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const forwardQueue: Node[] = [grid[startNode.row][startNode.col]];
    const backwardQueue: Node[] = [grid[endNode.row][endNode.col]];
    const forwardVisited: Set<string> = new Set([
      getNodeKey(grid[startNode.row][startNode.col]),
    ]);
    const backwardVisited: Set<string> = new Set([
      getNodeKey(grid[endNode.row][endNode.col]),
    ]);

    const forwardParents = new Map<string, string | null>();
    const backwardParents = new Map<string, string | null>();

    forwardParents.set(getNodeKey(grid[startNode.row][startNode.col]), null);
    backwardParents.set(getNodeKey(grid[endNode.row][endNode.col]), null);

    let meetingPoint: Node | null = null;

    while (forwardQueue.length > 0 && backwardQueue.length > 0) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      // Forward step
      const currentForward = forwardQueue.shift()!;
      const currentForwardKey = getNodeKey(currentForward);

      if (backwardVisited.has(currentForwardKey)) {
        meetingPoint = currentForward;
        break;
      }

      const neighborsForward = getNeighbors(currentForward, grid);
      for (const neighbor of neighborsForward) {
        const neighborKey = getNodeKey(neighbor);
        if (!forwardVisited.has(neighborKey)) {
          forwardVisited.add(neighborKey);
          forwardParents.set(neighborKey, currentForwardKey);
          forwardQueue.push(neighbor);
          await visualizeNode(neighbor.row, neighbor.col, "visited");

          if (backwardVisited.has(neighborKey)) {
            meetingPoint = neighbor;
            break;
          }
        }
      }

      if (meetingPoint) break;

      // Backward step
      const currentBackward = backwardQueue.shift()!;
      const currentBackwardKey = getNodeKey(currentBackward);

      if (forwardVisited.has(currentBackwardKey)) {
        meetingPoint = currentBackward;
        break;
      }

      const neighborsBackward = getNeighbors(currentBackward, grid);
      for (const neighbor of neighborsBackward) {
        const neighborKey = getNodeKey(neighbor);
        if (!backwardVisited.has(neighborKey)) {
          backwardVisited.add(neighborKey);
          backwardParents.set(neighborKey, currentBackwardKey);
          backwardQueue.push(neighbor);
          await visualizeNode(neighbor.row, neighbor.col, "visited");

          if (forwardVisited.has(neighborKey)) {
            meetingPoint = neighbor;
            break;
          }
        }
      }

      if (meetingPoint) break;
    }

    if (meetingPoint) {
      return reconstructBidirectionalPath(
        meetingPoint,
        forwardParents,
        backwardParents,
        grid
      );
    }

    return null;
  };

  // Swarm Algorithm
  const swarm = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const openSet = new MinPriorityQueue<Node>((node) => node.f);
    const closedSet: Set<string> = new Set();

    const start = grid[startNode.row][startNode.col];
    start.g = 0;
    start.h = heuristic(start, grid[endNode.row][endNode.col]);
    start.f = start.g - start.h;
    openSet.enqueue(start);

    const openSetMap = new Map<string, Node>();
    openSetMap.set(getNodeKey(start), start);

    while (!openSet.isEmpty()) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      const current = openSet.dequeue()!;
      openSetMap.delete(getNodeKey(current));

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.weight;

        if (tentativeG < neighbor.g || !openSetMap.has(neighborKey)) {
          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, grid[endNode.row][endNode.col]);
          neighbor.f = neighbor.g - neighbor.h;
          neighbor.parent = getNodeKey(current);

          if (!openSetMap.has(neighborKey)) {
            openSet.enqueue(neighbor);
            openSetMap.set(neighborKey, neighbor);
            await visualizeNode(neighbor.row, neighbor.col, "visited");
          }
        }
      }
    }

    return null;
  };

  // Convergent Swarm Algorithm (Adjusted to differ from A*)
  const convergentSwarm = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const weightFactor = 1.2; // Adjust this factor to change the algorithm's behavior
    const openSet = new MinPriorityQueue<Node>((node) => node.f);
    const closedSet: Set<string> = new Set();

    const start = grid[startNode.row][startNode.col];
    start.g = 0;
    start.h = heuristic(start, grid[endNode.row][endNode.col]);
    start.f = start.g + weightFactor * start.h;
    openSet.enqueue(start);

    const openSetMap = new Map<string, Node>();
    openSetMap.set(getNodeKey(start), start);

    while (!openSet.isEmpty()) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      const current = openSet.dequeue()!;
      openSetMap.delete(getNodeKey(current));

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.weight;

        if (tentativeG < neighbor.g || !openSetMap.has(neighborKey)) {
          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, grid[endNode.row][endNode.col]);
          neighbor.f = neighbor.g + weightFactor * neighbor.h;
          neighbor.parent = getNodeKey(current);

          if (!openSetMap.has(neighborKey)) {
            openSet.enqueue(neighbor);
            openSetMap.set(neighborKey, neighbor);
            await visualizeNode(neighbor.row, neighbor.col, "visited");
          }
        }
      }
    }

    return null;
  };

  // Bidirectional Swarm Algorithm with fixed path reconstruction
  const bidirectionalSwarm = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const forwardOpenSet = new MinPriorityQueue<Node>((node) => node.f);
    const backwardOpenSet = new MinPriorityQueue<Node>((node) => node.f);
    const forwardClosedSet: Set<string> = new Set();
    const backwardClosedSet: Set<string> = new Set();

    const forwardParents = new Map<string, string | null>();
    const backwardParents = new Map<string, string | null>();

    const start = grid[startNode.row][startNode.col];
    start.g = 0;
    start.h = heuristic(start, grid[endNode.row][endNode.col]);
    start.f = start.g - start.h;
    forwardOpenSet.enqueue(start);
    forwardParents.set(getNodeKey(start), null);

    const end = grid[endNode.row][endNode.col];
    end.g = 0;
    end.h = heuristic(end, grid[startNode.row][startNode.col]);
    end.f = end.g - end.h;
    backwardOpenSet.enqueue(end);
    backwardParents.set(getNodeKey(end), null);

    let meetingPoint: Node | null = null;

    while (!forwardOpenSet.isEmpty() && !backwardOpenSet.isEmpty()) {
      if (isPausedRef.current) {
        await pauseAlgorithm();
      }

      // Forward step
      const currentForward = forwardOpenSet.dequeue()!;
      const currentForwardKey = getNodeKey(currentForward);
      forwardClosedSet.add(currentForwardKey);

      if (backwardClosedSet.has(currentForwardKey)) {
        meetingPoint = currentForward;
        break;
      }

      const neighborsForward = getNeighbors(currentForward, grid);
      for (const neighbor of neighborsForward) {
        const neighborKey = getNodeKey(neighbor);
        if (forwardClosedSet.has(neighborKey)) continue;

        const tentativeG = currentForward.g + neighbor.weight;

        if (tentativeG < neighbor.g) {
          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, grid[endNode.row][endNode.col]);
          neighbor.f = neighbor.g - neighbor.h;
          forwardParents.set(neighborKey, currentForwardKey);

          forwardOpenSet.enqueue(neighbor);
          await visualizeNode(neighbor.row, neighbor.col, "visited");

          if (backwardClosedSet.has(neighborKey)) {
            meetingPoint = neighbor;
            break;
          }
        }
      }

      if (meetingPoint) break;

      // Backward step
      const currentBackward = backwardOpenSet.dequeue()!;
      const currentBackwardKey = getNodeKey(currentBackward);
      backwardClosedSet.add(currentBackwardKey);

      if (forwardClosedSet.has(currentBackwardKey)) {
        meetingPoint = currentBackward;
        break;
      }

      const neighborsBackward = getNeighbors(currentBackward, grid);
      for (const neighbor of neighborsBackward) {
        const neighborKey = getNodeKey(neighbor);
        if (backwardClosedSet.has(neighborKey)) continue;

        const tentativeG = currentBackward.g + neighbor.weight;

        if (tentativeG < neighbor.g) {
          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, grid[startNode.row][startNode.col]);
          neighbor.f = neighbor.g - neighbor.h;
          backwardParents.set(neighborKey, currentBackwardKey);

          backwardOpenSet.enqueue(neighbor);
          await visualizeNode(neighbor.row, neighbor.col, "visited");

          if (forwardClosedSet.has(neighborKey)) {
            meetingPoint = neighbor;
            break;
          }
        }
      }

      if (meetingPoint) break;
    }

    if (meetingPoint) {
      return reconstructBidirectionalPath(
        meetingPoint,
        forwardParents,
        backwardParents,
        grid
      );
    }

    return null;
  };

  // Generate random obstacles
  const generateRandomObstacles = () => {
    if (isRunning) return;

    const newGrid = createInitialGrid(rows, cols);
    const totalCells = rows * cols;
    const obstaclesToAdd = Math.floor((totalCells * obstaclePercentage) / 100);

    let addedObstacles = 0;
    while (addedObstacles < obstaclesToAdd) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      if (newGrid[row][col].type === "empty") {
        newGrid[row][col].type = "wall";
        addedObstacles++;
      }
    }

    setGrid(newGrid);
    setStartNode(null);
    setEndNode(null);
  };

  // Generate maze using Recursive Backtracking
  const generateMaze = () => {
    if (isRunning) return;

    const newGrid = createInitialGrid(rows, cols);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newGrid[row][col].type = "wall";
      }
    }

    const stack: [number, number][] = [];
    const startRow = 1;
    const startCol = 1;
    newGrid[startRow][startCol].type = "empty";
    stack.push([startRow, startCol]);

    while (stack.length > 0) {
      const [currentRow, currentCol] = stack[stack.length - 1];
      const neighbors: [number, number][] = [
        [currentRow - 2, currentCol],
        [currentRow + 2, currentCol],
        [currentRow, currentCol - 2],
        [currentRow, currentCol + 2],
      ].filter(
        ([r, c]) =>
          r > 0 &&
          r < rows - 1 &&
          c > 0 &&
          c < cols - 1 &&
          newGrid[r][c].type === "wall"
      );

      if (neighbors.length > 0) {
        const [nextRow, nextCol] =
          neighbors[Math.floor(Math.random() * neighbors.length)];
        newGrid[nextRow][nextCol].type = "empty";
        newGrid[Math.floor((currentRow + nextRow) / 2)][
          Math.floor((currentCol + nextCol) / 2)
        ].type = "empty";
        stack.push([nextRow, nextCol]);
      } else {
        stack.pop();
      }
    }

    setGrid(newGrid);
    setStartNode(null);
    setEndNode(null);
  };

  // Export grid
  const exportGrid = () => {
    const gridData = grid.map((row) =>
      row.map((node) => ({
        type: node.type,
        weight: node.weight,
      }))
    );
    const dataStr = JSON.stringify(gridData);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "grid.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Import grid
  const importGrid = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedGrid = JSON.parse(e.target?.result as string);
          if (
            Array.isArray(importedGrid) &&
            importedGrid.length === rows &&
            importedGrid[0].length === cols
          ) {
            const newGrid = importedGrid.map((row: any[], rowIndex: number) =>
              row.map((cell: any, colIndex: number) => ({
                ...grid[rowIndex][colIndex],
                type: cell.type as NodeType,
                weight: cell.weight,
              }))
            );
            setGrid(newGrid);
            setStartNode(null);
            setEndNode(null);
            toast.success("Grid imported successfully");
          } else {
            toast.error("Invalid grid format");
          }
        } catch (error) {
          toast.error("Error importing grid");
        }
      };
      reader.readAsText(file);
    }
  };

  // Set up the drawing interaction
  const handleMouseDown = (row: number, col: number) => {
    setIsDrawing(true);
    handleNodeInteraction(row, col); // Start interaction on mouse down
  };

  const handleMouseUp = () => {
    setIsDrawing(false); // Stop drawing when the mouse button is released
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDrawing) {
      handleNodeInteraction(row, col); // Only interact if the mouse is being dragged
    }
  };

  // Render grid
  const renderGrid = () => {
    return grid.map((row, rowIndex) => (
      <div key={rowIndex} className="flex">
        {row.map((node, colIndex) => {
          let bgColor = "bg-white";
          switch (node.type) {
            case "start":
              bgColor = "bg-green-500";
              break;
            case "end":
              bgColor = "bg-red-500";
              break;
            case "wall":
              bgColor = "bg-gray-800";
              break;
            case "weight":
              const yellowShade = Math.min(
                Math.floor((node.weight * 100) / 10) * 100,
                900
              );
              bgColor = `bg-yellow-${yellowShade}`;
              break;
            case "path":
              bgColor = "bg-purple-400";
              break;
            case "visited":
              bgColor = showHeatmap
                ? `bg-blue-${Math.min(
                    Math.floor((node.f * 100) / (rows * cols)) * 100,
                    900
                  )}`
                : "bg-blue-200";
              break;
            default:
              bgColor = "bg-white";
          }

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`w-4 h-4 border border-gray-200 ${bgColor} cursor-pointer`}
              onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
              onMouseUp={handleMouseUp}
              onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
            />
          );
        })}
      </div>
    ));
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white p-4 shadow-md overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Pathfinding Visualizer</h1>
        <Tabs defaultValue="controls">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="controls">
            <div className="space-y-4">
              <div>
                <Label htmlFor="algorithm">Algorithm</Label>
                <Select
                  value={algorithm}
                  onValueChange={(value) =>
                    setAlgorithm(
                      value as
                        | "astar"
                        | "dijkstra"
                        | "bfs"
                        | "dfs"
                        | "greedy"
                        | "bidirectional"
                        | "swarm"
                        | "convergentSwarm"
                        | "bidirectionalSwarm"
                    )
                  }
                >
                  <SelectTrigger id="algorithm">
                    <SelectValue placeholder="Select Algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="astar">A* Algorithm</SelectItem>
                    <SelectItem value="dijkstra">
                      Dijkstra's Algorithm
                    </SelectItem>
                    <SelectItem value="bfs">Breadth-First Search</SelectItem>
                    <SelectItem value="dfs">Depth-First Search</SelectItem>
                    <SelectItem value="greedy">
                      Greedy Best-First Search
                    </SelectItem>
                    <SelectItem value="bidirectional">
                      Bidirectional Search
                    </SelectItem>
                    <SelectItem value="swarm">Swarm Algorithm</SelectItem>
                    <SelectItem value="convergentSwarm">
                      Convergent Swarm Algorithm
                    </SelectItem>
                    <SelectItem value="bidirectionalSwarm">
                      Bidirectional Swarm Algorithm
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={runAlgorithm}
                  disabled={isRunning || !startNode || !endNode}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? "Running..." : "Run"}
                </Button>
                <Button
                  onClick={handlePause}
                  disabled={!isRunning}
                  className="flex-1"
                >
                  {isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button
                onClick={resetGrid}
                disabled={isRunning}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Grid
              </Button>
              <Button
                onClick={generateRandomObstacles}
                disabled={isRunning}
                className="w-full"
              >
                Random Obstacles
              </Button>
              <Button
                onClick={generateMaze}
                disabled={isRunning}
                className="w-full"
              >
                Generate Maze
              </Button>
              <div>
                <Label htmlFor="obstacle-density">
                  Obstacle Density: {obstaclePercentage}%
                </Label>
                <Slider
                  id="obstacle-density"
                  value={[obstaclePercentage]}
                  onValueChange={(value) => setObstaclePercentage(value[0])}
                  max={40}
                  step={1}
                />
              </div>
              <div>
                <Label htmlFor="visualization-speed">Visualization Speed</Label>
                <Slider
                  id="visualization-speed"
                  value={[visualizationSpeed]}
                  onValueChange={(value) => setVisualizationSpeed(value[0])}
                  max={100}
                  step={1}
                />
              </div>
              <div>
                <Label htmlFor="weight-value">
                  Weight Value: {weightValue}
                </Label>
                <Slider
                  id="weight-value"
                  value={[weightValue]}
                  onValueChange={(value) => setWeightValue(value[0])}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label>Draw Mode:</Label>
                <Button
                  variant={drawMode === "start" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDrawMode("start")}
                >
                  <Flag className="w-4 h-4" />
                </Button>
                <Button
                  variant={drawMode === "end" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDrawMode("end")}
                >
                  <Target className="w-4 h-4" />
                </Button>
                <Button
                  variant={drawMode === "wall" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDrawMode("wall")}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant={drawMode === "weight" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDrawMode("weight")}
                >
                  <Info className="w-4 h-4" />
                </Button>
                <Button
                  variant={drawMode === "erase" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDrawMode("erase")}
                >
                  <Eraser className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="heatmap-mode"
                  checked={showHeatmap}
                  onCheckedChange={setShowHeatmap}
                />
                <Label htmlFor="heatmap-mode">Show Heatmap</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportGrid} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={() =>
                    document.getElementById("import-input")?.click()
                  }
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <input
                  id="import-input"
                  type="file"
                  accept=".json"
                  onChange={importGrid}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Algorithm Statistics</CardTitle>
                <CardDescription>
                  Performance metrics for the current run
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>Visited Nodes: {stats.visitedNodes}</div>
                  <div>Path Length: {stats.pathLength}</div>
                  <div>Execution Time: {stats.executionTime.toFixed(2)} ms</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <div className="flex-1 p-4 overflow-auto flex justify-center items-center">
        <div className="border border-gray-300 bg-white p-2 inline-block rounded-lg">
          {renderGrid()}
        </div>
      </div>
      {/* <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4"
            >
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="end">
            <p>Green: Start</p>
            <p>Red: End</p>
            <p>Black: Wall</p>
            <p>Yellow: Weighted Node</p>
            <p>Blue: Visited Node</p>
            <p>Purple: Path</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ToastContainer position="bottom-right" /> */}
    </div>
  );
}
