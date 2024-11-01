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
import { toast, ToastContainer } from "react-toastify";
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
        f: Infinity, // Initialize to Infinity
        g: Infinity, // Initialize to Infinity
        h: 0, // Will be set when needed
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
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col); // Manhattan distance
};

// Helper to get node key
const getNodeKey = (node: Node): string => `${node.row},${node.col}`;

// Reconstruct path
const reconstructPath = (endNode: Node, grid: Node[][]): Node[] => {
  const path: Node[] = [];
  let current: Node | null = endNode;
  let totalCost = 0; // Initialize total cost

  while (current && current.parent) {
    const [row, col]: any = current.parent.split(",").map(Number);
    current = grid[row][col];
    if (current && current.type !== "start" && current.type !== "end") {
      path.unshift(current);
      totalCost += current.weight; // Accumulate weight
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
  let currentKey: string | any = getNodeKey(meetingPoint);
  let totalCost = 0; // Initialize total cost

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
      totalCost += currentNode.weight; // Accumulate weight
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
      totalCost += currentNode.weight; // Accumulate weight
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
    "astar" | "dijkstra" | "bfs" | "dfs" | "greedy" | "bidirectional"
  >("astar"); // Removed swarm algorithms
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [obstaclePercentage, setObstaclePercentage] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<
    "wall" | "weight" | "erase" | "start" | "end"
  >("start");
  const [visualizationSpeed, setVisualizationSpeed] = useState(80);
  const [weightValue, setWeightValue] = useState(5);
  const [stats, setStats] = useState({
    visitedNodes: 0,
    pathLength: 0,
    executionTime: 0,
    pathCost: 0, // New metric
  });
  const [showHeatmap, setShowHeatmap] = useState(false);

  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const handlePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
    console.log(`Algorithm ${isPausedRef.current ? "paused" : "resumed"}`);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const newRows = Math.floor((window.innerHeight - 150) / 16);
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
    setStats({ visitedNodes: 0, pathLength: 0, executionTime: 0, pathCost: 0 });
    console.log("Grid reset");
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
      console.log(
        `Node (${row}, ${col}) set to type: ${type} with weight: ${weight}`
      );
      return newGrid;
    });

    if (type === "start") {
      // Calculate heuristic from start to end if end exists
      const end = endNode ? grid[endNode.row][endNode.col] : null;
      const h = end ? heuristic(grid[row][col], end) : 0;

      setStartNode({
        row,
        col,
        type,
        f: h, // f = g + h; g = 0 for start
        g: 0,
        h: h,
        weight,
        parent: null,
      });
      console.log(`Start node updated to (${row}, ${col})`);

      // Update the start node's f in the grid
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => r.map((n) => ({ ...n })));
        newGrid[row][col].g = 0;
        newGrid[row][col].h = h;
        newGrid[row][col].f = h;
        return newGrid;
      });
    } else if (type === "end") {
      // Recalculate heuristic for start node if it exists
      const start = startNode ? grid[startNode.row][startNode.col] : null;
      const h = start ? heuristic(start, grid[row][col]) : 0;

      setEndNode({
        row,
        col,
        type,
        f: 0,
        g: 0,
        h: 0,
        weight,
        parent: null,
      });
      console.log(`End node updated to (${row}, ${col})`);

      // Update heuristic for start node if it exists
      if (startNode) {
        setGrid((prevGrid) => {
          const newGrid = prevGrid.map((r) => r.map((n) => ({ ...n })));
          newGrid[startNode.row][startNode.col].h = h;
          newGrid[startNode.row][startNode.col].f =
            newGrid[startNode.row][startNode.col].g + h;
          return newGrid;
        });
      }
    }
  };

  // Handle node interaction
  const handleNodeInteraction = (row: number, col: number) => {
    if (isRunning) return;

    const node = grid[row][col];
    console.log(`Interacting with node (${row}, ${col}) in mode: ${drawMode}`);

    if (drawMode === "start" && node.type !== "start") {
      if (startNode) {
        setNodeType(startNode.row, startNode.col, "empty");
        console.log(
          `Cleared previous start node at (${startNode.row}, ${startNode.col})`
        );
      }
      setNodeType(row, col, "start");
      console.log(`Set node (${row}, ${col}) as start`);
      setDrawMode("end");
      console.log("Draw Mode set to: end");
    } else if (drawMode === "end" && node.type !== "end") {
      if (endNode) {
        setNodeType(endNode.row, endNode.col, "empty");
        console.log(
          `Cleared previous end node at (${endNode.row}, ${endNode.col})`
        );
      }
      setNodeType(row, col, "end");
      console.log(`Set node (${row}, ${col}) as end`);
    } else {
      switch (drawMode) {
        case "wall":
          setNodeType(row, col, node.type === "wall" ? "empty" : "wall");
          console.log(
            `Toggled node (${row}, ${col}) to ${
              node.type === "wall" ? "empty" : "wall"
            }`
          );
          break;
        case "weight":
          setNodeType(
            row,
            col,
            node.type === "weight" ? "empty" : "weight",
            weightValue
          );
          console.log(
            `Toggled node (${row}, ${col}) to ${
              node.type === "weight" ? "empty" : "weight"
            } with weight ${weightValue}`
          );
          break;
        case "erase":
          if (node.type === "start") {
            setStartNode(null);
            console.log(`Erased start node at (${row}, ${col})`);
          }
          if (node.type === "end") {
            setEndNode(null);
            console.log(`Erased end node at (${row}, ${col})`);
          }
          setNodeType(row, col, "empty");
          console.log(`Set node (${row}, ${col}) to empty`);
          break;
        default:
          break;
      }
    }
  };

  // Get neighbors (fixed order: up, down, left, right)
  const getNeighbors = (node: Node, currentGrid: Node[][]): Node[] => {
    const neighbors: Node[] = [];
    const { row, col } = node;

    if (row > 0) neighbors.push(currentGrid[row - 1][col]); // Up
    if (row < rows - 1) neighbors.push(currentGrid[row + 1][col]); // Down
    if (col > 0) neighbors.push(currentGrid[row][col - 1]); // Left
    if (col < cols - 1) neighbors.push(currentGrid[row][col + 1]); // Right

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
    setStats({ visitedNodes: 0, pathLength: 0, executionTime: 0, pathCost: 0 });

    // Reset previous paths and visited nodes
    setGrid((prevGrid) => {
      return prevGrid.map((row) =>
        row.map((node) => {
          if (node.type === "visited" || node.type === "path") {
            return {
              ...node,
              type: "empty",
              parent: null,
              f: Infinity,
              g: Infinity,
              h: 0,
            };
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
      default:
        break;
    }

    const endTime = performance.now();

    if (path) {
      let totalCost = 0;
      for (const node of path) {
        if (node.type !== "start" && node.type !== "end") {
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((row) => row.map((n) => ({ ...n })));
            newGrid[node.row][node.col].type = "path";
            return newGrid;
          });
          setStats((prev) => ({
            ...prev,
            pathLength: prev.pathLength + 1,
            pathCost: prev.pathCost + node.weight, // Accumulate cost
          }));
          totalCost += node.weight;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      setStats((prev) => ({
        ...prev,
        executionTime: endTime - startTime,
        pathCost: totalCost,
      }));
      console.log(`Path found with total cost: ${totalCost}`);
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

      console.log(
        `Processing node (${current.row}, ${current.col}) with f=${current.f}`
      );

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.weight;
        console.log(
          `Evaluating neighbor (${neighbor.row}, ${neighbor.col}) with tentativeG=${tentativeG}`
        );

        if (tentativeG < neighbor.g || !openSetMap.has(neighborKey)) {
          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, grid[endNode.row][endNode.col]);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = getNodeKey(current);

          console.log(
            `Updating node (${neighbor.row}, ${neighbor.col}): g=${neighbor.g}, h=${neighbor.h}, f=${neighbor.f}`
          );

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

      console.log(
        `Processing node (${current.row}, ${current.col}) with g=${current.g}`
      );

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.weight;
        console.log(
          `Evaluating neighbor (${neighbor.row}, ${neighbor.col}) with tentativeG=${tentativeG}`
        );

        if (tentativeG < neighbor.g || !openSetMap.has(neighborKey)) {
          neighbor.g = tentativeG;
          neighbor.parent = getNodeKey(current);

          console.log(
            `Updating node (${neighbor.row}, ${neighbor.col}): g=${neighbor.g}`
          );

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

  // Modified Greedy Best-First Search with weights
  const greedyBestFirstSearch = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    // Incorporate weight into priority
    const openSet = new MinPriorityQueue<Node>((node) => node.h + node.weight);
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

      console.log(
        `Processing node (${current.row}, ${current.col}) with h=${current.h} and weight=${current.weight}`
      );

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

        console.log(
          `Evaluating neighbor (${neighbor.row}, ${neighbor.col}) with h=${neighbor.h} and weight=${neighbor.weight}`
        );

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

      console.log(`Processing node (${current.row}, ${current.col})`);

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

          console.log(`Visiting neighbor (${neighbor.row}, ${neighbor.col})`);
          await visualizeNode(neighbor.row, neighbor.col, "visited");
        }
      }
    }

    return null;
  };

  // DFS algorithm (Deterministic: fixed neighbor order)
  const dfs = async (): Promise<Node[] | null> => {
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

      console.log(`Processing node (${current.row}, ${current.col})`);

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      await visualizeNode(current.row, current.col, "visited");

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (!visited.has(neighborKey)) {
          neighbor.parent = currentKey;
          stack.push(neighbor);
          console.log(
            `Adding neighbor (${neighbor.row}, ${neighbor.col}) to stack`
          );
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

      console.log(
        `Forward: Processing node (${currentForward.row}, ${currentForward.col})`
      );

      if (backwardVisited.has(currentForwardKey)) {
        meetingPoint = currentForward;
        console.log(
          `Meeting point found at (${currentForward.row}, ${currentForward.col})`
        );
        break;
      }

      const neighborsForward = getNeighbors(currentForward, grid);
      for (const neighbor of neighborsForward) {
        const neighborKey = getNodeKey(neighbor);
        if (!forwardVisited.has(neighborKey)) {
          forwardVisited.add(neighborKey);
          forwardParents.set(neighborKey, currentForwardKey);
          forwardQueue.push(neighbor);
          console.log(
            `Forward: Visiting neighbor (${neighbor.row}, ${neighbor.col})`
          );
          await visualizeNode(neighbor.row, neighbor.col, "visited");

          if (backwardVisited.has(neighborKey)) {
            meetingPoint = neighbor;
            console.log(
              `Meeting point found at (${neighbor.row}, ${neighbor.col})`
            );
            break;
          }
        }
      }

      if (meetingPoint) break;

      // Backward step
      const currentBackward = backwardQueue.shift()!;
      const currentBackwardKey = getNodeKey(currentBackward);

      console.log(
        `Backward: Processing node (${currentBackward.row}, ${currentBackward.col})`
      );

      if (forwardVisited.has(currentBackwardKey)) {
        meetingPoint = currentBackward;
        console.log(
          `Meeting point found at (${currentBackward.row}, ${currentBackward.col})`
        );
        break;
      }

      const neighborsBackward = getNeighbors(currentBackward, grid);
      for (const neighbor of neighborsBackward) {
        const neighborKey = getNodeKey(neighbor);
        if (!backwardVisited.has(neighborKey)) {
          backwardVisited.add(neighborKey);
          backwardParents.set(neighborKey, currentBackwardKey);
          backwardQueue.push(neighbor);
          console.log(
            `Backward: Visiting neighbor (${neighbor.row}, ${neighbor.col})`
          );
          await visualizeNode(neighbor.row, neighbor.col, "visited");

          if (forwardVisited.has(neighborKey)) {
            meetingPoint = neighbor;
            console.log(
              `Meeting point found at (${neighbor.row}, ${neighbor.col})`
            );
            break;
          }
        }
      }

      if (meetingPoint) break;
    }

    if (meetingPoint) {
      console.log(
        `Reconstructing path through meeting point at (${meetingPoint.row}, ${meetingPoint.col})`
      );
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
        console.log(`Added wall at (${row}, ${col})`);
      }
    }

    setGrid(newGrid);
    setStartNode(null);
    setEndNode(null);
    setStats({ visitedNodes: 0, pathLength: 0, executionTime: 0, pathCost: 0 });
    console.log("Random obstacles generated");
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
      const neighbors: [number, number][] | any = [
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
        console.log(`Carving path to (${nextRow}, ${nextCol})`);
      } else {
        stack.pop();
        console.log("Backtracking");
      }
    }

    setGrid(newGrid);
    setStartNode(null);
    setEndNode(null);
    setStats({ visitedNodes: 0, pathLength: 0, executionTime: 0, pathCost: 0 });
    console.log("Maze generated");
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
    console.log("Grid exported");
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
            setStats({
              visitedNodes: 0,
              pathLength: 0,
              executionTime: 0,
              pathCost: 0,
            });
            toast.success("Grid imported successfully");
            console.log("Grid imported from file");
          } else {
            toast.error("Invalid grid format");
            console.error("Imported grid format is invalid");
          }
        } catch (error) {
          toast.error("Error importing grid");
          console.error("Error parsing imported grid:", error);
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
          let style: React.CSSProperties = {};

          switch (node.type) {
            case "start":
              style = { backgroundColor: "#22c55e" }; // Tailwind Green-500
              break;
            case "end":
              style = { backgroundColor: "#ef4444" }; // Tailwind Red-500
              break;
            case "wall":
              style = { backgroundColor: "#374151" }; // Tailwind Gray-800
              break;
            case "weight":
              const yellowIntensity = Math.min(
                Math.floor((node.weight * 255) / 10),
                255
              ); // Scale weight to 0-255
              style = {
                backgroundColor: `rgb(255, ${255 - yellowIntensity}, 0)`,
              }; // Gradient from yellow to red
              break;
            case "path":
              style = { backgroundColor: "#c084fc" }; // Tailwind Purple-400
              break;
            case "visited":
              style = showHeatmap
                ? {
                    backgroundColor: `rgb(0, 0, ${Math.min(
                      Math.floor((node.f * 100) / (rows * cols)) * 2.55,
                      255
                    )})`,
                  }
                : { backgroundColor: "#bfdbfe" }; // Tailwind Blue-200
              break;
            default:
              style = { backgroundColor: "#ffffff" }; // White
          }

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`w-4 h-4 border border-gray-200 cursor-pointer`}
              style={style}
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
      <div className="w-80 bg-white p-4 shadow-md overflow-y-auto h-screen">
        <h1 className="text-2xl font-bold mb-4">Pathfinding Visualizer</h1>
        {/* Controls */}
        <div className="flex flex-col h-[92.5%] justify-between">
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
                )
              }
            >
              <SelectTrigger id="algorithm">
                <SelectValue placeholder="Select Algorithm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="astar">A* Algorithm</SelectItem>
                <SelectItem value="dijkstra">Dijkstra's Algorithm</SelectItem>
                <SelectItem value="bfs">Breadth-First Search</SelectItem>
                <SelectItem value="dfs">Depth-First Search</SelectItem>
                <SelectItem value="greedy">Greedy Best-First Search</SelectItem>
                <SelectItem value="bidirectional">
                  Bidirectional Search
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
          <Button onClick={resetGrid} disabled={isRunning} className="w-full">
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
            <Label htmlFor="weight-value">Weight Value: {weightValue}</Label>
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
              onClick={() => {
                setDrawMode("start");
                console.log("Draw Mode set to: start");
              }}
            >
              <Flag className="w-4 h-4" />
            </Button>
            <Button
              variant={drawMode === "end" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDrawMode("end");
                console.log("Draw Mode set to: end");
              }}
            >
              <Target className="w-4 h-4" />
            </Button>
            <Button
              variant={drawMode === "wall" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDrawMode("wall");
                console.log("Draw Mode set to: wall");
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant={drawMode === "weight" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDrawMode("weight");
                console.log("Draw Mode set to: weight");
              }}
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button
              variant={drawMode === "erase" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDrawMode("erase");
                console.log("Draw Mode set to: erase");
              }}
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
              onClick={() => document.getElementById("import-input")?.click()}
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
      </div>
      <div className="flex-1 p-4 overflow-auto flex flex-col">
        {/* Navbar */}
        <div className="flex items-center justify-between bg-white p-2 -m-4 mb-4 pr-4">
          {/* Stats */}
          <div className="space-x-6 flex text-sm font-medium">
            <div>Visited Nodes: {stats.visitedNodes}</div>
            <div>Path Length: {stats.pathLength}</div>
            <div>Total Path Cost: {stats.pathCost}</div>
            <div>Execution Time: {stats.executionTime.toFixed(2)} ms</div>
          </div>
          {/* GitHub link */}
          <div>
            <a
              href="https://github.com/basith-ahmed/search-algo-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm"
            >
              View on GitHub
            </a>
          </div>
        </div>
        {/* Grid */}
        <div className="flex-1 flex justify-center items-center">
          <div className="border border-gray-300 bg-white p-2 inline-block rounded-lg">
            {renderGrid()}
          </div>
        </div>
        {/* Footer */}
        <div className="bg-white p-2 -m-4 mt-4 pr-4">
          {/* Color Legend */}
          <div className="flex flex-row items-center space-x-4">
            <h2 className="font-semibold text-sm text-nowrap">Color Legend:</h2>
            <ul className="flex flex-row flex-wrap w-full space-x-4 text-sm justify-between">
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "#22c55e" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                Start Node
              </li>
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "#ef4444" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                End Node
              </li>
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "#374151" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                Walls
              </li>
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "rgb(255, 255, 0)" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                Weight 1
              </li>
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "rgb(255, 127, 0)" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                Weight 5
              </li>
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "rgb(255, 0, 0)" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                Weight 10
              </li>
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "#c084fc" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                Path
              </li>
              <li className="flex items-center">
                <span
                  style={{ backgroundColor: "#bfdbfe" }}
                  className="inline-block w-4 h-4 rounded mr-2"
                ></span>
                Visited
              </li>
            </ul>
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
}
