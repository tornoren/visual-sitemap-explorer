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
  const marginLeft = 240; // Increase left margin to provide more space for the root node
  const width = 4800; // Define the width of the SVG
  const height = 600; // Increase the height of the SVG

// Create the root hierarchy
  const root = d3.hierarchy(data);
  const dx = 48;
  const dy = 640; // Increase this value to spread nodes more horizontally


  // Define the tree layout and the shape for links
  const tree = d3.tree().nodeSize([dx, dy]);
  const diagonal = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x)
    .source(d => {
      // Use chevron position for source (parent) node
      return {
        x: d.source.x,
        y: d.source.y + (d.source.chevronX || 0)
      };
    })
    .target(d => {
      // Regular position for target (child) node - connect to circle
      return {
        x: d.target.x,
        y: d.target.y - 6 // Connect to the circle position
      };
    });


  // Create the SVG container
  const svg = d3.select("#chart_div").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-marginLeft, -marginTop, width + marginLeft, height]) // Adjust viewBox to include more space on the left
    .attr("style", "max-width: none; height: auto; font: 18px sans-serif; user-select: none;");

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
      .attr("stroke-opacity", 0);

    // Circle (visual indicator only)
    nodeEnter.append("circle")
      .attr("r", 2.5)
      .attr("cx", -6)
      .attr("fill", d => d._children ? "#555" : "#999")
      .attr("stroke-width", 10);

    // Clickable node name text (opens URL)
    nodeEnter.append("text")
      .attr("class", "node-label")
      .attr("dy", "0.31em")
      .attr("x", 6)
      .attr("text-anchor", "start")
      .text(d => d.data.name)
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "white")
      .attr("paint-order", "stroke")
      .attr("cursor", "pointer")
      .on("click", function(event, d) {
        event.stopPropagation();
        if (d.data.url) {
          window.open(d.data.url, '_blank');
        }
      })
      .on("mouseenter", function() {
        d3.select(this).style("text-decoration", "underline");
      })
      .on("mouseleave", function() {
        d3.select(this).style("text-decoration", "none");
      });

    // Add chevron element for all nodes that have or had children
    nodeEnter.each(function(d) {
      if (d._children || d.children) {
        d3.select(this).append("text")
          .attr("class", "chevron")
          .attr("dy", "0.31em")
          .attr("text-anchor", "start")
          .attr("stroke-linejoin", "round")
          .attr("stroke-width", 3)
          .attr("stroke", "white")
          .attr("paint-order", "stroke")
          .attr("cursor", "pointer")
          .attr("fill", "#555")
          .on("click", function(event, d) {
            event.stopPropagation();
            d.children = d.children ? null : d._children;
            update(event, d);
          });
      }
    });

    // Update chevron position and visibility for ALL nodes
    node.merge(nodeEnter).each(function(d) {
      const label = d3.select(this).select(".node-label");
      const chevron = d3.select(this).select(".chevron");

      if (label.node()) {
        const bbox = label.node().getBBox();

        // Update chevron position if it exists
        if (chevron.node()) {
          chevron
            .attr("x", 6 + bbox.width + 5)
            .text(d.children ? '>' : (d._children ? '>' : ''));
        }

        // Store chevron position for line connections
        if (d._children || d.children) {
          d.chevronX = 6 + bbox.width + 12;
        }
      }
    });

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
  const parsedFirstUrl = new URL(urls[0]);
  const rootUrl = parsedFirstUrl.origin; // e.g., https://example.com
  const root = { name: rootDomain, url: rootUrl, children: [] }; // Initialize the root node
  const nodeMap = {}; // Object to track nodes by their full path

  urls.forEach((url) => {
    const parsedUrl = new URL(url); // Parse the URL
    const segments = parsedUrl.pathname.split('/').filter(Boolean); // Split the path into segments

    let currentNode = root; // Start at the root node
    let currentPath = parsedUrl.origin; // Start with https://domain.com

    segments.forEach((segment) => {
      currentPath += '/' + segment; // Build full URL incrementally

      if (!nodeMap[currentPath]) { // If the path is not already tracked, add it
        const newNode = { name: segment, url: currentPath, children: [] }; // Create a new node
        nodeMap[currentPath] = newNode; // Track the node by its full path
        currentNode.children.push(newNode); // Add the new node as a child of the current node
      }
      currentNode = nodeMap[currentPath]; // Move to the new node
    });
  });

  return root; // Return the hierarchical data structure
}