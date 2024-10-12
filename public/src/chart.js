/**
 * Generates a tree diagram from a list of URLs.
 * @param {Array} urls - An array of URLs to be visualized in the tree diagram.
 */
function generateTreeFromURLs(urls) {

  d3.select("#chart_div").selectAll("*").remove();
  // Convert URLs to a hierarchical data structure
  const rootDomain = new URL(urls[0]).hostname; // Extract the root domain from the first URL
  const data = generateHierarchicalData(urls, rootDomain); // Generate hierarchical data

  // Specify the chart's dimensions
  const marginTop = 10;
  const marginRight = 10;
  const marginBottom = 10;
  const marginLeft = 320; // Increase left margin to provide more space for the root node
  const width = 2400; // Define the width of the SVG
  const height = 600; // Increase the height of the SVG

// Create the root hierarchy
  const root = d3.hierarchy(data);
  const dx = 48;
  const dy = 420; // Increase this value to spread nodes more horizontally


  // Define the tree layout and the shape for links
  const tree = d3.tree().nodeSize([dx, dy]);
  const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);


  // Create the SVG container
  const svg = d3.select("#chart_div").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-marginLeft, -marginTop, width + marginLeft, height]) // Adjust viewBox to include more space on the left
    .attr("style", "max-width: 100%; height: auto; font: 18px sans-serif; user-select: none;");

  const gLink = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5);

  const gNode = svg.append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");


  function update(event, source) {
    const duration = event?.altKey ? 2500 : 250;
    const nodes = root.descendants().reverse();
    const links = root.links();

    // Compute the new tree layout
    tree(root);

    
    let left = root;
    let right = root;
    root.eachBefore(node => {
      if (node.x < left.x) left = node;
      if (node.x > right.x) right = node;
    });

    const height = right.x - left.x + marginTop + marginBottom;

    const transition = svg.transition()
      .duration(duration)
      .attr("height", height)
      .attr("viewBox", [-marginLeft, left.x - marginTop, width + marginLeft, height]) // Adjust viewBox for transitions
      .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

    // Update the nodes
    const node = gNode.selectAll("g")
      .data(nodes, d => d.id);

    // Enter any new nodes at the parent's previous position
    const nodeEnter = node.enter().append("g")
      .attr("transform", d => `translate(${source.y0},${source.x0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event, d) => {
        d.children = d.children ? null : d._children;
        update(event, d);
      });

    nodeEnter.append("circle")
      .attr("r", 2.5)
      .attr("fill", d => d._children ? "#555" : "#999")
      .attr("stroke-width", 10);

    nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d._children ? -6 : 6)
      .attr("text-anchor", d => d._children ? "end" : "start")
      .text(d => d.data.name)
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "white")
      .attr("paint-order", "stroke");

    // Transition nodes to their new position
    const nodeUpdate = node.merge(nodeEnter).transition(transition)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    // Transition exiting nodes to the parent's new position
    const nodeExit = node.exit().transition(transition).remove()
      .attr("transform", d => `translate(${source.y},${source.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    // Update the links
    const link = gLink.selectAll("path")
      .data(links, d => d.target.id);

    // Enter any new links at the parent's previous position
    const linkEnter = link.enter().append("path")
      .attr("d", d => {
        const o = { x: source.x0, y: source.y0 };
        return diagonal({ source: o, target: o });
      });

    // Transition links to their new position
    link.merge(linkEnter).transition(transition)
      .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position
    link.exit().transition(transition).remove()
      .attr("d", d => {
        const o = { x: source.x, y: source.y };
        return diagonal({ source: o, target: o });
      });

    // Stash the old positions for transition
    root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // Initialize the tree with some nodes open
  root.x0 = dy;
  root.y0 = 0;
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    if (d.depth && d.data.name.length !== 7) d.children = null;
  });

  update(null, root);
}

/**
 * Converts a list of URLs into a hierarchical data structure.
 * @param {Array} urls - An array of URLs to be processed.
 * @param {string} rootDomain - The root domain to be used as the top-level node.
 * @returns {Object} A hierarchical data structure.
 */
function generateHierarchicalData(urls, rootDomain) {
  const root = { name: rootDomain, children: [] }; // Initialize the root node
  const nodes = {}; // Object to track nodes and their children

  urls.forEach((url) => {
    const parsedUrl = new URL(url); // Parse the URL
    const segments = parsedUrl.pathname.split('/').filter(Boolean); // Split the path into segments

    let currentNode = root; // Start at the root node
    segments.forEach((segment) => {
      if (!nodes[segment]) { // If the segment is not already a node, add it
        const newNode = { name: segment, children: [] }; // Create a new node
        nodes[segment] = newNode; // Add the node to the nodes object
        currentNode.children.push(newNode); // Add the new node as a child of the current node
      }
      currentNode = nodes[segment]; // Move to the new node
    });
  });

  return root; // Return the hierarchical data structure
}