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
    // Initial heuristic labels render (in case A* is preselected)
    updateHeuristicLabelsForGraph();
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
        const secondaryGoalContainer = document.getElementById('secondaryGoalContainer');
        
        // Show depth limit input for DLS
        if (algorithm === 'dls') {
            depthLimitContainer.classList.remove('hidden');
        } else {
            depthLimitContainer.classList.add('hidden');
        }

        // Hide secondary goal for Bidirectional
        if (secondaryGoalContainer) {
            if (algorithm === 'bidirectional') {
                secondaryGoalContainer.classList.add('hidden');
            } else {
                secondaryGoalContainer.classList.remove('hidden');
            }
        }

        // Update heuristic labels when algorithm changes
        updateHeuristicLabelsForGraph();
    });

    // Search button
    document.getElementById('startSearch').addEventListener('click', startSearch);
    
    // Control buttons
    if (document.getElementById('pauseBtn')) {
        document.getElementById('pauseBtn').addEventListener('click', pauseSearch);
    }
    if (document.getElementById('resumeBtn')) {
        document.getElementById('resumeBtn').addEventListener('click', resumeSearch);
    }
    if (document.getElementById('resetBtn')) {
        document.getElementById('resetBtn').addEventListener('click', resetAll);
    }
    
    // Hide/Show Results Panel
    const toggleBtn = document.getElementById('toggleResultsPanel');
    const resultsPanel = document.getElementById('resultsPanel');
    const resultsContent = document.getElementById('resultsContent');
    let panelVisible = true;
    if (toggleBtn && resultsContent) {
        toggleBtn.addEventListener('click', function() {
            panelVisible = !panelVisible;
            if (panelVisible) {
                resultsContent.classList.remove('hidden');
            } else {
                resultsContent.classList.add('hidden');
            }
        });
    }

    // Update heuristic labels when goals change
    const destSel = document.getElementById('destCity');
    if (destSel) destSel.addEventListener('change', updateHeuristicLabelsForGraph);
    const dest2Sel = document.getElementById('secondaryDestCity');
    if (dest2Sel) dest2Sel.addEventListener('change', updateHeuristicLabelsForGraph);
}

/**
        if (document.getElementById('secondaryDestCity')) {
            document.getElementById('secondaryDestCity').addEventListener('change', renderTreeSearchGraph);
        }
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
            g.transition().duration(50).attr('transform', event.transform);
        });

    svg.call(zoom);
    // Enable smooth wheel zooming
    svg.on('wheel.zoom', null); // Remove default
    svg.node().addEventListener('wheel', function(e) {
        e.preventDefault();
        zoom.scaleBy(svg.transition().duration(100), e.deltaY > 0 ? 0.95 : 1.05);
    }, { passive: false });

    // Initial heuristic labels after graph setup
    updateHeuristicLabelsForGraph();
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
    const secondaryDestCitySelect = document.getElementById('secondaryDestCity');
    
    // Sort cities alphabetically
    const sortedCities = [...graphData.nodes].sort((a, b) => a.id.localeCompare(b.id));
    
    // Filter capital cities for start dropdown
    const capitalCities = sortedCities.filter(city => city.type === 'capitol');
    
    // Filter DEC cities for destination dropdown
    const decCities = sortedCities.filter(city => city.type === 'dec');
    
    // Clear existing options
    startCitySelect.innerHTML = '<option value="">Select start city (Capital only)</option>';
    destCitySelect.innerHTML = '<option value="">Select destination city (DEC only)</option>';
    if (secondaryDestCitySelect) {
        secondaryDestCitySelect.innerHTML = '<option value="">Optional: Secondary DEC</option>';
    }
    
    // Add capital cities only to start dropdown
    capitalCities.forEach(city => {
        const startOption = document.createElement('option');
        startOption.value = city.id;
        startOption.textContent = city.id; // Only show city name
        startCitySelect.appendChild(startOption);
    });
    
    // Add DEC cities only to destination dropdown
    decCities.forEach(city => {
        const destOption = document.createElement('option');
        destOption.value = city.id;
        destOption.textContent = `${city.id} (DEC)`;
        destCitySelect.appendChild(destOption);
    });
    // Populate secondary DEC dropdown (same options)
    if (secondaryDestCitySelect) {
        decCities.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city.id;
            opt.textContent = `${city.id} (DEC)`;
            secondaryDestCitySelect.appendChild(opt);
        });
    }
    
    // Secondary DEC dropdown populated above
    
    // Set default values for demonstration
    startCitySelect.value = 'Colombo';
    destCitySelect.value = 'Meegoda';
    if (secondaryDestCitySelect) secondaryDestCitySelect.value = '';
    
}

/**
 * Start the search algorithm visualization
 */
