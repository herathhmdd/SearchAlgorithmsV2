/**
 * Search Algorithms Visualization for Sri Lankan Cities
 * A comprehensive demo application for university education
 * 
 * This application implements various search algorithms and visualizes
 * their execution on a graph of Sri Lankan cities.
 */

// Global variables
let graphData = null;
let svg = null;
let simulation = null;
let isSearchRunning = false;
let isPaused = false;
let currentAnimation = null;

// Graph dimensions and scales
const margin = { top: 20, right: 20, bottom: 20, left: 20 };
let width, height;
let xScale, yScale;

// Animation settings
const ANIMATION_DELAY = 500; // 500ms delay between steps
const NODE_RADIUS = 8;

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
    setupEventListeners();
});

/**
 * Initialize the application by loading data and setting up the visualization
 */
async function initializeApp() {
    try {
        // Load city data
        const response = await fetch('data/cities.json');
        graphData = await response.json();
        
        // Setup graph visualization
        setupGraph();
        
        // Populate city dropdowns
        populateCityDropdowns();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showError('Failed to load city data. Please check if data/cities.json exists.');
    }
}

/**
 * Setup event listeners for user interactions
 */
function setupEventListeners() {
    // Algorithm change handler
    document.getElementById('algorithm').addEventListener('change', function() {
        const algorithm = this.value;
        const depthLimitContainer = document.getElementById('depthLimitContainer');
        
        // Show depth limit input for DLS
        if (algorithm === 'dls') {
            depthLimitContainer.classList.remove('hidden');
        } else {
            depthLimitContainer.classList.add('hidden');
        }
    });

    // Search button
    document.getElementById('startSearch').addEventListener('click', startSearch);
    
    // Control buttons
    document.getElementById('pauseBtn').addEventListener('click', pauseSearch);
    document.getElementById('resumeBtn').addEventListener('click', resumeSearch);
    document.getElementById('resetBtn').addEventListener('click', resetVisualization);
}

/**
 * Setup the D3.js graph visualization
 */
