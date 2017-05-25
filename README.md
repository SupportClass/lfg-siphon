# lfg-siphon [![Build Status](https://travis-ci.org/SupportClass/lfg-siphon.svg?branch=master)](https://travis-ci.org/SupportClass/lfg-siphon)
This is a [NodeCG](http://github.com/nodecg/nodecg) bundle.

This bundle is an interface to [Streen](https://github.com/SupportClass/streen), a centralized WebSocket wrapper for 
[tmi.js](https://github.com/Schmoopiie/tmi.js). 
Together, Streen and lfg-siphon enable one single tmi.js instance to power multiple NodeCG instances across many servers,
containers, etc.

This bundle integrates with [`lfg-nucleus`](https://github.com/SupportClass/lfg-nucleus).

## Installation
- Install to `nodecg/bundles/lfg-siphon`
- Create `nodecg/cfg/lfg-siphon.json` with a list of Twitch chat channels to listen to.
- Configure a connection to your instance of [Streen](https://github.com/SupportClass/streen) in `nodecg/cfg/lfg-siphon.json`.

### Config Example
```json
{
	"channels": ["dansgaming", "giantwaffle", "professorbroman"],
	"streen": {
		"url": "https://your-streen-deployment.herokuapp.com/",
		"secretKey": "your_super_secret_streen_key"
	}
}
```

## Usage
### As a dashboard panel
If you simply want a list of recent subs on your dashboard, you are done.

### In other bundles' view pages and dashboard panels
If you would like to use this data in another bundle, add listen for the desired events in your view/panel.

Example:
```javascript
nodecg.listenFor('subscription', 'lfg-siphon', data => {
    console.log(data);
});

nodecg.listenFor('cheer', 'lfg-siphon', data => {
    console.log(data);
});
```

### In other bundles' extensions
If you want to use chat events in another bundle's extension,
add `lfg-siphon` as a `bundleDependency` in your bundle's [`nodecg.json`](https://github.com/nodecg/nodecg/wiki/nodecg.json)
Then listen to the desired events in your extension.

Example:
```javascript
const siphon = nodecg.extensions['lfg-siphon'];
siphon.on('subscription', data => {
    console.log(data);
});

siphon.on('cheer', data => {
    console.log(data);
});
```

## API
From an extension _only_ (will not work in graphics or dashboard panels):
``` js
const siphon = nodecg.extensions['lfg-siphon'];
```

#### siphon.say(channel, message)
Send a message to a chat channel.
See the corresponding tmi.js docs for more info ([link](http://www.tmijs.org/docs/Commands.md#say)).

### siphon.timeout(channel, username, seconds)
Times out a user on a channel for the given number of seconds.
See the corresponding tmi.js docs for more info ([link](http://www.tmijs.org/docs/Commands.html#timeout)).

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

### siphon.on('cheer', function (data) {})
Emitted when a user sends a Cheer to a channel that this instance of lfg-siphon is listening to. 
`data` has the following properties:
```js
data.channel   // What channel this Cheer occurred in
data.userstate // An object containing many details about this Cheer. `userstate.bits` will tell you the amount of bits cheered.
data.message   // The message, if any, that accompanied the cheer.
data.ts        // Unix timestamp (in milliseconds)
```

## Special Thanks
 - Schmoopiie, whose [tmi.js](https://github.com/Schmoopiie/tmi.js) library makes this all possible
 - Night, from whose [OBS Chat](https://nightdev.com/obschat/) embed service the `twitch-chat` element borrows code heavily.

## License
lfg-siphon is provided under the MIT license, which is available to read in the [LICENSE][] file.
[license]: LICENSE