async function startSearch() {
    if (isSearchRunning) return;
    const algorithm = document.getElementById('algorithm').value;
    const startCity = document.getElementById('startCity').value;
    const destCity = document.getElementById('destCity').value;
    const secondaryDestCity = document.getElementById('secondaryDestCity')?.value || '';
    const goalsArray = [destCity, secondaryDestCity].filter(Boolean);
    
    // Validation
    if (!startCity) {
        showError('Please select a start city.');
        return;
    }
    if (algorithm === 'bidirectional') {
        if (!destCity) {
            showError('Please select a destination city.');
            return;
        }
        if (startCity === destCity) {
            showError('Start and destination cities must be different.');
            return;
        }
    } else {
        if (goalsArray.length === 0) {
            showError('Please select at least one destination city.');
            return;
        }
        const validGoals = goalsArray.filter(g => g !== startCity);
        if (validGoals.length === 0) {
            showError('At least one destination city must be different from the start city.');
            return;
        }
    }
    // Reset visualization
    resetVisualization();
    // Set search state
    isSearchRunning = true;
    isPaused = false;
    // Update UI
    if (document.getElementById('startSearch')) document.getElementById('startSearch').disabled = true;
    if (document.getElementById('pauseBtn')) document.getElementById('pauseBtn').classList.remove('hidden');
    if (document.getElementById('resetBtn')) document.getElementById('resetBtn').textContent = 'Stop';
    // Show loading
    showLoading('Initializing search...');
    try {
        const depthLimit = parseInt(document.getElementById('depthLimit').value) || 5;
    const result = await runAlgo(algorithm, startCity, destCity, depthLimit, secondaryDestCity);
        displaySearchResults(result, algorithm);
    } catch (error) {
        console.error('Search error:', error);
        showError(`Search failed: ${error.message}`);
    } finally {
        // Reset search state
        isSearchRunning = false;
        const startBtnEl = document.getElementById('startSearch');
        if (startBtnEl) startBtnEl.disabled = false;
        const pauseBtnEl = document.getElementById('pauseBtn');
        if (pauseBtnEl) pauseBtnEl.classList.add('hidden');
        const resumeBtnEl = document.getElementById('resumeBtn');
        if (resumeBtnEl) resumeBtnEl.classList.add('hidden');
        const resetBtnEl = document.getElementById('resetBtn');
        if (resetBtnEl) resetBtnEl.textContent = 'Reset';
    }
}

// Single-goal searches only; multi-goal logic removed
// For DLS, IDDFS, Greedy, A*, similar wrappers can be made (omitted for brevity, but can be added as needed)
// Helper to run the selected algorithm (single-goal)
async function runAlgo(algorithm, startCity, goal, depthLimit, secondaryGoal = '') {
    const goalsSet = new Set([goal, secondaryGoal].filter(Boolean));
    switch (algorithm) {
        case 'bfs': return await breadthFirstSearch(startCity, goalsSet.size ? goalsSet : goal);
        case 'dfs': return await depthFirstSearch(startCity, goalsSet.size ? goalsSet : goal);
        case 'ucs': return await uniformCostSearch(startCity, goalsSet.size ? goalsSet : goal);
        case 'dls': return await depthLimitedSearch(startCity, goalsSet.size ? goalsSet : goal, depthLimit);
        case 'iddfs': return await iterativeDeepeningSearch(startCity, goalsSet.size ? goalsSet : goal);
        case 'bidirectional': return await bidirectionalSearch(startCity, goal); // single-goal only
        case 'greedy': return await greedyBestFirstSearch(startCity, goalsSet.size ? goalsSet : goal);
        case 'astar': return await aStarSearch(startCity, goalsSet.size ? goalsSet : goal);
        default: throw new Error('Unknown algorithm selected');
    }
}
// Removed duplicate startSearch patch block

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

// --- Multi-goal helpers ---
function isGoalNode(nodeId, goalOrSet) {
    return goalOrSet instanceof Set ? goalOrSet.has(nodeId) : nodeId === goalOrSet;
}

function heuristicToGoalOrGoals(nodeId, goalOrSet) {
    if (goalOrSet instanceof Set) {
        if (goalOrSet.size === 0) return Infinity;
        let minH = Infinity;
        for (const g of goalOrSet) {
            const h = calculateStraightLineDistance(nodeId, g);
            if (h < minH) minH = h;
        }
        return minH;
    }
    return calculateStraightLineDistance(nodeId, goalOrSet);
}

function reachedGoalFromPath(path) {
    return Array.isArray(path) && path.length ? path[path.length - 1] : null;
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

    // Reset all nodes and links (only if graph exists)
    if (d3.selectAll('.node').size() > 0) {
        d3.selectAll('.node')
            .classed('exploring path start goal', false);
    }
    if (d3.selectAll('.link').size() > 0) {
        d3.selectAll('.link')
            .classed('exploring path', false);
    }

    // Remove heuristic labels on reset
    d3.select('#graphContainer').select('svg').select('g').selectAll('.h-label').remove();

    // Clear results
    if (document.getElementById('searchResults')) {
        document.getElementById('searchResults').innerHTML = 
            '<p class="text-gray-600">Select cities and click "Start Search" to begin.</p>';
    }

    // Hide complexity info
    if (document.getElementById('complexityInfo')) {
        document.getElementById('complexityInfo').classList.add('hidden');
    }

    // Reset UI buttons
    if (document.getElementById('startSearch')) {
        document.getElementById('startSearch').disabled = false;
    }
    if (document.getElementById('pauseBtn')) {
        document.getElementById('pauseBtn').classList.add('hidden');
    }
    if (document.getElementById('resumeBtn')) {
        document.getElementById('resumeBtn').classList.add('hidden');
    }
    if (document.getElementById('resetBtn')) {
        document.getElementById('resetBtn').textContent = 'Reset';
    }
}

/**
 * Render/update heuristic labels on the main graph for A* (h(n) to nearest goal)
 */