function setupGraph() {
    const container = document.getElementById('graphContainer');
    const containerRect = container.getBoundingClientRect();
    
    width = containerRect.width - margin.left - margin.right;
    height = containerRect.height - margin.top - margin.bottom;
    
    // Create SVG
    svg = d3.select('#graphContainer')
        .append('svg')
        .attr('class', 'graph-svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Setup scales based on Sri Lanka's geographical bounds
    const latExtent = d3.extent(graphData.nodes, d => d.lat);
    const lonExtent = d3.extent(graphData.nodes, d => d.lon);
    
    // Add padding to the extents
    const latPadding = (latExtent[1] - latExtent[0]) * 0.1;
    const lonPadding = (lonExtent[1] - lonExtent[0]) * 0.1;
    
    xScale = d3.scaleLinear()
        .domain([lonExtent[0] - lonPadding, lonExtent[1] + lonPadding])
        .range([0, width]);
    
    yScale = d3.scaleLinear()
        .domain([latExtent[1] + latPadding, latExtent[0] - latPadding]) // Inverted for map orientation
        .range([0, height]);
    
    // Process links for D3.js force simulation
    const processedLinks = graphData.links.map(d => ({
        source: d.source,
        target: d.target,
        distance: d.distance
    }));
    
    // Create links
    const links = g.selectAll('.link')
        .data(processedLinks)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('x1', d => xScale(getNodeById(d.source).lon))
        .attr('y1', d => yScale(getNodeById(d.source).lat))
        .attr('x2', d => xScale(getNodeById(d.target).lon))
        .attr('y2', d => yScale(getNodeById(d.target).lat));
    
    // Create link labels (distances)
    const linkLabels = g.selectAll('.edge-label')
        .data(processedLinks)
        .enter()
        .append('text')
        .attr('class', 'edge-label')
        .attr('x', d => (xScale(getNodeById(d.source).lon) + xScale(getNodeById(d.target).lon)) / 2)
        .attr('y', d => (yScale(getNodeById(d.source).lat) + yScale(getNodeById(d.target).lat)) / 2)
        .text(d => d.distance + 'km');
    
    // Create nodes
    const nodes = g.selectAll('.node')
        .data(graphData.nodes)
        .enter()
        .append('circle')
        .attr('class', d => `node ${d.type}`)
        .attr('r', NODE_RADIUS)
        .attr('cx', d => xScale(d.lon))
        .attr('cy', d => yScale(d.lat))
        .attr('id', d => `node-${d.id}`);
    
    // Create node labels
    const nodeLabels = g.selectAll('.node-label')
        .data(graphData.nodes)
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('x', d => xScale(d.lon))
        .attr('y', d => yScale(d.lat) - NODE_RADIUS - 3)
        .text(d => d.id);
    
    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', function(event) {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
}

/**
 * Get node object by ID
 */
function getNodeById(id) {
    return graphData.nodes.find(node => node.id === id);
}

/**
 * Get link object by source and target IDs
 */
function getLinkByNodes(sourceId, targetId) {
    return graphData.links.find(link => 
        (link.source === sourceId && link.target === targetId) ||
        (link.source === targetId && link.target === sourceId)
    );
}

/**
 * Populate city dropdown menus
 */
function populateCityDropdowns() {
    const startCitySelect = document.getElementById('startCity');
    const destCitySelect = document.getElementById('destCity');
    
    // Sort cities alphabetically
    const sortedCities = [...graphData.nodes].sort((a, b) => a.id.localeCompare(b.id));
    
    // Clear existing options
    startCitySelect.innerHTML = '<option value="">Select start city</option>';
    destCitySelect.innerHTML = '<option value="">Select destination city</option>';
    
    // Add city options
    sortedCities.forEach(city => {
        const startOption = document.createElement('option');
        startOption.value = city.id;
        startOption.textContent = `${city.id} (${city.type === 'capitol' ? 'Capital' : 'DEC'})`;
        startCitySelect.appendChild(startOption);
        
        const destOption = document.createElement('option');
        destOption.value = city.id;
        destOption.textContent = `${city.id} (${city.type === 'capitol' ? 'Capital' : 'DEC'})`;
        destCitySelect.appendChild(destOption);
    });
    
    // Set default values for demonstration
    startCitySelect.value = 'Colombo';
    destCitySelect.value = 'Jaffna';
}

/**
 * Start the search algorithm visualization
 */
async function startSearch() {
    if (isSearchRunning) return;
    
    const algorithm = document.getElementById('algorithm').value;
    const startCity = document.getElementById('startCity').value;
    const destCity = document.getElementById('destCity').value;
    
    // Validation
    if (!startCity || !destCity) {
        showError('Please select both start and destination cities.');
        return;
    }
    
    if (startCity === destCity) {
        showError('Start and destination cities must be different.');
        return;
    }
    
    // Reset visualization
    resetVisualization();
    
    // Set search state
    isSearchRunning = true;
    isPaused = false;
    
    // Update UI
    document.getElementById('startSearch').disabled = true;
    document.getElementById('pauseBtn').classList.remove('hidden');
    document.getElementById('resetBtn').textContent = 'Stop';
    
    // Show loading
    showLoading('Initializing search...');
    
    try {
        // Execute the selected algorithm
        let result;
        const depthLimit = parseInt(document.getElementById('depthLimit').value) || 5;
        
        switch (algorithm) {
            case 'bfs':
                result = await breadthFirstSearch(startCity, destCity);
                break;
            case 'dfs':
                result = await depthFirstSearch(startCity, destCity);
                break;
            case 'ucs':
                result = await uniformCostSearch(startCity, destCity);
                break;
            case 'dls':
                result = await depthLimitedSearch(startCity, destCity, depthLimit);
                break;
            case 'iddfs':
                result = await iterativeDeepeningSearch(startCity, destCity);
                break;
            case 'bidirectional':
                result = await bidirectionalSearch(startCity, destCity);
                break;
            case 'greedy':
                result = await greedyBestFirstSearch(startCity, destCity);
                break;
            case 'astar':
                result = await aStarSearch(startCity, destCity);
                break;
            default:
                throw new Error('Unknown algorithm selected');
        }
        
        // Display results
        displaySearchResults(result, algorithm);
        
    } catch (error) {
        console.error('Search error:', error);
        showError(`Search failed: ${error.message}`);
    } finally {
        // Reset search state
        isSearchRunning = false;
        document.getElementById('startSearch').disabled = false;
        document.getElementById('pauseBtn').classList.add('hidden');
        document.getElementById('resumeBtn').classList.add('hidden');
        document.getElementById('resetBtn').textContent = 'Reset';
    }
}

/**
 * Calculate straight-line distance between two cities (heuristic for informed search)
 */
function calculateStraightLineDistance(city1Id, city2Id) {
    const city1 = getNodeById(city1Id);
    const city2 = getNodeById(city2Id);
    
    if (!city1 || !city2) return Infinity;
    
    // Convert to radians
    const lat1Rad = city1.lat * Math.PI / 180;
    const lon1Rad = city1.lon * Math.PI / 180;
    const lat2Rad = city2.lat * Math.PI / 180;
    const lon2Rad = city2.lon * Math.PI / 180;
    
    // Haversine formula
    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const earthRadius = 6371; // Earth's radius in kilometers
    
    return earthRadius * c;
}

/**
 * Get neighbors of a given city
 */
function getNeighbors(cityId) {
    const neighbors = [];
    
    graphData.links.forEach(link => {
        if (link.source === cityId) {
            neighbors.push({
                id: link.target,
                distance: link.distance
            });
        } else if (link.target === cityId) {
            neighbors.push({
                id: link.source,
                distance: link.distance
            });
        }
    });
    
    return neighbors;
}

/**
 * Animate node exploration
 */
async function animateNodeExploration(nodeId, isExploring = true) {
    if (isPaused) {
        await waitForResume();
    }
    
    const node = d3.select(`#node-${nodeId}`);
    
    if (isExploring) {
        node.classed('exploring', true);
        updateStatus(`Exploring: ${nodeId}`);
    } else {
        node.classed('exploring', false);
    }
    
    // Wait for animation delay
    await sleep(ANIMATION_DELAY);
}

/**
 * Animate path highlighting
 */
async function animatePath(path) {
    updateStatus('Highlighting final path...');
    
    // Highlight path nodes
    for (let i = 0; i < path.length; i++) {
        const nodeId = path[i];
        const node = d3.select(`#node-${nodeId}`);
        
        // Remove exploring class and add path class
        node.classed('exploring', false).classed('path', true);
        
        // Highlight path edges
        if (i > 0) {
            const prevNodeId = path[i - 1];
            highlightPathEdge(prevNodeId, nodeId);
        }
        
        await sleep(ANIMATION_DELAY / 2);
    }
    
    // Mark start and goal nodes specially
    if (path.length > 0) {
        d3.select(`#node-${path[0]}`).classed('start', true);
        d3.select(`#node-${path[path.length - 1]}`).classed('goal', true);
    }
}

/**
 * Highlight an edge in the path
 */
function highlightPathEdge(sourceId, targetId) {
    const links = d3.selectAll('.link');
    
    links.each(function(d) {
        if ((d.source === sourceId && d.target === targetId) ||
            (d.source === targetId && d.target === sourceId)) {
            d3.select(this).classed('path', true);
        }
    });
}

/**
 * Sleep function for animation delays
 */
function sleep(ms) {
    return new Promise(resolve => {
        currentAnimation = setTimeout(resolve, ms);
    });
}

/**
 * Wait for resume when paused
 */
function waitForResume() {
    return new Promise(resolve => {
        const checkResume = () => {
            if (!isPaused) {
                resolve();
            } else {
                setTimeout(checkResume, 100);
            }
        };
        checkResume();
    });
}

/**
 * Pause the search animation
 */
function pauseSearch() {
    isPaused = true;
    document.getElementById('pauseBtn').classList.add('hidden');
    document.getElementById('resumeBtn').classList.remove('hidden');
    updateStatus('Search paused');
}

/**
 * Resume the search animation
 */
function resumeSearch() {
    isPaused = false;
    document.getElementById('pauseBtn').classList.remove('hidden');
    document.getElementById('resumeBtn').classList.add('hidden');
    updateStatus('Search resumed');
}

/**
 * Reset the visualization
 */
function resetVisualization() {
    // Stop any running animations
    if (currentAnimation) {
        clearTimeout(currentAnimation);
        currentAnimation = null;
    }
    
    // Reset search state
    isSearchRunning = false;
    isPaused = false;
    
    // Reset all nodes and links
    d3.selectAll('.node')
        .classed('exploring path start goal', false);
    
    d3.selectAll('.link')
        .classed('exploring path', false);
    
    // Clear results
    document.getElementById('searchResults').innerHTML = 
        '<p class="text-gray-600">Select cities and click "Start Search" to begin.</p>';
    
    // Hide complexity info
    document.getElementById('complexityInfo').classList.add('hidden');
    
    // Reset UI buttons
    document.getElementById('startSearch').disabled = false;
    document.getElementById('pauseBtn').classList.add('hidden');
    document.getElementById('resumeBtn').classList.add('hidden');
    document.getElementById('resetBtn').textContent = 'Reset';
}

/**
 * Display search results
 */
function displaySearchResults(result, algorithm) {
    const resultsContainer = document.getElementById('searchResults');
    
    let html = `<div class="result-item ${result.success ? 'success' : 'error'}">`;
    html += `<h3 class="font-semibold mb-2">${getAlgorithmName(algorithm)} Results</h3>`;
    
    if (result.success) {
        html += `<p><strong>Path Found:</strong> ${result.path.join(' → ')}</p>`;
        html += `<p><strong>Total Distance:</strong> ${result.cost} km</p>`;
        html += `<p><strong>Nodes Explored:</strong> ${result.nodesExplored}</p>`;
        html += `<p><strong>Path Length:</strong> ${result.path.length} cities</p>`;
        
        if (result.executionTime) {
            html += `<p><strong>Execution Time:</strong> ${result.executionTime}ms</p>`;
        }
    } else {
        html += `<p><strong>No path found</strong></p>`;
        html += `<p><strong>Nodes Explored:</strong> ${result.nodesExplored}</p>`;
        
        if (result.reason) {
            html += `<p><strong>Reason:</strong> ${result.reason}</p>`;
        }
    }
    
    html += '</div>';
    
    // Add algorithm complexity information
    html += getComplexityInfo(algorithm);
    
    resultsContainer.innerHTML = html;
    
    // Show complexity info panel
    document.getElementById('complexityInfo').classList.remove('hidden');
    document.getElementById('complexityDetails').innerHTML = getComplexityDetails(algorithm);
}

/**
 * Get human-readable algorithm name
 */
function getAlgorithmName(algorithm) {
    const names = {
        'bfs': 'Breadth-First Search',
        'dfs': 'Depth-First Search',
        'ucs': 'Uniform-Cost Search',
        'dls': 'Depth-Limited Search',
        'iddfs': 'Iterative Deepening DFS',
        'bidirectional': 'Bidirectional Search',
        'greedy': 'Greedy Best-First Search',
        'astar': 'A* Search'
    };
    return names[algorithm] || algorithm;
}

/**
 * Get complexity information for display
 */
function getComplexityInfo(algorithm) {
    const complexities = {
        'bfs': { time: 'O(V + E)', space: 'O(V)', optimal: 'Yes (unweighted)', complete: 'Yes' },
        'dfs': { time: 'O(V + E)', space: 'O(V)', optimal: 'No', complete: 'No (infinite spaces)' },
        'ucs': { time: 'O(b^⌈C*/ε⌉)', space: 'O(b^⌈C*/ε⌉)', optimal: 'Yes', complete: 'Yes' },
        'dls': { time: 'O(b^l)', space: 'O(bl)', optimal: 'No', complete: 'No' },
        'iddfs': { time: 'O(b^d)', space: 'O(bd)', optimal: 'Yes (unweighted)', complete: 'Yes' },
        'bidirectional': { time: 'O(b^(d/2))', space: 'O(b^(d/2))', optimal: 'Yes (unweighted)', complete: 'Yes' },
        'greedy': { time: 'O(b^m)', space: 'O(b^m)', optimal: 'No', complete: 'No' },
        'astar': { time: 'O(b^d)', space: 'O(b^d)', optimal: 'Yes (admissible heuristic)', complete: 'Yes' }
    };
    
    const complexity = complexities[algorithm];
    if (!complexity) return '';
    
    return `
        <div class="result-item mt-4">
            <h4 class="font-semibold mb-2">Algorithm Properties</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Time Complexity:</strong> ${complexity.time}</div>
                <div><strong>Space Complexity:</strong> ${complexity.space}</div>
                <div><strong>Optimal:</strong> ${complexity.optimal}</div>
                <div><strong>Complete:</strong> ${complexity.complete}</div>
            </div>
        </div>
    `;
}

/**
 * Get detailed complexity information
 */
function getComplexityDetails(algorithm) {
    const details = {
        'bfs': 'BFS explores nodes level by level, guaranteeing the shortest path in unweighted graphs.',
        'dfs': 'DFS explores as far as possible along each branch before backtracking.',
        'ucs': 'UCS expands the lowest-cost node first, guaranteeing optimal solution.',
        'dls': 'DLS is DFS with a depth limit to avoid infinite paths.',
        'iddfs': 'IDDFS combines benefits of DFS and BFS by gradually increasing depth limit.',
        'bidirectional': 'Bidirectional search runs two searches simultaneously from start and goal.',
        'greedy': 'Greedy search uses heuristic to guide search toward the goal.',
        'astar': 'A* combines actual cost and heuristic for optimal pathfinding.'
    };
    
    return details[algorithm] || '';
}

/**
 * Update status message
 */
function updateStatus(message) {
    console.log(`Status: ${message}`);
}

/**
 * Show loading message
 */
function showLoading(message) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = `
        <div class="flex items-center">
            <div class="loading mr-3"></div>
            <span>${message}</span>
        </div>
    `;
}

