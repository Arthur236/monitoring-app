/*
* These are the request handlers
*
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define the handlers
let handlers = {};

/*
 * HTML Handlers
 *
 */

// Index Handler
handlers.index = function(data, callback) {
  // Reject any request that isn't a GET
  if(data.method === 'get') {
    // Prepare data for interpolation
    const templateData = {
      'head.title': 'Uptime Monitoring - Made Simple',
      'head.description': 'We offer free, simple uptime monitoring for HTTP/HTTPS sites all kinds. When your site ' +
      'goes down, we\'ll send you a text to let you know',
      'body.class': 'index'
    };

    // Read in a template as a string
    helpers.getTemplate('index', templateData, function(err, str) {
      if(!err && str) {
        // Add the universal header and footer
        helpers.addUniversalTemplates(str, templateData, function(err, str) {
          if(!err && str) {
            // Return that page as HTML
            callback(200, str, 'html');
          } else {
            callback(500, undefined, 'html');
          }
        });
      } else {
        callback(500, undefined, 'html');
      }
    });
  } else {
    callback(405, undefined, 'html');
  }
};

// Favicon
handlers.favicon = function(data, callback) {
  // Reject any request that isn't a GET
  if(data.method === 'get') {
    // Read in the favicon's data
    helpers.getStaticAsset('favicon.ico', function(err, data) {
      if(!err && data) {
        // Callback the data
        callback(200, data, 'favicon');
      } else {
        callback(500);
      }
    });
  } else {
    callback(405);
  }
};

