'use strict';

const EventEmitter = require('events').EventEmitter;
const equal = require('deep-equal');

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
					nodecg.log.error(err);
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

		const newTops = compareTops(cheer, topCheers.value);
		let top = null;
		Object.keys(newTops).forEach(period => {
			if (newTops[period] !== null) {
				topCheers.value[period] = newTops[period];
				top = top ? top : period; // Don't touch top if it's already set
			}
		});
		cheer.top = top;

		// These come as a string for some reason???
		cheer.userstate.bits = parseInt(cheer.userstate.bits, 10);

		if (equal(lastCheer, cheer)) {
			return;
		}

		lastCheer = cheer;
		nodecg.sendMessage('cheer', cheer);
		self.emit('cheer', cheer);
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
				nodecg.log.error(err);
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
		topCheers.value[period] = {};
	};

	nodecg.listenFor('resetPeriod', self.resetPeriod);

	function compareTops(cheer, tops) {
		const ret = {monthly: null, daily: null};

		Object.keys(tops).forEach(period => {
			if (!tops[period].amount || cheer.amount > tops[period].amount) {
				ret[period] = cheer;
			}
		});

		return ret;
	}

	return self;
};