function updateHeuristicLabelsForGraph() {
    try {
        if (!graphData || !xScale || !yScale) return;
        const algorithm = document.getElementById('algorithm')?.value;
        const dest = document.getElementById('destCity')?.value || '';
        const dest2 = document.getElementById('secondaryDestCity')?.value || '';
        const goals = new Set([dest, dest2].filter(Boolean));
        const gEl = d3.select('#graphContainer').select('svg').select('g');
        if (gEl.empty()) return;
        // Only show for A* with at least one goal
        if (algorithm !== 'astar' || goals.size === 0) {
            gEl.selectAll('.h-label').remove();
            return;
        }
        // Data join for labels
        const labels = gEl.selectAll('.h-label').data(graphData.nodes, d => d.id);
        labels.enter()
            .append('text')
            .attr('class', 'h-label')
            .attr('x', d => xScale(d.lon))
            .attr('y', d => yScale(d.lat) + NODE_RADIUS + 12)
            .attr('text-anchor', 'middle')
            .attr('fill', '#6b7280')
            .style('font-size', '10px')
            .merge(labels)
            .text(d => {
                // h(n) = min_g distance(n,g)
                let h = Infinity;
                goals.forEach(g => {
                    const val = calculateStraightLineDistance(d.id, g);
                    if (val < h) h = val;
                });
                const hs = Number.isFinite(h) ? h.toFixed(1) : '∞';
                return `h=${hs}`;
            })
            .attr('x', d => xScale(d.lon))
            .attr('y', d => yScale(d.lat) + NODE_RADIUS + 12);
        labels.exit().remove();
    } catch (e) {
        console.warn('Heuristic labels update skipped:', e);
    }
}

/**
 * Reset function for dropdowns, highlights, and tree
 */
function resetAll() {
    // Reset dropdowns
    document.getElementById('startCity').selectedIndex = 0;
    document.getElementById('destCity').selectedIndex = 0;
    if (document.getElementById('secondaryDestCity')) {
        document.getElementById('secondaryDestCity').selectedIndex = 0;
    }
    // Reset third panel highlights (remove all highlights)
    d3.selectAll('#graphContainer .graph-svg circle').attr('stroke', null).attr('stroke-width', null);
    d3.selectAll('#graphContainer .graph-svg path').attr('stroke', null).attr('stroke-width', null);
    // Reset tree in fourth panel
    setupPreSearchGoalTree();
}

/**
 * Display search results
 */
