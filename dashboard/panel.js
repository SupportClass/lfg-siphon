'use strict';

nodecg.listenFor('subscription', function (data) {
    var alert = $('.template.sub').clone().removeClass('template').css('display', 'block');
    alert.find('.name').html(data.name);
    if (data.resub) {
        alert.removeClass('alert-info');
        alert.addClass('bg-primary');
        alert.find('.resub').html(' - Resub ×' + data.months);
    }

    $('#lfg-siphon_list').prepend(alert);
});

$('#lfg-siphon_clearall').click(function() {
    $('#lfg-siphon_list .sub').remove();
});
