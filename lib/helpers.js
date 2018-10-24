/*
* Helpers for various tasks
*
*/

//Dependencies
const crypto = require('crypto');
const config = require('./config');

// Container for all helpers
const helpers = {};

// Define messages
helpers.message = {
  hashError: 'Could not hash the password',
  passwordMismatchError: 'The password does not match',

  userCreationError: 'Could not create the user',
  existingUserError: 'A user with that phone number already exists',
  userNotFoundError: 'The specified user does not exist',
  userUpdateError: 'Could not update the specified user',
  userDeleteError: 'Could not delete the specified user',
  userChecksDeleteError: 'Errors encountered while deleting the user\'s checks. Not all checks may have been deleted successfully',

  tokenCreationError: 'Could not create the new token',
  tokenNotFoundError: 'The specified token does not exist',
  tokenExpirationError: 'The token has already expired',
  tokenUpdateError: 'Could not update the token\'s expiration length',
  tokenDeleteError: 'Could not delete the token specified',

  maxChecksError: 'The user already has the maximum number of checks',
  checkCreationError: 'Could not create the new token',
  checkUpdateError: 'Could not update the user\'s check',
  checkDeleteError: 'Could not delete the user\'s check',
  checkUserError: 'Could not find the user that created the check',
  checkNotFoundError: 'The specified check does not exist',

  missingFields: 'Missing required field(s) or field(s) are invalid',

  invalidTokenError: 'Missing required token in header, or token is invalid'
};

// Create a SHA256 hash
helpers.hash = function(str) {
  if(typeof(str) === 'string' && str.length > 0) {
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases without throwing
helpers.parseJsonToObject = function(str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch(e) {
    return {};
  }
};

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = function(strLength) {
  strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;

  if(strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';

    for(let i = 1; i <= strLength; i++) {
      // Get random character from the possible characters
      // Append this character to the final string
      str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    }

    // Return the final string
    return str;
  } else {
    return false;
  }
};

module.exports = helpers;