/**
 * Show error message
 */
function showError(message) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = `
        <div class="result-item error">
            <p><strong>Error:</strong> ${message}</p>
        </div>
    `;
}

// ============================================================================
// SEARCH ALGORITHMS IMPLEMENTATION
// ============================================================================

/**
 * Breadth-First Search (BFS)
 * Explores all neighbors at the current depth before moving to next depth level
 */
async function breadthFirstSearch(start, goal) {
    const startTime = Date.now();
    const queue = [{ node: start, path: [start] }];
    const visited = new Set([start]);
    let nodesExplored = 0;
    
    updateStatus(`Starting BFS from ${start} to ${goal}`);
    
    while (queue.length > 0) {
        if (!isSearchRunning) break;
        
        const { node: currentNode, path } = queue.shift();
        nodesExplored++;
        
        await animateNodeExploration(currentNode);
        
        if (currentNode === goal) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                queue.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id]
                });
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        executionTime: Date.now() - startTime,
        reason: 'No path exists between the cities'
    };
}

/**
 * Depth-First Search (DFS)
 * Explores as far as possible along each branch before backtracking
 */
async function depthFirstSearch(start, goal) {
    const startTime = Date.now();
    const stack = [{ node: start, path: [start] }];
    const visited = new Set([start]);
    let nodesExplored = 0;
    
    updateStatus(`Starting DFS from ${start} to ${goal}`);
    
    while (stack.length > 0) {
        if (!isSearchRunning) break;
        
        const { node: currentNode, path } = stack.pop();
        nodesExplored++;
        
        await animateNodeExploration(currentNode);
        
        if (currentNode === goal) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        // Reverse order for DFS to maintain consistent exploration
        for (let i = neighbors.length - 1; i >= 0; i--) {
            const neighbor = neighbors[i];
            if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                stack.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id]
                });
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        executionTime: Date.now() - startTime,
        reason: 'No path exists between the cities'
    };
}

