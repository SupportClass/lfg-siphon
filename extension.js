'use strict';

var EventEmitter  = require('events').EventEmitter;
var axon          = require('axon');
var rpc           = require('axon-rpc');
var req           = axon.socket('req');
var subSock       = axon.socket('sub');
var rpcClient     = new rpc.Client(req);
var equal         = require('deep-equal');

module.exports = function(nodecg) {
    if (!nodecg.bundleConfig || !Object.keys(nodecg.bundleConfig).length) {
        throw new Error('[lfg-siphon] No config found in cfg/lfg-siphon.json, aborting!');
    }

    var self     = new EventEmitter();
    var channels = nodecg.bundleConfig.channels;
    var SUB_PORT = nodecg.bundleConfig.subPort || 9455;
    var RPC_PORT = nodecg.bundleConfig.rpcPort || 9456;

    nodecg.listenFor('getChannels', function(data, cb) {
        cb(channels);
    });

    subSock.connect(SUB_PORT, '127.0.0.1');
    req.connect(RPC_PORT, '127.0.0.1');

    subSock.on('connect', function() {
        nodecg.log.info('Connected to Streen');
        channels.forEach(function(channel) {
            rpcClient.call('join', channel, function(err, alreadyJoined) {
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

    subSock.on('disconnect', function() {
        nodecg.log.warn('Disconnected from Streen');
        self.emit('disconnect');
        nodecg.sendMessage('disconnect');
    });

    var lastSub;
    subSock.on('message', function(msg) {
        var channel, data;
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
                if (channels.indexOf(data.channel) < 0) return;
                nodecg.sendMessage('chat', data);
                self.emit('chat', data);
                break;
            case 'timeout':
                data = {channel: arguments[1], username: arguments[2]};
                if (channels.indexOf(data.channel) < 0) return;
                nodecg.sendMessage('timeout', data);
                self.emit('timeout', data);
                break;
            case 'clearchat':
                channel = arguments[1];
                if (channels.indexOf(channel) < 0) return;
                nodecg.sendMessage('clearchat', channel);
                self.emit('clearchat', channel);
                break;
            case 'subscription':
                data = arguments[1];
                if (channels.indexOf(data.channel) < 0) return;
                if (equal(lastSub, data)) return;
                lastSub = data;

                // 10-30-2015: Streen now ensures that "months" is an integer.
                // The below line can be removed soon.
                if (data.months) data.months = parseInt(data.months);
                
                nodecg.sendMessage('subscription', data);
                self.emit('subscription', data);
                break;
        }
    });

    var heartbeatTimeout = setTimeout(heartbeat, 5000);
    function heartbeat() {
        rpcClient.call('heartbeat', channels, function(err, interval) {
            if (err) {
                nodecg.log.error(err.stack);
                return;
            }

            heartbeatTimeout = setTimeout(heartbeat, interval);
        });
    }

    self.timeout = function(channel, username, seconds) {
        rpcClient.call('timeout', channel, username, seconds, function(err){
            if (err) nodecg.log.error(err.stack);
        });
    };

    return self;
};