function displaySearchResults(result, algorithm, asString) {
    const resultsContainer = document.getElementById('searchResults');
    
    let html = `<div class="result-item ${result.success ? 'success' : 'error'}">`;
    // Build header with optional reached-goal and multi-goal badge
    const primaryGoal = document.getElementById('destCity')?.value || '';
    const secondaryGoal = document.getElementById('secondaryDestCity')?.value || '';
    const isMultiGoal = algorithm !== 'bidirectional' && !!secondaryGoal;
    const reachedLabel = result.success && result.reachedGoal ? ` – Goal: ${result.reachedGoal}` : '';
    const badge = isMultiGoal
        ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700" title="Goals: ${primaryGoal}${secondaryGoal ? ', ' + secondaryGoal : ''}">Multi-goal</span>`
        : '';
    html += `<h3 class="font-semibold mb-2">${getAlgorithmName(algorithm)} Results${reachedLabel} ${badge}</h3>`;
    
    if (result.success) {
        html += `<p><strong>Path Found:</strong> ${result.path.join(' → ')}</p>`;
        if (result.reachedGoal) {
            html += `<p><strong>Reached Goal:</strong> ${result.reachedGoal}</p>`;
        }
        html += `<p><strong>Total Distance:</strong> ${result.cost} km</p>`;
        html += `<p><strong>Nodes Explored:</strong> ${result.nodesExplored}</p>`;
        if (typeof result.nodesDiscovered === 'number') {
            html += `<p><strong>Nodes Discovered:</strong> ${result.nodesDiscovered}</p>`;
        }
        if (typeof result.edgesProcessed === 'number') {
            html += `<p><strong>Edges Processed:</strong> ${result.edgesProcessed}</p>`;
        }
        html += `<p><strong>Path Length:</strong> ${result.path.length} cities</p>`;
        
        if (result.executionTime) {
            html += `<p><strong>Execution Time:</strong> ${result.executionTime}ms</p>`;
        }

        // Show heuristic values along the path for Greedy Best-First and A*
        if ((algorithm === 'greedy' || algorithm === 'astar') && Array.isArray(result.path) && result.path.length > 0) {
            const goalCity = result.reachedGoal || result.path[result.path.length - 1];
            if (goalCity) {
                const heuristics = result.path.map(city => {
                    const h = calculateStraightLineDistance(city, goalCity);
                    const hStr = Number.isFinite(h) ? h.toFixed(1) : '∞';
                    return `${city} (h=${hStr} km)`;
                }).join(' → ');
                html += `<p><strong>Heuristics (to goal):</strong> ${heuristics}</p>`;
            }
        }

        // For A*, also show a compact table of g(n), h(n), f(n) for the final path
        if (algorithm === 'astar' && Array.isArray(result.path) && result.path.length > 0) {
            const goalCity = result.reachedGoal || result.path[result.path.length - 1];
            if (goalCity) {
                let gSoFar = 0;
                const rows = result.path.map((city, idx) => {
                    const h = calculateStraightLineDistance(city, goalCity);
                    const f = gSoFar + h;
                    const row = {
                        city,
                        g: Number.isFinite(gSoFar) ? gSoFar : Infinity,
                        h: Number.isFinite(h) ? h : Infinity,
                        f: Number.isFinite(f) ? f : Infinity
                    };
                    // advance g to next node for next iteration
                    if (idx < result.path.length - 1) {
                        const link = getLinkByNodes(result.path[idx], result.path[idx + 1]);
                        if (link) gSoFar += link.distance;
                    }
                    return row;
                });
                const format = v => (Number.isFinite(v) ? v.toFixed(1) : '∞');
                const table = `
                    <div class="mt-2 overflow-auto">
                        <table class="min-w-full text-xs border border-gray-200 rounded">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-2 py-1 text-left">Node</th>
                                    <th class="px-2 py-1 text-right">g(n)</th>
                                    <th class="px-2 py-1 text-right">h(n)</th>
                                    <th class="px-2 py-1 text-right">f(n)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(r => `
                                    <tr class="odd:bg-white even:bg-gray-50">
                                        <td class="px-2 py-1">${r.city}</td>
                                        <td class="px-2 py-1 text-right">${format(r.g)}</td>
                                        <td class="px-2 py-1 text-right">${format(r.h)}</td>
                                        <td class="px-2 py-1 text-right">${format(r.f)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                html += `<div class="mt-2"><strong>A* Scores:</strong>${table}
                    <div class="mt-1 text-xs text-gray-600">
                        <p class="mb-1"><strong>What do g(n), h(n), f(n) mean?</strong></p>
                        <ul class="list-disc list-inside space-y-0.5">
                            <li><strong>g(n)</strong>: Accumulated path cost from Start to n (sum of edge distances in km).</li>
                            <li><strong>h(n)</strong>: Heuristic estimate from n to Goal (straight-line distance).</li>
                            <li><strong>f(n)</strong> = g(n) + h(n): Estimated total cost via n. A* expands the frontier node with the smallest f(n).</li>
                        </ul>
                    </div>
                </div>`;
            }
        }

        // For Greedy, show the same g(n), h(n), f(n) table for interpretability
        if (algorithm === 'greedy' && Array.isArray(result.path) && result.path.length > 0) {
            const goalCity = result.reachedGoal || result.path[result.path.length - 1];
            if (goalCity) {
                let gSoFar = 0;
                const rows = result.path.map((city, idx) => {
                    const h = calculateStraightLineDistance(city, goalCity);
                    const f = gSoFar + h; // not used by Greedy, but informative
                    const row = {
                        city,
                        g: Number.isFinite(gSoFar) ? gSoFar : Infinity,
                        h: Number.isFinite(h) ? h : Infinity,
                        f: Number.isFinite(f) ? f : Infinity
                    };
                    if (idx < result.path.length - 1) {
                        const link = getLinkByNodes(result.path[idx], result.path[idx + 1]);
                        if (link) gSoFar += link.distance;
                    }
                    return row;
                });
                const format = v => (Number.isFinite(v) ? v.toFixed(1) : '∞');
                const table = `
                    <div class="mt-2 overflow-auto">
                        <table class="min-w-full text-xs border border-gray-200 rounded">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-2 py-1 text-left">Node</th>
                                    <th class="px-2 py-1 text-right">g(n)</th>
                                    <th class="px-2 py-1 text-right">h(n)</th>
                                    <th class="px-2 py-1 text-right">f(n)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(r => `
                                    <tr class="odd:bg-white even:bg-gray-50">
                                        <td class="px-2 py-1">${r.city}</td>
                                        <td class="px-2 py-1 text-right">${format(r.g)}</td>
                                        <td class="px-2 py-1 text-right">${format(r.h)}</td>
                                        <td class="px-2 py-1 text-right">${format(r.f)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                html += `<div class="mt-2"><strong>Greedy Scores:</strong>${table}
                    <div class="mt-1 text-xs text-gray-600">
                        <p class="mb-1"><strong>What do g(n), h(n), f(n) mean?</strong></p>
                        <ul class="list-disc list-inside space-y-0.5">
                            <li><strong>g(n)</strong>: Accumulated path cost from Start to n (sum of edge distances in km). Shown for context.</li>
                            <li><strong>h(n)</strong>: Heuristic estimate from n to Goal (straight-line distance). Greedy selects the node with the smallest h(n).</li>
                            <li><strong>f(n)</strong> = g(n) + h(n): Not used by Greedy for decisions; included to compare with A*.</li>
                        </ul>
                    </div>
                </div>`;
            }
        }
    } else {
        html += `<p><strong>No path found</strong></p>`;
        html += `<p><strong>Nodes Explored:</strong> ${result.nodesExplored}</p>`;
        if (typeof result.nodesDiscovered === 'number') {
            html += `<p><strong>Nodes Discovered:</strong> ${result.nodesDiscovered}</p>`;
        }
        if (typeof result.edgesProcessed === 'number') {
            html += `<p><strong>Edges Processed:</strong> ${result.edgesProcessed}</p>`;
        }
        
        if (result.reason) {
            html += `<p><strong>Reason:</strong> ${result.reason}</p>`;
        }
    }
    
    html += '</div>';
    
    // Add algorithm complexity information
    html += getComplexityInfo(algorithm);
    
    if (asString) return html;
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
    const complexities_old = {
        'bfs': { time: 'O(V + E)', space: 'O(V)', optimal: 'Yes (unweighted)', complete: 'Yes' },
        'dfs': { time: 'O(V + E)', space: 'O(V)', optimal: 'No', complete: 'No (infinite spaces)' },
        'ucs': { time: 'O(b^⌈C*/ε⌉)', space: 'O(b^⌈C*/ε⌉)', optimal: 'Yes', complete: 'Yes' },
        'dls': { time: 'O(b^l)', space: 'O(bl)', optimal: 'No', complete: 'No' },
        'iddfs': { time: 'O(b^d)', space: 'O(bd)', optimal: 'Yes (unweighted)', complete: 'Yes' },
        'bidirectional': { time: 'O(b^(d/2))', space: 'O(b^(d/2))', optimal: 'Yes (unweighted)', complete: 'Yes' },
        'greedy': { time: 'O(b^m)', space: 'O(b^m)', optimal: 'No', complete: 'No' },
        'astar': { time: 'O(b^d)', space: 'O(b^d)', optimal: 'Yes (admissible heuristic)', complete: 'Yes' }
    };

    const complexities = {
        'bfs': { time: 'O(b^d)', space: 'O(b^(d+1))', optimal: 'Yes (unweighted)', complete: 'Yes' },
        'dfs': { time: 'O(b^m)', space: 'O(bm)', optimal: 'No', complete: 'No (infinite spaces)' },
        'ucs': { time: 'O(b^(1 + ⌈C*/ε⌉))', space: 'O(b^(1 + ⌈C*/ε⌉))', optimal: 'Yes', complete: 'Yes' },
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
    let nodesDiscovered = 1; // start is discovered
    let edgesProcessed = 0;
    
    updateStatus(`Starting BFS from ${start} to ${goal}`);
    
    while (queue.length > 0) {
        if (!isSearchRunning) break;
        
        const { node: currentNode, path } = queue.shift();
        nodesExplored++;
        
        await animateNodeExploration(currentNode);
        
        if (isGoalNode(currentNode, goal)) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                nodesDiscovered,
                edgesProcessed,
                reachedGoal: reachedGoalFromPath(path),
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            edgesProcessed++;
            if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                nodesDiscovered++;
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
        nodesDiscovered,
        edgesProcessed,
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
    let nodesDiscovered = 1;
    let edgesProcessed = 0;
    
    updateStatus(`Starting DFS from ${start} to ${goal}`);
    
    while (stack.length > 0) {
        if (!isSearchRunning) break;
        
        const { node: currentNode, path } = stack.pop();
        nodesExplored++;
        
        await animateNodeExploration(currentNode);
        
        if (isGoalNode(currentNode, goal)) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                nodesDiscovered,
                edgesProcessed,
                reachedGoal: reachedGoalFromPath(path),
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        // Reverse order for DFS to maintain consistent exploration
        for (let i = neighbors.length - 1; i >= 0; i--) {
            const neighbor = neighbors[i];
            edgesProcessed++;
            if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                nodesDiscovered++;
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
        nodesDiscovered,
        edgesProcessed,
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
    let nodesDiscovered = 1; // counting start as discovered when pushing frontier
    let edgesProcessed = 0;
    
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
        
        if (isGoalNode(currentNode, goal)) {
            await animatePath(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                nodesDiscovered,
                edgesProcessed,
                reachedGoal: reachedGoalFromPath(path),
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            edgesProcessed++;
            if (!visited.has(neighbor.id)) {
                frontier.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id],
                    cost: cost + neighbor.distance
                });
                nodesDiscovered++;
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        nodesDiscovered,
        edgesProcessed,
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
    let edgesProcessed = 0;
    let nodesDiscovered = 1; // start
    
    updateStatus(`Starting DLS from ${start} to ${goal} with depth limit ${depthLimit}`);
    
    async function dls(currentNode, path, depth) {
        if (!isSearchRunning) return { success: false, reason: 'Search stopped' };
        
        nodesExplored++;
        await animateNodeExploration(currentNode);
        
        if (isGoalNode(currentNode, goal)) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                nodesDiscovered,
                edgesProcessed,
                reachedGoal: reachedGoalFromPath(path),
                executionTime: Date.now() - startTime
            };
        }
        
        if (depth >= depthLimit) {
            await animateNodeExploration(currentNode, false);
            return { success: false, reason: 'Depth limit reached', nodesExplored, nodesDiscovered, edgesProcessed };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            edgesProcessed++;
            // Avoid cycles by checking if neighbor is already in path
            if (!path.includes(neighbor.id)) {
                const result = await dls(neighbor.id, [...path, neighbor.id], depth + 1);
                if (result.success) return result;
                // if we expanded to neighbor (implicitly discovered), count it once
                if (!path.includes(neighbor.id)) {
                    nodesDiscovered++;
                }
            }
        }
        
        await animateNodeExploration(currentNode, false);
        return { success: false, reason: 'No path found within depth limit', nodesExplored, nodesDiscovered, edgesProcessed };
    }
    
    const result = await dls(start, [start], 0);
    if (!result.nodesExplored) {
        result.nodesExplored = nodesExplored;
        result.executionTime = Date.now() - startTime;
    }
    if (typeof result.nodesDiscovered !== 'number') {
        result.nodesDiscovered = nodesDiscovered;
    }
    if (typeof result.edgesProcessed !== 'number') {
        result.edgesProcessed = edgesProcessed;
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
    let totalEdgesProcessed = 0;
    let totalNodesDiscovered = 0;
    const maxDepth = 5; // Reasonable maximum depth for Sri Lankan cities
    
    updateStatus(`Starting IDDFS from ${start} to ${goal}`);
    
    for (let depth = 0; depth <= maxDepth; depth++) {
        if (!isSearchRunning) break;
        
        updateStatus(`IDDFS: Trying depth limit ${depth}`);
        
        // Reset visualization for new depth iteration
        d3.selectAll('.node').classed('exploring', false);
        
    const result = await depthLimitedSearch(start, goal, depth);
    totalNodesExplored += result.nodesExplored;
    totalEdgesProcessed += (result.edgesProcessed || 0);
    totalNodesDiscovered += (result.nodesDiscovered || 0);
        
        if (result.success) {
            return {
                ...result,
                nodesExplored: totalNodesExplored,
                nodesDiscovered: totalNodesDiscovered,
                edgesProcessed: totalEdgesProcessed,
                executionTime: Date.now() - startTime
            };
        }
        
        // Brief pause between depth iterations
        await sleep(ANIMATION_DELAY);
    }
    
    return {
        success: false,
        nodesExplored: totalNodesExplored,
        nodesDiscovered: totalNodesDiscovered,
        edgesProcessed: totalEdgesProcessed,
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
    let nodesDiscovered = 2; // start and goal as seeds
    let edgesProcessed = 0;
    
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
                    nodesDiscovered,
                    edgesProcessed,
                    executionTime: Date.now() - startTime
                };
            }
            
            const neighbors = getNeighbors(currentNode);
            for (const neighbor of neighbors) {
                edgesProcessed++;
                if (!frontVisited.has(neighbor.id)) {
                    const newPath = [...path, neighbor.id];
                    frontVisited.set(neighbor.id, newPath);
                    frontQueue.push({
                        node: neighbor.id,
                        path: newPath
                    });
                    nodesDiscovered++;
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
                    nodesDiscovered,
                    edgesProcessed,
                    executionTime: Date.now() - startTime
                };
            }
            
            const neighbors = getNeighbors(currentNode);
            for (const neighbor of neighbors) {
                edgesProcessed++;
                if (!backVisited.has(neighbor.id)) {
                    const newPath = [...path, neighbor.id];
                    backVisited.set(neighbor.id, newPath);
                    backQueue.push({
                        node: neighbor.id,
                        path: newPath
                    });
                    nodesDiscovered++;
                }
            }
            
            await animateNodeExploration(currentNode, false);
        }
    }
    
    return {
        success: false,
        nodesExplored,
        nodesDiscovered,
        edgesProcessed,
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
    
    const frontier = [{ node: start, path: [start], heuristic: heuristicToGoalOrGoals(start, goal) }];
    const visited = new Set();
    let nodesExplored = 0;
    let nodesDiscovered = 1;
    let edgesProcessed = 0;
    
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
        
        if (isGoalNode(currentNode, goal)) {
            await animatePath(path);
            const cost = calculatePathCost(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                nodesDiscovered,
                edgesProcessed,
                reachedGoal: reachedGoalFromPath(path),
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            edgesProcessed++;
            if (!visited.has(neighbor.id)) {
                frontier.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id],
                    heuristic: heuristicToGoalOrGoals(neighbor.id, goal)
                });
                nodesDiscovered++;
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        nodesDiscovered,
        edgesProcessed,
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
        heuristic: heuristicToGoalOrGoals(start, goal),
        f: heuristicToGoalOrGoals(start, goal)
    }];
    
    const visited = new Set();
    let nodesExplored = 0;
    let nodesDiscovered = 1;
    let edgesProcessed = 0;
    
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
        
        if (isGoalNode(currentNode, goal)) {
            await animatePath(path);
            return {
                success: true,
                path,
                cost,
                nodesExplored,
                nodesDiscovered,
                edgesProcessed,
                reachedGoal: reachedGoalFromPath(path),
                executionTime: Date.now() - startTime
            };
        }
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            edgesProcessed++;
            if (!visited.has(neighbor.id)) {
                const newCost = cost + neighbor.distance;
                const heuristic = heuristicToGoalOrGoals(neighbor.id, goal);
                const f = newCost + heuristic;
                
                frontier.push({
                    node: neighbor.id,
                    path: [...path, neighbor.id],
                    cost: newCost,
                    heuristic,
                    f
                });
                nodesDiscovered++;
            }
        }
        
        await animateNodeExploration(currentNode, false);
    }
    
    return {
        success: false,
        nodesExplored,
        nodesDiscovered,
        edgesProcessed,
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

// --- Clean Tree Search Visualization for Fourth Panel (No Loops) ---
function buildAlgorithmTreeNoLoops(node, path, goalSet, getNeighbors, algorithm) {
    // If node is a goal, mark it
    const isGoal = goalSet.has(node);
    // If node is in path (cycle), do not expand further
    if (path.includes(node)) {
        return null;
    }
    // Get all direct neighbors
    let neighbors = getNeighbors(node).map(n => n.id);
    // Order neighbors as per algorithm
    if (algorithm === 'ucs') {
        neighbors = getNeighbors(node).sort((a, b) => a.distance - b.distance).map(n => n.id);
    } else if (algorithm === 'greedy' || algorithm === 'astar') {
        // Use min straight-line distance to any goal
        neighbors = getNeighbors(node).sort((a, b) =>
            Math.min(...Array.from(goalSet).map(g => calculateStraightLineDistance(a.id, g))) -
            Math.min(...Array.from(goalSet).map(g => calculateStraightLineDistance(b.id, g)))
        ).map(n => n.id);
    }
    if (algorithm === 'dfs') {
        neighbors = neighbors.slice().reverse();
    }
    // Recursively build children, filter out nulls
    const children = neighbors.map(child => buildAlgorithmTreeNoLoops(child, [...path, node], goalSet, getNeighbors, algorithm)).filter(Boolean);
    return {
        name: node,
        isGoal,
        children
    };
}

function renderAlgorithmTreePanelNoLoops() {
    const algorithm = document.getElementById('algorithm').value;
    const startCity = document.getElementById('startCity').value;
    const goal1 = document.getElementById('destCity').value;
    const goal2 = document.getElementById('secondaryDestCity')?.value;
    const goalSet = new Set([goal1, goal2].filter(Boolean));
    const container = document.getElementById('selectedStateSpaceGraph');
    container.innerHTML = '';
    if (!algorithm || !startCity || goalSet.size === 0) {
        container.innerHTML = '<span class="text-gray-400">Select algorithm, start, and goal cities to view the tree search here.</span>';
        return;
    }
    // Build tree
    const tree = buildAlgorithmTreeNoLoops(startCity, [], goalSet, getNeighbors, algorithm);
    // D3 rendering
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    const g = svg.append('g').attr('transform', `translate(40,40)`);
    const root = d3.hierarchy(tree);
    const treeLayout = d3.tree().size([width - 80, height - 80]);
    treeLayout(root);
    // Draw links
    g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y))
        .attr('fill', 'none')
        .attr('stroke', '#888')
        .attr('stroke-width', 2);
    // Draw nodes
    const node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    node.append('circle')
        .attr('r', 35)
        .attr('fill', d => {
            if (d.data.isGoal) return '#ef4444';
            if (d.depth === 0) return '#3b82f6';
            return '#22c55e';
        });
    node.append('foreignObject')
        .attr('x', -32)
        .attr('y', -22)
        .attr('width', 64)
        .attr('height', 44)
        .append('xhtml:div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '44px')
        .style('width', '64px')
        .style('color', '#fff')
        .style('font-size', '10px')
        .style('text-align', 'center')
        .style('word-break', 'break-word')
        .text(d => d.data.name);
}