/**
 * Uniform-Cost Search (UCS)
 * Expands the node with the lowest path cost first
 */
async function uniformCostSearch(start, goal) {
    const startTime = Date.now();
    
    // Priority queue implemented as array (will sort by cost)
    const frontier = [{ node: start, path: [start], cost: 0 }];
    const visited = new Set();
    let nodesExplored = 0;
    
    updateStatus(`Starting UCS from ${start} to ${goal}`);
    
    while (frontier.length > 0) {
        if (!isSearchRunning) break;
        
        // Sort frontier by cost (lowest first)
        frontier.sort((a, b) => a.cost - b.cost);
        
        const { node: currentNode, path, cost } = frontier.shift();
        
        if (visited.has(currentNode)) continue;
        
        visited.add(currentNode);
        nodesExplored++;
        
        await animateNodeExploration(currentNode);
        
        if (currentNode === goal) {
            await animatePath(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.id)) {
                frontier.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id],
                    cost: cost + neighbor.distance
                });
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        executionTime: Date.now() - startTime,
        reason: 'No path exists between the cities'
    };
}

/**
 * Depth-Limited Search (DLS)
 * DFS with a depth limit to prevent infinite loops
 */
async function depthLimitedSearch(start, goal, depthLimit) {
    const startTime = Date.now();
    let nodesExplored = 0;
    
    updateStatus(`Starting DLS from ${start} to ${goal} with depth limit ${depthLimit}`);
    
    async function dls(currentNode, path, depth) {
        if (!isSearchRunning) return { success: false, reason: 'Search stopped' };
        
        nodesExplored++;
        await animateNodeExploration(currentNode);
        
        if (currentNode === goal) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                executionTime: Date.now() - startTime
            };
        }
        
        if (depth >= depthLimit) {
            await animateNodeExploration(currentNode, false);
            return { success: false, reason: 'Depth limit reached' };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            // Avoid cycles by checking if neighbor is already in path
            if (!path.includes(neighbor.id)) {
                const result = await dls(neighbor.id, [...path, neighbor.id], depth + 1);
                if (result.success) return result;
            }
        }
        
        await animateNodeExploration(currentNode, false);
        return { success: false, reason: 'No path found within depth limit' };
    }
    
    const result = await dls(start, [start], 0);
    if (!result.nodesExplored) {
        result.nodesExplored = nodesExplored;
        result.executionTime = Date.now() - startTime;
    }
    
    return result;
}

