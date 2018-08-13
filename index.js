/*
* Primary file for the API
*
*/

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiate the http server
const httpServer = http.createServer(function(req, res) {
  unifiedServer(req, res);
});

// Start the http server and have it listen on a port
httpServer.listen(config.httpPort, function() {
  console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
});

// Instantiate the https server
const httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, function(req, res) {
  unifiedServer(req, res);
});

// Start the https server
httpsServer.listen(config.httpsPort, function() {
  console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
});

// All the server logic for both the http and https servers
let unifiedServer = function(req, res) {
  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', function(data) {
    buffer += decoder.write(data);
  });

  req.on('end', function() {
    buffer += decoder.end();

    // Choose the handler the request should go to
    // If one is not found, use the notFound handler
    const chosenHandler = typeof(router[trimmedPath]) != 'undefined' ? router[trimmedPath] : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    }

    // Route the request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload) {
      // Use the status code called back by the handler or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
      // Use the payload called back by the handler or default to an empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      console.log('\nReturning this response: ', statusCode, payloadString);
    });

    // Send the response
    // res.end('Hello World\n');

    // Log the request path
    // console.log('Request received on path: ' + trimmedPath + ' with method: ' +
    // method + ' and these query string parameters: ', queryStringObject);
    // console.log('\nRequest received with these headers: ', headers);

    // console.log('\nRequest received with this payload: ', buffer);
  });
}

// Define a request router
const router = {
  'ping': handlers.ping,
  'users': handlers.users
};
