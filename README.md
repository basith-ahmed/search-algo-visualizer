> [!NOTE]  
> Under Development 

# Pathfinding Visualizer
As the name suggests, this is a visualization webpage for a selected few pathfinding algorithms. Feel free to contribute if you find any bugs or want to add a new feature. You might also add your favorite algorithm if it's not already included :)

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Algorithms](#algorithms)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Interactive Grid:** Click and drag to set start/end points, walls, and weighted nodes.
- **Multiple Algorithms:** Visualize A*, Dijkstra's, BFS, DFS, Greedy Best-First Search, and Bidirectional Search.
- **Customization:**
  - **Obstacle Density:** Adjust the percentage of obstacles in the grid.
  - **Visualization Speed:** Control the speed of the algorithm's visualization.
  - **Weighted Nodes:** Assign different weights to nodes to influence path cost.
- **Grid Manipulation:**
  - **Random Obstacles:** Generate a random distribution of walls.
  - **Maze Generation:** Create mazes using Recursive Backtracking.
  - **Import/Export:** Save and load grid configurations.
<!-- - **Real-time Statistics:** Monitor visited nodes, path length, total path cost, and execution time. -->
<!-- - **Responsive Design:** Optimized for various screen sizes. -->
<!-- - **Heatmap Mode:** Toggle to view a heatmap of node visits. -->

## Demo

Check out the live demo [here](https://path-finding-algo-visualizer.vercel.app/).

## Algorithms

### 1. A* Algorithm
A popular pathfinding and graph traversal algorithm known for its performance and accuracy. It uses heuristics to efficiently navigate through the grid.

### 2. Dijkstra's Algorithm
Finds the shortest path between nodes in a graph, which may represent, for example, road networks. It explores all possible paths to determine the shortest one.

### 3. Breadth-First Search (BFS)
Explores the neighbor nodes first before moving to the next level neighbors. Ideal for finding the shortest path in unweighted graphs.

### 4. Depth-First Search (DFS)
Explores as far as possible along each branch before backtracking. Useful for scenarios where all possible paths need to be explored.

### 5. Greedy Best-First Search
Selects the path that appears to lead most directly to the goal, using a heuristic to prioritize nodes.

### 6. Bidirectional Search
Simultaneously searches forward from the start node and backward from the end node, meeting in the middle to find the shortest path.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v14 or later)
- [npm](https://www.npmjs.com/get-npm) or [Yarn](https://yarnpkg.com/getting-started/install)

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/basith-ahmed/search-algo-visualizer.git
   cd search-algo-visualizer
   ```

2. **Install Dependencies**

   Using npm:

   ```bash
   npm install
   ```

3. **Run the Development Server**

   Using npm:

   ```bash
   npm run dev
   ```
<!-- 
4. **Open in Browser**

   Navigate to `http://localhost:3000` in your web browser to view the application. -->

## Usage

### Setting Up the Grid

1. **Select Draw Mode:**
   - **Start Node:** Click the flag icon to set the starting point.
   - **End Node:** Click the target icon to set the endpoint.
   - **Walls:** Click the pencil icon to draw walls on the grid.
   - **Weights:** Click the info icon to assign weights to nodes.
   - **Erase:** Click the eraser icon to remove elements from the grid.

2. **Interact with the Grid:**
   - **Click and Drag:** Click on a node and drag to continuously add/remove elements based on the selected draw mode.
   
3. **Control Panel:**
   - **Algorithm Selection:** Choose the desired algorithm from the dropdown menu.
   - **Run/Pause:** Start or pause the visualization.
   - **Reset Grid:** Clear the grid and reset all settings.
   - **Random Obstacles:** Generate random walls based on the obstacle density slider.
   - **Generate Maze:** Create a maze using Recursive Backtracking.
   - **Sliders:**
     - **Obstacle Density:** Adjust the percentage of walls in the grid.
     - **Visualization Speed:** Control how fast the algorithm visualizes.
     - **Weight Value:** Set the weight for weighted nodes.

4. **Import/Export:**
   - **Export:** Save the current grid configuration as a JSON file.
   - **Import:** Load a previously saved grid configuration.
<!-- 
5. **Statistics:**
   - View real-time statistics including visited nodes, path length, total path cost, and execution time.

6. **Heatmap Mode:**
   - Toggle the heatmap to visualize the frequency of node visits. -->

## Contributing

Contributions are welcome! Whether it's reporting bugs, suggesting features, or submitting pull requests, your input is appreciated.

## License

This project is licensed under the [MIT License](./LICENSE).


---

Feel free to reach out or open an issue if you have any questions or suggestions!

**Happy Pathfinding! 🚀**