// document.getElementById('algorithm').addEventListener('change', renderAlgorithmTreePanelNoLoops);
// document.getElementById('startCity').addEventListener('change', renderAlgorithmTreePanelNoLoops);
// document.getElementById('destCity').addEventListener('change', renderAlgorithmTreePanelNoLoops);
// window.addEventListener('DOMContentLoaded', renderAlgorithmTreePanelNoLoops);

// --- Tree Search Visualization for Fourth Panel (No Loops, Stop at Goals, Two Levels Below Goals) ---
function buildAlgorithmTreeLimited(node, path, goalSet, getNeighbors, algorithm, goalDepth = null) {
    // If node is a goal, mark it and allow up to two more levels below
    const isGoal = goalSet.has(node);
    let currentGoalDepth = goalDepth;
    if (isGoal) currentGoalDepth = 2;
    // If node is in path (cycle), do not expand further
    if (path.includes(node)) {
        return null;
    }
    // If we are below a goal and reached the limit, stop
    if (currentGoalDepth !== null && currentGoalDepth <= 0) {
        return {
            name: node,
            isGoal,
            children: []
        };
    }
    // Get all direct neighbors
    let neighbors = getNeighbors(node).map(n => n.id);
    // Order neighbors as per algorithm
    if (algorithm === 'ucs') {
        neighbors = getNeighbors(node).sort((a, b) => a.distance - b.distance).map(n => n.id);
    } else if (algorithm === 'greedy' || algorithm === 'astar') {
        // Use min straight-line distance to any goal
        neighbors = getNeighbors(node).sort((a, b) =>
            Math.min(...Array.from(goalSet).map(g => calculateStraightLineDistance(a.id, g))) -
            Math.min(...Array.from(goalSet).map(g => calculateStraightLineDistance(b.id, g)))
        ).map(n => n.id);
    }
    if (algorithm === 'dfs') {
        neighbors = neighbors.slice().reverse();
    }
    // Recursively build children, filter out nulls
    const children = neighbors.map(child => buildAlgorithmTreeLimited(child, [...path, node], goalSet, getNeighbors, algorithm, currentGoalDepth !== null ? currentGoalDepth - 1 : null)).filter(Boolean);
    return {
        name: node,
        isGoal,
        children
    };
}

