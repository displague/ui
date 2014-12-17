module.exports = function(app, options) {
  var path = require('path');
  var ForeverAgent = require('forever-agent');
  var HttpProxy = require('http-proxy');
  var proxyPath = '/v1';
  var httpServer = options.httpServer;

  var config = require('../../config/environment')().APP;
  var proxy = HttpProxy.createProxyServer({
    ws: true,
    xfwd: true,
    agent: new ForeverAgent({})
  });

  console.log('Proxying to', config.endpoint);

  app.use(proxyPath, function(req, res, next){
    // include root path in proxied request
    req.url = path.join(proxyPath, req.url);

    req.headers['user-agent'] = 'Rancher UI';
    delete req.headers['cookie'];

    console.log('Proxy', req.method, 'to', req.url);
    proxy.web(req, res, {target: config.endpoint});
  });

  proxy.on('error', function onProxyError(err, req, res) {
    console.log('Proxy Error:', err);
    var error = {
      type: 'error',
      status: 500,
      code: 'ProxyError',
      message: 'Error connecting to proxy',
      detail: err.toString()
    }

    if ( !req.upgrade )
    {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(error));
    }
  });

  httpServer.on('upgrade', function proxyWsRequest(req, socket, head) {
    proxy.ws(req, socket, head, {target: config.endpoint});
  });
};
