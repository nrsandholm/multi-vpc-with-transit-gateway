const dgram = require('dgram');

const server = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');

const serverPort = parseInt(process.env.SERVER_PORT, 10);
const targetHost = process.env.TARGET_HOST;
const targetPort = parseInt(process.env.TARGET_PORT, 10);
const initialDelay = parseInt(process.env.INIT_DELAY, 10) || 0;
const responseDelay = parseInt(process.env.RESPONSE_DELAY, 10) || 0;

server
  .on('message', (message) => {
    clearTimeout(greeting);

    console.log(message.toString('utf8'));

    setTimeout(() => {
      client.send('... hello?', targetPort, targetHost, (error) => {
        if (error) {
          console.log('client error', error);
        }
      });
    }, responseDelay);
  })
  .on('error', (error) => {
    console.log('server error', error);
  })
  .on('listening', () => {
    var address = server.address();
    console.log(`server listening at ${address.address}:${address.port}`);
  })
  .bind(serverPort);

const greeting = setTimeout(() => {
  client.send('Hello?', targetPort, targetHost, (error) => {
    if (error) {
      console.log('client error', error);
    }
  });
}, initialDelay);