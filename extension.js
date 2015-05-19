'use strict';

var os            = require('os');
var EventEmitter  = require('events').EventEmitter;
var ipc           = require('node-ipc');
var equal         = require('deep-equal');
ipc.config.id     = 'siphon';
ipc.config.retry  = 1500;
ipc.config.silent = true;

module.exports = function(nodecg) {
    if (!Object.keys(nodecg.bundleConfig).length) {
        throw new Error('[lfg-siphon] No config found in cfg/lfg-siphon.json, aborting!');
    }

    var emitter  = new EventEmitter();
    var channels = nodecg.bundleConfig.channels;
    var connectFn = os.platform() === 'win32' ? ipc.connectToNet : ipc.connectTo;
    connectFn('streen', function () {
        ipc.of.streen.on('connect', function () {
            nodecg.log.info('Connected to Streen');
            ipc.of.streen.emit('join', channels);
        });

        ipc.of.streen.on('disconnect', function () {
            nodecg.log.warn('Disconnected from Streen');
        });

        ipc.of.streen.on('joined', function (channel) {
            nodecg.log.info('Joined channel:', channel);
        });

        var lastSub;
        ipc.of.streen.on('subscription', function (data) {
            if (channels.indexOf(data.channel) < 0) return;
            if (equal(lastSub, data)) return;
            lastSub = data;
            emitter.emit('subscription', data);
            nodecg.sendMessage('subscription', data);
        });

        if (nodecg.bundleConfig.chat) {
            ipc.of.streen.on('chat', function (data) {
                if (channels.indexOf(data.channel) < 0) return;
                emitter.emit('chat', data.channel, data.user, data.message);
            });
        } else {
            nodecg.log.info('Property "chat" in config is "false", ignoring chat');
        }
    });

    return emitter;
};