function renderAlgorithmTreePanelLimited() {
    const algorithm = document.getElementById('algorithm').value;
    const startCity = document.getElementById('startCity').value;
    const goal1 = document.getElementById('destCity').value;
    const goal2 = document.getElementById('secondaryDestCity')?.value;
    const goalSet = new Set([goal1, goal2].filter(Boolean));
    const container = document.getElementById('selectedStateSpaceGraph');
    container.innerHTML = '';
    if (!algorithm || !startCity || goalSet.size === 0) {
        container.innerHTML = '<span class="text-gray-400">Select algorithm, start, and goal cities to view the tree search here.</span>';
        return;
    }
    // Build tree
    const tree = buildAlgorithmTreeLimited(startCity, [], goalSet, getNeighbors, algorithm);
    // D3 rendering
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    const g = svg.append('g').attr('transform', `translate(40,40)`);
    const root = d3.hierarchy(tree);
    const treeLayout = d3.tree().size([width - 80, height - 80]);
    treeLayout(root);
    // Draw links
    g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y))
        .attr('fill', 'none')
        .attr('stroke', '#888')
        .attr('stroke-width', 2);
    // Draw nodes
    const node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    node.append('circle')
        .attr('r', 35)
        .attr('fill', d => {
            if (d.data.isGoal) return '#ef4444';
            if (d.depth === 0) return '#3b82f6';
            return '#22c55e';
        });
    node.append('foreignObject')
        .attr('x', -32)
        .attr('y', -22)
        .attr('width', 64)
        .attr('height', 44)
        .append('xhtml:div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '44px')
        .style('width', '64px')
        .style('color', '#fff')
        .style('font-size', '10px')
        .style('text-align', 'center')
        .style('word-break', 'break-word')
        .text(d => d.data.name);
}

