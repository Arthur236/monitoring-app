/*
* These are the request handlers
*
*/

// Dependencies
const _data = require('./data')
const helpers = require('./helpers')

// Define the handlers
let handlers = {}

// Ping handler
handlers.ping = function(data, callback) {
  // Callback a http status code and a payload object
  callback(200)
}

// Users
handlers.users = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete']

  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Container for the users sub methods
handlers._users = {}

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: nope
handlers._users.post = function(data, callback) {
  // Check that all required fields are filled
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
  const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false

  if(firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesnt already exist
    _data.read('users', phone, function(err, data) {
      if(err) {
        // Hash the password
        const hashedPassword = helpers.hash(password)

        // Create the user object
        if(hashedPassword) {
          const userObject = {
            'firstName': firstName,
            'lastName': lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
          }

          // Store the user
          _data.create('users', phone, userObject, function(err) {
            if(!err) {
              callback(200)
            } else {
              console.log(err)
              callback(500, {'Error': helpers.message.userCreationError})
            }
          })
        } else {
          callback(500, {'Error': helpers.message.hashError})
        }
      } else {
        // User already exists
        callback(400, {'Error': helpers.message.existingUserError})
      }
    })
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
  // Check that the phone number is valid
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 12 ? data.queryStringObject.phone.trim() : false

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
            delete data.hashedPassword
            callback(200, data)
          } else {
            callback(404)
          }
        });
      } else {
        callback(403, {'Error': helpers.message.invalidTokenError});
      }
    });
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback) {
  // Check for the required field
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false

  // Check the optional fields
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

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
                userData.firstName = firstName
              }
              if(lastName) {
                userData.lastName = lastName
              }
              if(firstName) {
                userData.hashedPassword = helpers.hash(password)
              }

              // Store the new updates
              _data.update('users', phone, userData, function(err) {
                if(!err) {
                  callback(200)
                } else {
                  console.log(err)
                  callback(500, {'Error': helpers.message.userUpdateError})
                }
              })
            } else {
              callback(400, {'Error': helpers.message.userNotFoundError})
            }
          });
        } else {
          callback(403, {'Error': helpers.message.invalidTokenError});
        }
      });
    } else {
      callback(400, {'Error': helpers.message.missingFields})
    }
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Users - delete
// Required data: phone
handlers._users.delete = function(data, callback) {
  // Check that the phone number is valid
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 12 ? data.queryStringObject.phone.trim() : false

  if(phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // verify that the give token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if(tokenIsValid) {
        // Look up user
        _data.read('users', phone, function(err, data) {
          if(!err && data) {
            _data.delete('users', phone, function(err) {
              if(!err) {
                callback(200)
              } else {
                callback(500, {'Error': helpers.message.userDeleteError})
              }
            })
          } else {
            callback(400, {'Error': helpers.message.userNotFoundError})
          }
        });
      } else {
        callback(403, {'Error': helpers.message.invalidTokenError});
      }
    });
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Tokens
handlers.tokens = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete']

  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Container for all the tokens
handlers._tokens = {}

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 12 ? data.payload.phone.trim() : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

  if(phone && password) {
    // Lookup the user who matches that phone number
    _data.read('users', phone, function(err, userData) {
      if(!err && userData) {
        // Hash the sent password and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password)

        if(hashedPassword === userData.hashedPassword) {
          // Create a new token with a random name, set expiration date
          const tokenId = helpers.createRandomString(20)
          const expires = Date.now() + 1000 * 60 * 60
          const tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          }

          // Store the token
          _data.create('tokens', tokenId, tokenObject, function(err) {
            if(!err) {
              callback(200, tokenObject)
            } else {
              callback(500, {'Error': helpers.message.tokenCreationError})
            }
          })
        } else {
          callback(400, {'Error': helpers.message.passwordMismatchError})
        }
      } else {
        callback(400, {'Error': helpers.message.userNotFoundError})
      }
    })
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false

  if(id) {
    // Look up user
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        callback(200, tokenData)
      } else {
        callback(404)
      }
    })
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {
  const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false
  const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false

  if(id && extend) {
    // Look up the token
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        // Check to make sure the token isn't already expired
        if(tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60

          // Store the new updates
          _data.update('tokens', id, tokenData, function(err) {
            if(!err) {
              callback(200)
            } else {
              callback(500, {'Error': helpers.message.tokenUpdateError})
            }
          })
        } else {
          callback(400, {'Error': helpers.message.tokenExpirationError})
        }
      } else {
        callback(400, {'Error': helpers.message.tokenNotFoundError})
      }
    })
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false

  if(id) {
    // Look up token
    _data.read('tokens', id, function(err, data) {
      if(!err && data) {
        _data.delete('tokens', id, function(err) {
          if(!err) {
            callback(200)
          } else {
            callback(500, {'Error': helpers.message.tokenDeleteError})
          }
        })
      } else {
        callback(400, {'Error': helpers.message.tokenNotFoundError})
      }
    })
  } else {
    callback(400, {'Error': helpers.message.missingFields})
  }
}

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  // Look up the token
  _data.read('tokens', id, function(err, tokenData) {
    if (!err && tokenData) {
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

// Ping handler
handlers.ping = function(data, callback) {
  callback(200)
}

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404)
}

module.exports = handlers