// Public assets
handlers.public = function(data, callback) {
  // Reject any request that isn't a GET
  if(data.method === 'get') {
    // Get the filename being requested
    const trimmedAssetName = data.trimmedPath.replace('public/', '').trim();

    if(trimmedAssetName.length > 0) {
      // Read in the asset's data
      helpers.getStaticAsset(trimmedAssetName, function(err, data) {
        if(!err && data) {

          // Determine the content type (default to plain text)
          let contentType = 'plain';

          if(trimmedAssetName.indexOf('.css') > -1) {
            contentType = 'css';
          }

          if(trimmedAssetName.indexOf('.png') > -1) {
            contentType = 'png';
          }

          if(trimmedAssetName.indexOf('.jpg') > -1) {
            contentType = 'jpg';
          }

          if(trimmedAssetName.indexOf('.ico') > -1) {
            contentType = 'favicon';
          }

          // Callback the data
          callback(200, data, contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }

  } else {
    callback(405);
  }
};

/*
 * JSON API Handlers
 *
 */

// Ping handler
handlers.ping = function(data, callback) {
  // Callback a http status code and a payload object
  callback(200);
};

// Users
handlers.users = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users sub methods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: nope
handlers._users.post = function(data, callback) {
  // Check that all required fields are filled
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false;

  if(firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesnt already exist
    _data.read('users', phone, function(err, data) {
      if(err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        // Create the user object
        if(hashedPassword) {
          const userObject = {
            'firstName': firstName,
            'lastName': lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
          };

          // Store the user
          _data.create('users', phone, userObject, function(err) {
            if(!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { 'Error': helpers.message.userCreationError });
            }
          });
        } else {
          callback(500, { 'Error': helpers.message.hashError });
        }
      } else {
        // User already exists
        callback(400, { 'Error': helpers.message.existingUserError });
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
  // Check that the phone number is valid
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 12 ? data.queryStringObject.phone.trim() : false;

  if(phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // verify that the give token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if(tokenIsValid) {
        // Look up user
        _data.read('users', phone, function(err, data) {
          if(!err && data) {
            // Remove the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { 'Error': helpers.message.invalidTokenError });
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback) {
  // Check for the required field
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false;

  // Check the optional fields
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the phone is invalid
  if(phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Error if nothing is sent to update
    if(firstName || lastName || password) {

      // verify that the give token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if(tokenIsValid) {
          // Lookup the user
          _data.read('users', phone, function(err, userData) {
            if(!err && userData) {
              // Update necessary fields
              if(firstName) {
                userData.firstName = firstName;
              }
              if(lastName) {
                userData.lastName = lastName;
              }
              if(firstName) {
                userData.hashedPassword = helpers.hash(password);
              }

              // Store the new updates
              _data.update('users', phone, userData, function(err) {
                if(!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { 'Error': helpers.message.userUpdateError });
                }
              });
            } else {
              callback(400, { 'Error': helpers.message.userNotFoundError });
            }
          });
        } else {
          callback(403, { 'Error': helpers.message.invalidTokenError });
        }
      });
    } else {
      callback(400, { 'Error': helpers.message.missingFields });
    }
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Users - delete
// Required data: phone
handlers._users.delete = function(data, callback) {
  // Check that the phone number is valid
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 12 ? data.queryStringObject.phone.trim() : false;

  if(phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Verify that the give token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if(tokenIsValid) {
        // Look up user
        _data.read('users', phone, function(err, data) {
          if(!err && data) {
            _data.delete('users', phone, function(err) {
              if(!err) {
                // Delete all the user's checks
                const userChecks = typeof(data.checks) === 'object' && data.checks instanceof Array ? data.checks : [];
                const checksToDelete = userChecks.length;
                if(checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;

                  // Loop through the checks
                  userChecks.forEach(function(checkId) {
                    // Delete the check
                    _data.delete('checks', checkId, function(err) {
                      if(err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;

                      if(checksDeleted === checksToDelete) {
                        if(!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, { 'Error': helpers.message.userChecksDeleteError });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { 'Error': helpers.message.userDeleteError });
              }
            });
          } else {
            callback(400, { 'Error': helpers.message.userNotFoundError });
          }
        });
      } else {
        callback(403, { 'Error': helpers.message.invalidTokenError });
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Tokens
handlers.tokens = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if(phone && password) {
    // Lookup the user who matches that phone number
    _data.read('users', phone, function(err, userData) {
      if(!err && userData) {
        // Hash the sent password and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);

        if(hashedPassword === userData.hashedPassword) {
          // Create a new token with a random name, set expiration date
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, function(err) {
            if(!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { 'Error': helpers.message.tokenCreationError });
            }
          });
        } else {
          callback(400, { 'Error': helpers.message.passwordMismatchError });
        }
      } else {
        callback(400, { 'Error': helpers.message.userNotFoundError });
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

  if(id) {
    // Look up user
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {
  const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;

  if(id && extend) {
    // Look up the token
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        // Check to make sure the token isn't already expired
        if(tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens', id, tokenData, function(err) {
            if(!err) {
              callback(200);
            } else {
              callback(500, { 'Error': helpers.message.tokenUpdateError });
            }
          });
        } else {
          callback(400, { 'Error': helpers.message.tokenExpirationError });
        }
      } else {
        callback(400, { 'Error': helpers.message.tokenNotFoundError });
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

  if(id) {
    // Look up token
    _data.read('tokens', id, function(err, data) {
      if(!err && data) {
        _data.delete('tokens', id, function(err) {
          if(!err) {
            callback(200);
          } else {
            callback(500, { 'Error': helpers.message.tokenDeleteError });
          }
        });
      } else {
        callback(400, { 'Error': helpers.message.tokenNotFoundError });
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  // Look up the token
  _data.read('tokens', id, function(err, tokenData) {
    if(!err && tokenData) {
      if(tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks
handlers.checks = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the check methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback) {
  // Validate inputs
  const protocol = typeof(data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, function(err, tokenData) {
      if(!err && tokenData) {
        const userPhone = tokenData.phone;

        // Lookup the user data
        _data.read('users', userPhone, function(err, userData) {
          if(!err && userData) {
            const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

            // Verify that the user has less than the number of max checks per user
            if(userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.createRandomString(20);

              // Create the check object and include the users phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };

              // Save the object
              _data.create('checks', checkId, checkObject, function(err) {
                if(!err) {
                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, function(err) {
                    if(!err) {
                      // Return data about the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, { 'Error': helpers.message.checkUpdateError });
                    }
                  });
                } else {
                  callback(500, { 'Error': helpers.message.checkCreationError });
                }
              });
            } else {
              callback(400, { 'Error': '' + helpers.message.maxChecksError + ' (' + config.maxChecks + ')' });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

  if(id) {
    // Look up the check
    _data.read('checks', id, function(err, checkData) {
      if(!err && checkData) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // verify that the give token is valid and belongs to the user that created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if(tokenIsValid) {
            // Return the check data
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = function(data, callback) {
  // Check for the required field
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

  // Check the optional fields
  const protocol = typeof(data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Error if the id is invalid
  if(id) {
    // Check to make sure one of the optional fields has been specified
    if(protocol || url || method || successCodes || timeoutSeconds) {
      // Look up the check
      _data.read('checks', id, function(err, checkData) {
        if(!err && checkData) {
          // Get the token from the headers
          const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

          // verify that the give token is valid and belongs to the user that created the check
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
            if(tokenIsValid) {
              // Update the check
              if(protocol) {
                checkData.protocol = protocol;
              }
              if(url) {
                checkData.url = url;
              }
              if(method) {
                checkData.method = method;
              }
              if(successCodes) {
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the updates
              _data.update('checks', id, checkData, function(err) {
                if(!err) {
                  callback(200);
                } else {
                  callback(500, { 'Error': helpers.message.checkUpdateError });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(404, { 'Error': helpers.message.checkNotFoundError });
        }
      });
    } else {
      callback(400, { 'Error': helpers.message.missingFields });
    }
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

  if(id) {
    // Look up the check
    _data.read('checks', id, function(err, checkData) {
      if(!err && checkData) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // verify that the give token is valid and belongs to the user that created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if(tokenIsValid) {
            // Delete the check
            _data.delete('checks', id, function(err) {
              if(!err) {
                _data.read('users', checkData.userPhone, function(err, userData) {
                  if(!err && userData) {
                    const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted checks from their list of checks
                    const checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);

                      // Re-save the user's data
                      _data.update('users', checkData.userPhone, userData, function(err) {
                        if(!err) {
                          callback(200);
                        } else {
                          callback(500, { 'Error': helpers.message.userUpdateError });
                        }
                      });
                    } else {
                      callback(500, { 'Error': helpers.message.checkUserError });
                    }
                  } else {
                    callback(500, { 'Error': helpers.message.checkUserError });
                  }
                });
              } else {
                callback(500, { 'Error': helpers.message.checkDeleteError });
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { 'Error': helpers.message.checkNotFoundError });
      }
    });
  } else {
    callback(400, { 'Error': helpers.message.missingFields });
  }
};

// Ping handler
handlers.ping = function(data, callback) {
  callback(200);
};

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};

module.exports = handlers;