// document.getElementById('algorithm').addEventListener('change', renderAlgorithmTreePanelLimited);
// document.getElementById('startCity').addEventListener('change', renderAlgorithmTreePanelLimited);
// document.getElementById('destCity').addEventListener('change', renderAlgorithmTreePanelLimited);
// window.addEventListener('DOMContentLoaded', renderAlgorithmTreePanelLimited);

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

        // Reposition heuristic labels
        updateHeuristicLabelsForGraph();
    }
});

// --- Tree Search Graph Visualization (root to goal nodes only) ---
function buildTreeSearchGraphData(root, goalSet, getNeighbors) {
    // Build tree level by level, adding only immediate children to already rendered nodes
    const tree = { name: root, isGoal: goalSet.has(root), children: [] };
    let foundGoals = new Set();
    let queue = [{ node: tree, path: [root] }];
    let nodeMap = new Map();
    nodeMap.set(root, tree);
    
    while (queue.length > 0 && foundGoals.size < goalSet.size) {
        const { node: currentTreeNode, path } = queue.shift();
        
        // Check if current node is a goal
        if (goalSet.has(currentTreeNode.name)) {
            foundGoals.add(currentTreeNode.name);
        }
        
        // If all goals found, stop adding new nodes
        if (foundGoals.size === goalSet.size) {
            break;
        }
        
        // Add immediate children to current node
        const neighbors = getNeighbors(currentTreeNode.name).map(n => n.id);
        for (const neighborId of neighbors) {
            if (!path.includes(neighborId)) { // prevent cycles
                const newPath = [...path, neighborId];
                let childNode = currentTreeNode.children.find(c => c.name === neighborId);
                if (!childNode) {
                    childNode = { name: neighborId, isGoal: goalSet.has(neighborId), children: [] };
                    currentTreeNode.children.push(childNode);
                    nodeMap.set(neighborId, childNode);
                    queue.push({ node: childNode, path: newPath });
                }
            }
        }
    }
    
    return tree;
}

