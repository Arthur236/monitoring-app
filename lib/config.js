/*
* Create and export configuration variables
*
*/

// Container for all environments
let environments = {};

// Staging environment (default)
environments.staging = {
  'httpPort': 4000,
  'httpsPort': 4001,
  'envName': 'staging',
  'hashingSecret': 'AVG5E0t6WYxnIg0NFJKP',
  'maxChecks': 5
};

// Production environment
environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': 'production',
  'hashingSecret': 'Lf3LTbb6vxyo90F3tlxW',
  'maxChecks': 5
};

// Determine which environment was passed as a command line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that athe current environment is listed above, if not, default to staging
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
