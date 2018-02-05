# proxyism

quickly write a proxy with behaviour for debugging production systems

```js
# myproxy.js

var proxy = require('proxyism');

// respond with local files
proxy.get('/some.js', proxy.file('some-other.js'));

// delay requests
proxy.getImage(proxy.delay(2000));
```

# HSTS

Sites that use HSTS, or the Strict-Transport-Security header, will only work if their SSL certificates are valid, which ordinarily means you won't be able to see them using this proxy - however, you can remove the HSTS block by following these instructions: [How to clear HSTS settings in Chrome and Firefox](https://www.thesslstore.com/blog/clear-hsts-settings-chrome-firefox/). Then you should be able to click through the warnings and access the site.