function renderTreeSearchGraph() {
    const algorithm = document.getElementById('algorithm').value;
    const startCity = document.getElementById('startCity').value;
    const goal1 = document.getElementById('destCity').value;
    const goal2 = document.getElementById('secondaryDestCity')?.value;
    const goalSet = new Set([goal1, goal2].filter(Boolean));
    const container = document.getElementById('treeSearchGraph');
    container.innerHTML = '';
    if (!startCity || goalSet.size === 0) {
        container.innerHTML = '<span class="text-gray-400">Select cities and click "Start Search" to view the tree search graph here.</span>';
        return;
    }
    // Build tree data (only root-to-goal paths)
    const tree = buildTreeSearchGraphData(startCity, goalSet, getNeighbors);
    // D3 rendering
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    const g = svg.append('g').attr('transform', `translate(40,40)`);
    const root = d3.hierarchy(tree);
    const treeLayout = d3.tree().size([width - 80, height - 80]);
    treeLayout(root);
    // Draw links
    g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y))
        .attr('fill', 'none')
        .attr('stroke', '#888')
        .attr('stroke-width', 2);
    // Draw nodes
    const node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    node.append('circle')
        .attr('r', 35)
        .attr('fill', d => {
            if (d.data.isGoal) return '#ef4444';
            if (d.depth === 0) return '#3b82f6';
            return '#22c55e';
        });
    node.append('foreignObject')
        .attr('x', -32)
        .attr('y', -22)
        .attr('width', 64)
        .attr('height', 44)
        .append('xhtml:div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '44px')
        .style('width', '64px')
        .style('color', '#fff')
        .style('font-size', '10px')
        .style('text-align', 'center')
        .style('word-break', 'break-word')
        .text(d => d.data.name);
}

document.getElementById('algorithm').addEventListener('change', renderTreeSearchGraph);
document.getElementById('startCity').addEventListener('change', renderTreeSearchGraph);
document.getElementById('destCity').addEventListener('change', renderTreeSearchGraph);
if (document.getElementById('secondaryDestCity')) {
    document.getElementById('secondaryDestCity').addEventListener('change', renderTreeSearchGraph);
}
window.addEventListener('DOMContentLoaded', renderTreeSearchGraph);