/**
 * Iterative Deepening Depth-First Search (IDDFS)
 * Performs DLS with gradually increasing depth limits
 */
async function iterativeDeepeningSearch(start, goal) {
    const startTime = Date.now();
    let totalNodesExplored = 0;
    const maxDepth = 20; // Reasonable maximum depth for Sri Lankan cities
    
    updateStatus(`Starting IDDFS from ${start} to ${goal}`);
    
    for (let depth = 0; depth <= maxDepth; depth++) {
        if (!isSearchRunning) break;
        
        updateStatus(`IDDFS: Trying depth limit ${depth}`);
        
        // Reset visualization for new depth iteration
        d3.selectAll('.node').classed('exploring', false);
        
        const result = await depthLimitedSearch(start, goal, depth);
        totalNodesExplored += result.nodesExplored;
        
        if (result.success) {
            return {
                ...result,
                nodesExplored: totalNodesExplored,
                executionTime: Date.now() - startTime
            };
        }
        
        // Brief pause between depth iterations
        await sleep(ANIMATION_DELAY);
    }
    
    return {
        success: false,
        nodesExplored: totalNodesExplored,
        executionTime: Date.now() - startTime,
        reason: `No path found within maximum depth of ${maxDepth}`
    };
}

/**
 * Bidirectional Search
 * Runs two searches simultaneously from start and goal
 */
