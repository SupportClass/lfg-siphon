'use strict';

const DEFAULT_CHEER = {
	channel: 'none',
	message: '',
	userstate: {
		bits: 0,
		'display-name': 'N/A'
	}
};

const EventEmitter = require('events');
const equal = require('deep-equal');
const clone = require('clone');

module.exports = function (nodecg) {
	const socket = require('socket.io-client')(nodecg.bundleConfig.streen.url);
	const self = new EventEmitter();
	const channels = nodecg.bundleConfig.channels;
	const topCheers = nodecg.Replicant('topCheers');

	nodecg.listenFor('getChannels', (data, cb) => cb(channels));

	socket.on('connect', () => {
		nodecg.log.info('Connected to Streen');

		socket.emit('authenticate', nodecg.bundleConfig.streen.secretKey, errorMsg => {
			if (errorMsg) {
				throw new Error(`Failed to authenticate with streen: "${errorMsg}"`);
			}
		});

		channels.forEach(channel => {
			socket.emit('join', channel, (err, alreadyJoined) => {
				if (err) {
					nodecg.log.error(`Failed to join ${channel}:`, err);
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

	socket.on('disconnect', () => {
		nodecg.log.warn('Disconnected from Streen');
		self.emit('disconnect');
		nodecg.sendMessage('disconnect');
	});

	socket.on('connected', () => {
		nodecg.log.info('Streen connected to Twitch Chat');
	});

	socket.on('disconnected', () => {
		nodecg.log.info('Streen disconnected from Twitch Chat');
	});

	socket.on('chat', data => {
		if (channels.indexOf(data.channel) < 0) {
			return;
		}

		nodecg.sendMessage('chat', data);
		self.emit('chat', data);
	});

	socket.on('timeout', data => {
		if (channels.indexOf(data.channel) < 0) {
			return;
		}

		nodecg.sendMessage('timeout', data);
		self.emit('timeout', data);
	});

	socket.on('clearchat', data => {
		if (channels.indexOf(data.channel) < 0) {
			return;
		}

		nodecg.sendMessage('clearchat', data.channel);
		self.emit('clearchat', data.channel);
	});

	let lastSub;
	socket.on('subscription', data => {
		if (channels.indexOf(data.channel) < 0) {
			return;
		}

		if (equal(lastSub, data)) {
			return;
		}

		lastSub = data;
		nodecg.sendMessage('subscription', data);
		self.emit('subscription', data);
	});

	let lastCheer;
	socket.on('cheer', cheer => {
		if (channels.indexOf(cheer.channel) < 0) {
			return;
		}

		// These come as a string for some reason???
		// Also: very important that this conversion happens _before_ we compareTops!
		cheer.userstate.bits = parseInt(cheer.userstate.bits, 10);

		const newTops = compareTops(cheer, topCheers.value);
		let top = null;
		Object.keys(newTops).forEach(period => {
			if (newTops[period] !== null) {
				try {
					topCheers.value[period] = newTops[period];
					top = top ? top : period; // Don't touch top if it's already set
				} catch (e) {
					nodecg.log.error('Failed to assign top cheer for period "%s", cheer object: %o\n Error:',
						period, newTops[period], e);
				}
			}
		});
		cheer.top = top;

		if (equal(lastCheer, cheer)) {
			return;
		}

		lastCheer = cheer;
		nodecg.sendMessage('cheer', cheer);
		self.emit('cheer', cheer);
	});

	socket.on('submysterygift', mysterygift => {
		if (channels.indexOf(mysterygift.channel) < 0) {
			return;
		}

		nodecg.emit('submysterygift', mysterygift);
		self.emit('submysterygift', mysterygift);
	});

	socket.on('subgift', subgift => {
		if (channels.indexOf(subgift.channel) < 0) {
			return;
		}

		nodecg.emit('subgift', subgift);
		self.emit('subgift', subgift);
	});

	socket.on('hosted', host => {
		if (channels.indexOf(host.channel) < 0) {
			return;
		}

		nodecg.emit('hosted', host);
		self.emit('hosted', host);
	});

	let heartbeatTimeout = setTimeout(heartbeat, 5000);
	let heartbeatResponseTimeout;
	let lastHeartbeatInterval = 5000;

	function heartbeat() {
		// If we don't hear back from Streen in 1000ms, we assume Streen is down and keep trying.
		heartbeatResponseTimeout = setTimeout(handleHeartbeatTimeout, 1000);

		// Emit the heartbeat, and schedule the next one based on Streen's response.
		socket.emit('heartbeat', channels, (err, interval) => {
			if (err) {
				nodecg.log.error('Heartbeat failed:', err);
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
		socket.emit('say', channel, message, function () {
			if (typeof callback === 'function') {
				callback.apply(callback, arguments);
			}
		});
	};

	self.timeout = function (channel, username, seconds, callback) {
		socket.emit('timeout', channel, username, seconds, function () {
			if (typeof callback === 'function') {
				callback.apply(callback, arguments);
			}
		});
	};

	self.mods = function (channel, callback) {
		callback = callback || function () {};
		socket.emit('mods', channel, function () {
			if (typeof callback === 'function') {
				callback.apply(callback, arguments);
			}
		});
	};

	self.resetPeriod = function (period) {
		topCheers.value[period] = clone(DEFAULT_CHEER);
	};

	nodecg.listenFor('resetPeriod', self.resetPeriod);

	function compareTops(cheer, tops) {
		const ret = clone(tops);

		Object.keys(tops).forEach(period => {
			if (!tops[period] || !tops[period].userstate || cheer.userstate.bits > tops[period].userstate.bits) {
				ret[period] = cheer;
			}
		});

		return ret;
	}

	return self;
};
