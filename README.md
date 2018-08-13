# monitoring-app
Simple application to monitor server uptime and downtime

## Set up instructions
### Adding HTTPS support
* Create a new directory called https in the root folder of the app and enter into it
```
mkdir https && cd https
```
* Generate ssl certificates
```
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```