async function bidirectionalSearch(start, goal) {
    const startTime = Date.now();
    
    const frontQueue = [{ node: start, path: [start] }];
    const backQueue = [{ node: goal, path: [goal] }];
    
    const frontVisited = new Map([[start, [start]]]);
    const backVisited = new Map([[goal, [goal]]]);
    
    let nodesExplored = 0;
    
    updateStatus(`Starting Bidirectional Search from ${start} to ${goal}`);
    
    while (frontQueue.length > 0 && backQueue.length > 0) {
        if (!isSearchRunning) break;
        
        // Expand from front
        if (frontQueue.length > 0) {
            const { node: currentNode, path } = frontQueue.shift();
            nodesExplored++;
            
            await animateNodeExploration(currentNode);
            
            // Check if this node was reached from the back search
            if (backVisited.has(currentNode)) {
                const backPath = backVisited.get(currentNode);
                const fullPath = [...path, ...backPath.slice(0, -1).reverse()];
                
                await animatePath(fullPath);
                const cost = calculatePathCost(fullPath);
                
                return {
                    success: true,
                    path: fullPath,
                    cost,
                    nodesExplored,
                    executionTime: Date.now() - startTime
                };
            }
            
            const neighbors = getNeighbors(currentNode);
            for (const neighbor of neighbors) {
                if (!frontVisited.has(neighbor.id)) {
                    const newPath = [...path, neighbor.id];
                    frontVisited.set(neighbor.id, newPath);
                    frontQueue.push({
                        node: neighbor.id,
                        path: newPath
                    });
                }
            }
            
            await animateNodeExploration(currentNode, false);
        }
        
        // Expand from back
        if (backQueue.length > 0) {
            const { node: currentNode, path } = backQueue.shift();
            nodesExplored++;
            
            await animateNodeExploration(currentNode);
            
            // Check if this node was reached from the front search
            if (frontVisited.has(currentNode)) {
                const frontPath = frontVisited.get(currentNode);
                const fullPath = [...frontPath, ...path.slice(0, -1).reverse()];
                
                await animatePath(fullPath);
                const cost = calculatePathCost(fullPath);
                
                return {
                    success: true,
                    path: fullPath,
                    cost,
                    nodesExplored,
                    executionTime: Date.now() - startTime
                };
            }
            
            const neighbors = getNeighbors(currentNode);
            for (const neighbor of neighbors) {
                if (!backVisited.has(neighbor.id)) {
                    const newPath = [...path, neighbor.id];
                    backVisited.set(neighbor.id, newPath);
                    backQueue.push({
                        node: neighbor.id,
                        path: newPath
                    });
                }
            }
            
            await animateNodeExploration(currentNode, false);
        }
    }
    
    return {
        success: false,
        nodesExplored,
        executionTime: Date.now() - startTime,
        reason: 'No path exists between the cities'
    };
}

