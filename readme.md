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
