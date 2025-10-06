# Search Algorithms Visualization - Sri Lankan Cities

A comprehensive educational web application that demonstrates various uninformed and informed search algorithms through interactive visualization of Sri Lankan cities.

## 🎯 Overview

This project serves as a demonstrative tool for university professors and students to understand how different search algorithms explore a graph to find paths between cities. The application visualizes the search process with animations and provides detailed algorithm comparisons.

## 🚀 Features

### Search Algorithms Implemented

#### Uninformed Search Algorithms
- **Breadth-First Search (BFS)** - Explores all neighbors at current depth before moving deeper
- **Depth-First Search (DFS)** - Explores as far as possible along each branch before backtracking  
- **Uniform-Cost Search (UCS)** - Expands the node with lowest path cost first
- **Depth-Limited Search (DLS)** - DFS with configurable depth limit
- **Iterative Deepening DFS (IDDFS)** - Combines benefits of DFS and BFS
- **Bidirectional Search** - Searches simultaneously from start and goal

#### Informed Search Algorithms
- **Greedy Best-First Search** - Uses straight-line distance heuristic to guide search
- **A* Search** - Combines actual cost and heuristic for optimal pathfinding

### Visualization Features

- **Interactive Map**: Cities positioned according to actual geographical coordinates
- **Real-time Animation**: 500ms delays between steps for clear visualization
- **Color Coding**: 
  - Blue nodes: Capital cities
  - Green nodes: Dedicated Economic Centers (DEC)
  - Yellow nodes: Currently exploring
  - Red nodes: Final path
- **Distance Labels**: All road connections show distances in kilometers
- **Path Highlighting**: Final paths are highlighted with animated edges

### User Interface

- **Control Panel**: Algorithm selection, start/destination city dropdowns
- **Results Display**: Path found, total distance, nodes explored, execution time
- **Algorithm Complexity**: Time/space complexity and algorithm properties
- **Interactive Controls**: Pause/resume/reset functionality
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Project Structure

```
algorithms_demo/
├── index.html          # Main HTML structure
├── styles.css          # Custom CSS styles and animations  
├── scripts.js          # Core JavaScript with search algorithms
├── data/
│   └── cities.json     # Sri Lankan cities data with coordinates and connections
└── README.md           # This documentation
```

## 📊 Data Model

The application uses `data/cities.json` which contains:

- **36 Sri Lankan cities** with geographical coordinates (latitude/longitude)
- **City types**: "capitol" for provincial capitals, "dec" for Dedicated Economic Centers
- **Road connections** with actual distances in kilometers
- **Graph structure** suitable for pathfinding algorithms

## 🎮 How to Use

1. **Open the Application**: Open `index.html` in a modern web browser
2. **Select Algorithm**: Choose from the dropdown menu (BFS is selected by default)
3. **Choose Cities**: Select start and destination cities from the dropdowns
4. **Configure Options**: For DLS, set the depth limit if needed
5. **Start Search**: Click "Start Search" to begin visualization
6. **Control Playback**: Use Pause/Resume/Reset buttons as needed
7. **View Results**: Check the results panel for path details and algorithm metrics

## 🔧 Technical Requirements

- **Modern Web Browser** with ES6+ support
- **Internet Connection** for CDN resources (Tailwind CSS, D3.js)
- **Local Web Server** (recommended for file loading, though not strictly required)

## 🧮 Algorithm Complexity

| Algorithm | Time Complexity | Space Complexity | Optimal | Complete |
|-----------|-----------------|------------------|---------|----------|
| BFS | O(V + E) | O(V) | Yes (unweighted) | Yes |
| DFS | O(V + E) | O(V) | No | No (infinite spaces) |
| UCS | O(b^⌈C*/ε⌉) | O(b^⌈C*/ε⌉) | Yes | Yes |
| DLS | O(b^l) | O(bl) | No | No |
| IDDFS | O(b^d) | O(bd) | Yes (unweighted) | Yes |
| Bidirectional | O(b^(d/2)) | O(b^(d/2)) | Yes (unweighted) | Yes |
| Greedy | O(b^m) | O(b^m) | No | No |
| A* | O(b^d) | O(b^d) | Yes (admissible heuristic) | Yes |

Where:
- V = number of vertices (cities)
- E = number of edges (roads)  
- b = branching factor
- d = depth of optimal solution
- l = depth limit
- m = maximum depth
- C* = optimal solution cost
- ε = minimum edge cost

## 🎨 Customization

### Adding New Cities
Edit `data/cities.json` to add new cities with:
```json
{
  "id": "CityName",
  "type": "capitol" or "dec", 
  "lat": latitude,
  "lon": longitude
}
```

### Adding New Connections
Add road connections in the `links` array:
```json
{
  "source": "City1",
  "target": "City2", 
  "distance": distanceInKm
}
```

### Modifying Animation Speed
Change `ANIMATION_DELAY` constant in `scripts.js` (default: 500ms)

### Styling Changes
Modify `styles.css` for visual customizations:
- Node colors and sizes
- Animation effects
- UI layout and typography

## 🔬 Educational Use Cases

- **Algorithm Comparison**: Compare how different algorithms explore the same problem
- **Optimality Analysis**: Observe which algorithms find optimal vs suboptimal paths
- **Complexity Demonstration**: See time/space tradeoffs in action
- **Heuristic Effects**: Compare informed vs uninformed search performance
- **Graph Theory**: Understand graph traversal concepts visually

## 🐛 Troubleshooting

### Common Issues

1. **Cities not loading**: Ensure `data/cities.json` is accessible and properly formatted
2. **Visualization not appearing**: Check browser console for JavaScript errors
3. **Slow performance**: Reduce animation delay or use a faster computer
4. **Responsive issues**: Try refreshing the page or adjusting browser zoom

### Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+  
- Edge 88+

## 📝 License

This project is created for educational purposes. Feel free to use and modify for academic use.

## 🤝 Contributing

This is an educational demo project. Contributions for improvements are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📚 References

- Artificial Intelligence: A Modern Approach by Russell & Norvig
- Introduction to Algorithms by Cormen, Leiserson, Rivest & Stein
- Graph Theory and Applications by Gross & Yellen

---

**Created for IT5431 - Artificial Intelligence Course**  
*University Educational Demo - October 2025*