'use strict';

const EventEmitter = require('events').EventEmitter;
const axon = require('axon');
const rpc = require('axon-rpc');
const req = axon.socket('req');
const subSock = axon.socket('sub');
const rpcClient = new rpc.Client(req);
const equal = require('deep-equal');

module.exports = function (nodecg) {
	if (!nodecg.bundleConfig || !Object.keys(nodecg.bundleConfig).length) {
		throw new Error('[lfg-siphon] No config found in cfg/lfg-siphon.json, aborting!');
	}

	const self = new EventEmitter();
	const channels = nodecg.bundleConfig.channels;
	const SUB_PORT = nodecg.bundleConfig.subPort || 9455;
	const RPC_PORT = nodecg.bundleConfig.rpcPort || 9456;

	nodecg.listenFor('getChannels', (data, cb) => cb(channels));

	subSock.connect(SUB_PORT, '127.0.0.1');
	req.connect(RPC_PORT, '127.0.0.1');

	subSock.on('connect', () => {
		nodecg.log.info('Connected to Streen');
		channels.forEach(channel => {
			rpcClient.call('join', channel, (err, alreadyJoined) => {
				if (err) {
					nodecg.log.error(err.stack);
					return;
				}

				if (alreadyJoined) {
					nodecg.log.info('Streen already in channel:', alreadyJoined);
				} else {
					nodecg.log.info('Joined channel:', channel);
					nodecg.sendMessage('join', channel);
					self.emit('join', channel);
				}
			});
		});
	});

	subSock.on('disconnect', () => {
		nodecg.log.warn('Disconnected from Streen');
		self.emit('disconnect');
		nodecg.sendMessage('disconnect');
	});

	let lastSub;
	subSock.on('message', msg => {
		let channel;
		let data;
		switch (msg.toString()) {
			case 'connected':
				nodecg.log.info('Streen connected to Twitch Chat');
				break;
			case 'disconnected':
				nodecg.log.info('Streen disconnected from Twitch Chat');
				break;
			case 'chat':
				data = {
					channel: arguments[1],
					user: arguments[2],
					message: arguments[3],
					self: arguments[4]
				};
				if (channels.indexOf(data.channel) < 0) {
					return;
				}
				nodecg.sendMessage('chat', data);
				self.emit('chat', data);
				break;
			case 'timeout':
				data = {channel: arguments[1], username: arguments[2]};
				if (channels.indexOf(data.channel) < 0) {
					return;
				}
				nodecg.sendMessage('timeout', data);
				self.emit('timeout', data);
				break;
			case 'clearchat':
				channel = arguments[1];
				if (channels.indexOf(channel) < 0) {
					return;
				}
				nodecg.sendMessage('clearchat', channel);
				self.emit('clearchat', channel);
				break;
			case 'subscription':
				data = arguments[1];
				if (channels.indexOf(data.channel) < 0) {
					return;
				}
				if (equal(lastSub, data)) {
					return;
				}
				lastSub = data;
				nodecg.sendMessage('subscription', data);
				self.emit('subscription', data);
				break;
			default:
				/* do nothing */
		}
	});

	let heartbeatTimeout = setTimeout(heartbeat, 5000);
	let heartbeatResponseTimeout;
	let lastHeartbeatInterval = 5000;

	function heartbeat() {
		// If we don't hear back from Streen in 1000ms, we assume Streen is down and keep trying.
		heartbeatResponseTimeout = setTimeout(handleHeartbeatTimeout, 1000);

		// Emit the heartbeat, and schedule the next one based on Streen's response.
		rpcClient.call('heartbeat', channels, (err, interval) => {
			if (err) {
				nodecg.log.error(err.stack);
			}

			const intervalDuration = interval || lastHeartbeatInterval;
			clearTimeout(heartbeatResponseTimeout);
			clearTimeout(heartbeatTimeout);
			heartbeatTimeout = setTimeout(heartbeat, intervalDuration);
			lastHeartbeatInterval = intervalDuration;
		});
	}

	function handleHeartbeatTimeout() {
		heartbeatTimeout = setTimeout(heartbeat, lastHeartbeatInterval);
	}

	self.say = function (channel, message, callback) {
		rpcClient.call('say', channel, message, () => {
			if (typeof callback === 'function') {
				callback.apply(callback, arguments);
			}
		});
	};

	self.timeout = function (channel, username, seconds, callback) {
		rpcClient.call('timeout', channel, username, seconds, () => {
			if (typeof callback === 'function') {
				callback.apply(callback, arguments);
			}
		});
	};

	self.mods = function (channel, callback) {
		callback = callback || function () {};
		rpcClient.call('mods', channel, () => {
			if (typeof callback === 'function') {
				callback.apply(callback, arguments);
			}
		});
	};

	return self;
};
