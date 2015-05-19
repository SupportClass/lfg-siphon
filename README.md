#lfg-siphon
This is a [NodeCG](http://github.com/nodecg/nodecg) bundle.

This bundle is an interface to [Streen](https://github.com/SupportClass/streen), an IPC wrapper for [twitch-irc](https://github.com/twitch-irc/twitch-irc). 
Together, Streen and lfg-siphon enable one single twitch-irc instance to power multiple NodeCG instances.

## Installation
- Install to `nodecg/bundles/lfg-siphon`
- Create `nodecg/cfg/lfg-siphon.json` with a list of Twitch chat channels to listen to.
- By default, lfg-siphon will not expose chat activity, so as to conserve resources. To enable, set `chat` to `true`.

### Config Example
```json
{
  "channels": ["dansgaming", "giantwaffle", "professorbroman"],
  "chat": true
}
```

## Usage
### As a dashboard panel
If you simply want a list of recent subs on your dashboard, you are done.

### In other bundles' view pages and dashboard panels
If you would like to use this data in another bundle, add the following code to your view/panel:
```javascript
nodecg.listenFor('subscription', 'lfg-siphon', function(data) {
    console.log(data);
});
```

### In other bundles' extensions
If you want to use subscription events in another bundle's extension,
add `lfg-siphon` as a `bundleDependency` in your bundle's [`nodecg.json`](https://github.com/nodecg/nodecg/wiki/nodecg.json)

Then add the following code:
```javascript
var siphon = nodecg.extensions['lfg-siphon'];
siphon.on('subscription', function subscription(data) {
    // Do work.
    // data.username = Twitch username of subscription
    // data.channel  = What channel was subscribed to
    // data.resub    = Boolean, whether or not this is a resub
    // data.months   = If this is a resub, this will be the number of months they have been subscribed for
    // data.ts       = Unix timestamp (in milliseconds)
});
```

### License
lfg-siphon is provided under the MIT license, which is available to read in the [LICENSE][] file.
[license]: LICENSE
