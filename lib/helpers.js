/*
* Helpers for various tasks
*
*/

//Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

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

// Send an SMS via Twilio
helpers.sendTwilioSms = function(phone, msg, callback) {
  // Validate the parameters
  phone = typeof(phone) === 'string' && phone.trim().length > 10 ? phone.trim() : false;
  msg = typeof(msg) === 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

  if(phone && msg) {
    // Configure the request payload
    const payload = {
      'From': config.twilio.fromPhone,
      'To': phone,
      'Body': msg
    };

    // Stringify payload
    const stringPayload = querystring.stringify(payload);

    // Configure request details
    const requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      'path': '/2010-04-01/Accounts/' + config.twilio.accounSid + '/Messages.json',
      'auth': config.twilio.accounSid + ':' + config.twilio.authToken,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    const req = https.request(requestDetails, function(res) {
      // Grab the status of the sent request
      const status = res.statusCode;

      // Callback successfully if the request wen through
      if(status === 200 || status === 201) {
        callback(false);
      } else {
        callback('Status code returned was: ' + status);
      }
    });

    // Bind to an error event so that it doesn't get thrown
    req.on('error', function(e) {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback(helpers.message.missingFields);
  }
};

// Get the string content of a template, and use provided data for string interpolation
helpers.getTemplate = function(templateName, data, callback) {
  templateName = typeof(templateName) === 'string' && templateName.length > 0 ? templateName : false;
  data = typeof(data) === 'object' && data !== null ? data : {};

  if(templateName) {
    const templatesDir = path.join(__dirname, '/../templates/');

    fs.readFile(templatesDir + templateName + '.html', 'utf8', function(err, str) {
      if(!err && str && str.length > 0) {
        // Do interpolation on the string
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

// Add the universal header and footer to a string, and pass provided data object to header and footer for interpolation
helpers.addUniversalTemplates = function(str, data, callback) {
  str = typeof(str) === 'string' && str.length > 0 ? str : '';
  data = typeof(data) === 'object' && data !== null ? data : {};

  // Get the header
  helpers.getTemplate('_header', data, function(err, headerString) {
    if(!err && headerString) {
      // Get the footer
      helpers.getTemplate('_footer', data, function(err, footerString) {
        if(!err && headerString) {
          // Add them all together
          const fullString = headerString + str + footerString;
          callback(false, fullString);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};

// Take a given string and data object, and find/replace all the keys within it
helpers.interpolate = function(str, data) {
  str = typeof(str) === 'string' && str.length > 0 ? str : '';
  data = typeof(data) === 'object' && data !== null ? data : {};

  // Add the templateGlobals to the data object, pre-pending their key name with "global."
  for(let keyName in config.templateGlobals) {
    if(config.templateGlobals.hasOwnProperty(keyName)) {
      data['global.' + keyName] = config.templateGlobals[keyName];
    }
  }
  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for(let key in data) {
    if(data.hasOwnProperty(key) && typeof(data[key] === 'string')) {
      const replace = data[key];
      const find = '{' + key + '}';
      str = str.replace(find, replace);
    }
  }
  return str;
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = function(fileName, callback) {
  fileName = typeof(fileName) === 'string' && fileName.length > 0 ? fileName : false;

  if(fileName) {
    const publicDir = path.join(__dirname, '/../public/');

    fs.readFile(publicDir + fileName, function(err, data) {
      if(!err && data) {
        callback(false, data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('A valid file name was not specified');
  }
};

module.exports = helpers;