/**
 * Greedy Best-First Search
 * Uses heuristic to guide search toward goal
 */
async function greedyBestFirstSearch(start, goal) {
    const startTime = Date.now();
    
    const frontier = [{ node: start, path: [start], heuristic: calculateStraightLineDistance(start, goal) }];
    const visited = new Set();
    let nodesExplored = 0;
    
    updateStatus(`Starting Greedy Best-First Search from ${start} to ${goal}`);
    
    while (frontier.length > 0) {
        if (!isSearchRunning) break;
        
        // Sort frontier by heuristic (lowest first)
        frontier.sort((a, b) => a.heuristic - b.heuristic);
        
        const { node: currentNode, path } = frontier.shift();
        
        if (visited.has(currentNode)) continue;
        
        visited.add(currentNode);
        nodesExplored++;
        
        await animateNodeExploration(currentNode);
        
        if (currentNode === goal) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.id)) {
                frontier.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id],
                    heuristic: calculateStraightLineDistance(neighbor.id, goal)
                });
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        executionTime: Date.now() - startTime,
        reason: 'No path exists between the cities'
    };
}

/**
 * A* Search
 * Combines actual cost and heuristic for optimal pathfinding
 */
async function aStarSearch(start, goal) {
    const startTime = Date.now();
    
    const frontier = [{ 
        node: start, 
        path: [start], 
        cost: 0,
        heuristic: calculateStraightLineDistance(start, goal),
        f: calculateStraightLineDistance(start, goal)
    }];
    
    const visited = new Set();
    let nodesExplored = 0;
    
    updateStatus(`Starting A* Search from ${start} to ${goal}`);
    
    while (frontier.length > 0) {
        if (!isSearchRunning) break;
        
        // Sort frontier by f-score (cost + heuristic)
        frontier.sort((a, b) => a.f - b.f);
        
        const { node: currentNode, path, cost } = frontier.shift();
        
        if (visited.has(currentNode)) continue;
        
        visited.add(currentNode);
        nodesExplored++;
        
        await animateNodeExploration(currentNode);
        
        if (currentNode === goal) {
            await animatePath(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.id)) {
                const newCost = cost + neighbor.distance;
                const heuristic = calculateStraightLineDistance(neighbor.id, goal);
                const f = newCost + heuristic;
                
                frontier.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id],
                    cost: newCost,
                    heuristic,
                    f
                });
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        executionTime: Date.now() - startTime,
        reason: 'No path exists between the cities'
    };
}

