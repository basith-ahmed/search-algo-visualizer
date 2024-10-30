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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  parent: string | null; // Using string keys to identify parent nodes
}

// Grid size
// const rows = 40;
// const cols = 60;
// const rows = ((window.innerHeight - 74) / 16);
// const cols = ((window.innerWidth - (320 + 74)) / 16);

// Create initial grid
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
    const [row, col]: any = current.parent.split(",").map(Number);
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
  grid: Node[][]
): Node[] => {
  const path: Node[] = [];
  let current: Node | null = meetingPoint;

  // Forward path
  while (current && current.parent) {
    const [row, col]: any = current.parent.split(",").map(Number);
    current = grid[row][col];
    if (current && current.type !== "start" && current.type !== "end") {
      path.unshift(current);
    }
  }

  // Reset current to meeting point for backward path
  current = meetingPoint;

  // Backward path
  while (current && current.parent) {
    const [row, col]: any = current.parent.split(",").map(Number);
    current = grid[row][col];
    if (current && current.type !== "start" && current.type !== "end") {
      path.push(current);
    }
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
   const animationFrameId = useRef<number | null>(null);
   const [stats, setStats] = useState({
     visitedNodes: 0,
     pathLength: 0,
     executionTime: 0,
   });
   const [showHeatmap, setShowHeatmap] = useState(false);

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
    setGrid((prevGrid: any) => {
      const newGrid = prevGrid.map((row: any) =>
        row.map((node: any) => {
          if (node.type === "visited" || node.type === "path") {
            return { ...node, type: "empty", parent: null, f: 0, g: 0, h: 0 };
          }
          return node;
        })
      );
      return newGrid;
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
      for (const node of path) {
        if (node.type !== "start" && node.type !== "end") {
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((r) => r.map((n) => ({ ...n })));
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

  // A* algorithm
  const astar = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const openSet: Node[] = [];
    const closedSet: Set<string> = new Set();
    const cameFrom: { [key: string]: string | null } = {};

    // Initialize start node
    const start = grid[startNode.row][startNode.col];
    start.g = 0;
    start.h = heuristic(start, grid[endNode.row][endNode.col]);
    start.f = start.g + start.h;
    openSet.push(start);

    while (openSet.length > 0) {
      if (isPaused) {
        await new Promise<void>((resolve) => {
          const checkPause = () => {
            if (!isPaused) resolve();
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
      }

      // Get node with lowest f
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.weight;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tentativeG >= neighbor.g) {
          continue;
        }

        neighbor.g = tentativeG;
        neighbor.h = heuristic(neighbor, grid[endNode.row][endNode.col]);
        neighbor.f = neighbor.g + neighbor.h;
        cameFrom[getNodeKey(neighbor)] = getNodeKey(current);

        await visualizeNode(neighbor.row, neighbor.col, "visited");
      }
    }

    return null;
  };

  // Dijkstra's algorithm
  const dijkstra = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const unvisited = new Set<string>();
    const distances: { [key: string]: number } = {};
    const cameFrom: { [key: string]: string | null } = {};

    grid.forEach((row) => {
      row.forEach((node) => {
        const key = getNodeKey(node);
        distances[key] = Infinity;
        cameFrom[key] = null;
        unvisited.add(key);
      });
    });

    const startKey = getNodeKey(grid[startNode.row][startNode.col]);
    distances[startKey] = 0;

    while (unvisited.size > 0) {
      if (isPaused) {
        await new Promise<void>((resolve) => {
          const checkPause = () => {
            if (!isPaused) resolve();
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
      }

      // Select the node with the smallest distance
      let currentKey: string | any;
      let smallestDistance = Infinity;
      unvisited.forEach((key) => {
        if (distances[key] < smallestDistance) {
          smallestDistance = distances[key];
          currentKey = key;
        }
      });

      if (!currentKey) break;

      if (currentKey === getNodeKey(grid[endNode.row][endNode.col])) {
        const end = grid[endNode.row][endNode.col];
        return reconstructPath(end, grid);
      }

      unvisited.delete(currentKey);
      const [currentRow, currentCol] = currentKey.split(",").map(Number);
      const currentNode = grid[currentRow][currentCol];

      const neighbors = getNeighbors(currentNode, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (!unvisited.has(neighborKey)) continue;

        const alt = distances[currentKey] + neighbor.weight;
        if (alt < distances[neighborKey]) {
          distances[neighborKey] = alt;
          cameFrom[neighborKey] = currentKey;
          neighbor.parent = currentKey;

          await visualizeNode(neighbor.row, neighbor.col, "visited");
        }
      }
    }

    return null;
  };

  // Breadth-First Search (BFS) algorithm
  const bfs = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const queue: Node[] = [];
    const visited: Set<string> = new Set();

    queue.push(grid[startNode.row][startNode.col]);
    visited.add(getNodeKey(grid[startNode.row][startNode.col]));

    while (queue.length > 0) {
      if (isPaused) {
        await new Promise<void>((resolve) => {
          const checkPause = () => {
            if (!isPaused) resolve();
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
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

  // Depth-First Search (DFS) algorithm
  const dfs = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const stack: Node[] = [];
    const visited: Set<string> = new Set();

    stack.push(grid[startNode.row][startNode.col]);

    while (stack.length > 0) {
      if (isPaused) {
        await new Promise<void>((resolve) => {
          const checkPause = () => {
            if (!isPaused) resolve();
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
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
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const neighbor = neighbors[i];
        const neighborKey = getNodeKey(neighbor);
        if (!visited.has(neighborKey)) {
          neighbor.parent = currentKey;
          stack.push(neighbor);
        }
      }
    }

    return null;
  };

  // Greedy Best-First Search algorithm
  const greedyBestFirstSearch = async (): Promise<Node[] | null> => {
    if (!startNode || !endNode) return null;

    const openSet: Node[] = [];
    const closedSet: Set<string> = new Set();

    openSet.push(grid[startNode.row][startNode.col]);

    while (openSet.length > 0) {
      if (isPaused) {
        await new Promise<void>((resolve) => {
          const checkPause = () => {
            if (!isPaused) resolve();
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
      }

      // Select node with lowest heuristic
      openSet.sort(
        (a, b) =>
          heuristic(a, grid[endNode.row][endNode.col]) -
          heuristic(b, grid[endNode.row][endNode.col])
      );
      const current = openSet.shift()!;

      if (current.row === endNode.row && current.col === endNode.col) {
        return reconstructPath(current, grid);
      }

      closedSet.add(getNodeKey(current));

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;
        if (!openSet.includes(neighbor)) {
          neighbor.parent = getNodeKey(current);
          openSet.push(neighbor);
          await visualizeNode(neighbor.row, neighbor.col, "visited");
        }
      }
    }

    return null;
  };

  // Bidirectional Search algorithm
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
    let meetingPoint: Node | null = null;

    while (forwardQueue.length > 0 && backwardQueue.length > 0) {
      if (isPaused) {
        await new Promise<void>((resolve) => {
          const checkPause = () => {
            if (!isPaused) resolve();
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
      }

      // Forward step
      const currentForward = forwardQueue.shift()!;
      if (
        currentForward.row === endNode.row &&
        currentForward.col === endNode.col
      ) {
        return reconstructPath(currentForward, grid);
      }

      const neighborsForward = getNeighbors(currentForward, grid);
      for (const neighbor of neighborsForward) {
        const neighborKey = getNodeKey(neighbor);
        if (!forwardVisited.has(neighborKey)) {
          forwardVisited.add(neighborKey);
          neighbor.parent = getNodeKey(currentForward);
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
      if (
        currentBackward.row === startNode.row &&
        currentBackward.col === startNode.col
      ) {
        return reconstructPath(currentBackward, grid);
      }

      const neighborsBackward = getNeighbors(currentBackward, grid);
      for (const neighbor of neighborsBackward) {
        const neighborKey = getNodeKey(neighbor);
        if (!backwardVisited.has(neighborKey)) {
          backwardVisited.add(neighborKey);
          neighbor.parent = getNodeKey(currentBackward);
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
      return reconstructBidirectionalPath(meetingPoint, grid);
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
                  onValueChange={(
                    value:
                      | "astar"
                      | "dijkstra"
                      | "bfs"
                      | "dfs"
                      | "greedy"
                      | "bidirectional"
                  ) => setAlgorithm(value)}
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
                  onClick={() => setIsPaused(!isPaused)}
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
