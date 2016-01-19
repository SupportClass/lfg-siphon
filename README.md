#lfg-siphon
This is a [NodeCG](http://github.com/nodecg/nodecg) bundle.

This bundle is an interface to [Streen](https://github.com/SupportClass/streen), an IPC wrapper for 
[tmi.js](https://github.com/Schmoopiie/tmi.js). 
Together, Streen and lfg-siphon enable one single tmi.js instance to power multiple NodeCG instances.

lfg-siphon also provides a custom `twitch-chat` Polymer component which other bundles can easily include in their views
to get embedded Twitch Chat.

## Installation
- Install to `nodecg/bundles/lfg-siphon`
- Create `nodecg/cfg/lfg-siphon.json` with a list of Twitch chat channels to listen to.
- To conserve resources, lfg-siphon will not emits events for normal chat messages by default.
 To enable, set `chat` to `true`.

### Config Example
```json
{
  "channels": ["dansgaming", "giantwaffle", "professorbroman"],
  "chat": true
}
```

Additionally, there are optional properties `subPort` and `rpcPort`. These default to the same values as Streen.

## methods
From an extension:
``` js
var siphon = nodecg.extensions['lfg-siphon'];
```

### siphon.say(channel, message)
Send a message to a chat channel.
See the corresponding tmi.js docs for more info ([link](http://www.tmijs.org/docs/Commands.md#say)).

### siphon.timeout(channel, username, seconds)
Times out a user on a channel for the given number of seconds.
See the corresponding tmi.js docs for more info ([link](http://www.tmijs.org/docs/Commands.html#timeout)).

## Events
### siphon.on('connect', function () {})
When connected to Streen.

### siphon.on('disconnect', function () {})
Emitted when connected to Streen.

### siphon.on('chat', function (data) {})
Emitted on every chat message. `data` has the properties from tmi.js's `chat` event
 ([docs](http://www.tmijs.org/docs/Events.html#chat)).
 
### siphon.on('timeout', function (data) {})
Emitted when a user is timed out. `data` has the properties from tmi.js's `timeout` event
 ([docs](http://www.tmijs.org/docs/Events.html#timeout)).
 
### siphon.on('clearchat', function (channel) {})
Emitted when a mod clears the chat.

### siphon.on('subscription', function (data) {})
Emitted on both subscriptions and sub anniversaries (resubs). `data` has the following properties:
```js
data.username // Twitch username of the subscriber or resub
data.channel  // What channel was subscribed to
data.resub    // Boolean, whether or not this is a resub
data.months   // If this is a resub, this will be the number of months they have been subscribed for
data.ts       // Unix timestamp (in milliseconds)
```
## Usage
### As a dashboard panel
If you simply want a list of recent subs on your dashboard, you are done.

### In other bundles' view pages and dashboard panels
If you would like to use this data in another bundle, add listen for the desired events in your view/panel.

Example:
```javascript
nodecg.listenFor('subscription', 'lfg-siphon', function(data) {
    console.log(data);
});
```

To add a Twitch Chat embed, import the custom element and add an instance of it to your HTML:
```html
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    
    <!-- Import the custom twitch-chat element from lfg-siphon -->
    <link rel="import" href="/view/lfg-siphon/twitch-chat.html">
</head>
<body>
    <!-- Add an instance of it to the DOM -->
    <twitch-chat channel="langeh"></twitch-chat>
</body>
</html>
```

### In other bundles' extensions
If you want to use chat events in another bundle's extension,
add `lfg-siphon` as a `bundleDependency` in your bundle's [`nodecg.json`](https://github.com/nodecg/nodecg/wiki/nodecg.json)
Then listen to the desired events in your extension.

Example:
```javascript
var siphon = nodecg.extensions['lfg-siphon'];
siphon.on('subscription', function (data) {
    console.log(data);
});
```

## Special Thanks
 - Schmoopiie, whose [tmi.js](https://github.com/Schmoopiie/tmi.js) library makes this all possible
 - Night, from whose [OBS Chat](https://nightdev.com/obschat/) embed service the `twitch-chat` element borrows code heavily.

## License
lfg-siphon is provided under the MIT license, which is available to read in the [LICENSE][] file.
[license]: LICENSE