/**
 * Calculate the total cost (distance) of a path
 */
function calculatePathCost(path) {
    let totalCost = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
        const link = getLinkByNodes(path[i], path[i + 1]);
        if (link) {
            totalCost += link.distance;
        }
    }
    
    return totalCost;
}

// Handle window resize for responsive visualization
window.addEventListener('resize', function() {
    if (svg) {
        const container = document.getElementById('graphContainer');
        const containerRect = container.getBoundingClientRect();
        
        width = containerRect.width - margin.left - margin.right;
        height = containerRect.height - margin.top - margin.bottom;
        
        svg.attr('width', width + margin.left + margin.right)
           .attr('height', height + margin.top + margin.bottom);
        
        // Update scales
        const latExtent = d3.extent(graphData.nodes, d => d.lat);
        const lonExtent = d3.extent(graphData.nodes, d => d.lon);
        
        const latPadding = (latExtent[1] - latExtent[0]) * 0.1;
        const lonPadding = (lonExtent[1] - lonExtent[0]) * 0.1;
        
        xScale.range([0, width]);
        yScale.range([0, height]);
        
        // Update node and link positions
        d3.selectAll('.node')
            .attr('cx', d => xScale(d.lon))
            .attr('cy', d => yScale(d.lat));
        
        d3.selectAll('.node-label')
            .attr('x', d => xScale(d.lon))
            .attr('y', d => yScale(d.lat) - NODE_RADIUS - 3);
        
        d3.selectAll('.link')
            .attr('x1', d => xScale(getNodeById(d.source).lon))
            .attr('y1', d => yScale(getNodeById(d.source).lat))
            .attr('x2', d => xScale(getNodeById(d.target).lon))
            .attr('y2', d => yScale(getNodeById(d.target).lat));
        
        d3.selectAll('.edge-label')
            .attr('x', d => (xScale(getNodeById(d.source).lon) + xScale(getNodeById(d.target).lon)) / 2)
            .attr('y', d => (yScale(getNodeById(d.source).lat) + yScale(getNodeById(d.target).lat)) / 2);
    }
});