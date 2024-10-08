// Add an event listener to the file input element to handle file selection
document.getElementById('sitemapFile').addEventListener('change', function(event) {
  const file = event.target.files[0]; // Get the first selected file
  // Check if a file is selected and if it is of type 'text/xml'
  if (file && file.type === 'text/xml') {
    const reader = new FileReader(); // Create a new FileReader to read the file
    // Define the onload event handler for the FileReader
    reader.onload = function(e) {
      const xmlContent = e.target.result; // Get the file content as a string
      parseSitemapXML(xmlContent); // Parse the XML content
    };
    reader.readAsText(file); // Read the file as text
  } else {
    // Alert the user if the file is not a valid XML file
    alert('Please upload a valid XML file.');
  }
});

/**
 * Parses the XML content of a sitemap and extracts URLs.
 * @param {string} xmlContent - The XML content of the sitemap.
 */
function parseSitemapXML(xmlContent) {
  const parser = new DOMParser(); // Create a new DOMParser to parse the XML
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml"); // Parse the XML content into a document
  
  // Extract all <loc> elements from the XML and map them to their text content (URLs)
  const urls = Array.from(xmlDoc.getElementsByTagName('loc')).map(loc => loc.textContent);

  // Pass the extracted URLs to the function that generates the D3 tree diagram
  generateTreeFromURLs(urls);
}