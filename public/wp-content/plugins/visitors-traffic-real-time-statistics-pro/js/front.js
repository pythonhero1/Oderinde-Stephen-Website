var pageid = ahc_ajax_front.page_id;
var page_id = (pageid.length > 0) ? pageid : ''; 
var pagetitle = ahc_ajax_front.page_title;
var page_title = (pagetitle.length > 0) ? pagetitle : ''; 
var posttype = ahc_ajax_front.post_type;
var post_type = (posttype.length > 0) ? posttype : ''; 
var referer = document.referrer;
var useragent = window.navigator.userAgent;
var servername = location.hostname;
var hostname = location.host;
var request_uri = location.pathname.substring(1);
// الـ query string يحمل معاملات الحملة (utm_source/utm_medium/...) — نرسله
// للسيرفر ليتمكّن من تحديد مصدر الزيارة من الحملة وليس فقط من الـ referer.
var page_query = location.search;

var xhttp = new XMLHttpRequest();

xhttp.open("POST", ahc_ajax_front.ajax_url, true);
xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
xhttp.send("action=ahcpro_track_visitor" +
    "&page_id=" + encodeURIComponent(page_id) +
    "&page_title=" + encodeURIComponent(page_title) +
    "&post_type=" + encodeURIComponent(post_type) +
    "&referer=" + encodeURIComponent(referer) +
    "&useragent=" + encodeURIComponent(useragent) +
    "&servername=" + encodeURIComponent(servername) +
    "&hostname=" + encodeURIComponent(hostname) +
    "&page_query=" + encodeURIComponent(page_query) +
    "&request_uri=" + encodeURIComponent(request_uri));

// ============================================================
// WordPress Heartbeat API integration
// يضيف IP الزائر على كل heartbeat يرسله WordPress تلقائياً
// ============================================================
(function() {
    function attachHeartbeat() {
        if (typeof jQuery === 'undefined') {
            setTimeout(attachHeartbeat, 200);
            return;
        }

        jQuery(document).on('heartbeat-send.ahcpro', function(event, data) {
            if (typeof ahc_ajax_front !== 'undefined' && ahc_ajax_front.visitor_ip) {
                data['ahcpro_heartbeat_ip'] = ahc_ajax_front.visitor_ip;
            }
        });

        // إبقاء الـ heartbeat على الإعداد القياسي (كل 60 ثانية) بدل fast (15 ثانية)
        // لتقليل الضغط على السيرفر وقاعدة البيانات تحت الترافيك العالي.
        if (typeof wp !== 'undefined' && wp.heartbeat && typeof wp.heartbeat.interval === 'function') {
            wp.heartbeat.interval('standard');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachHeartbeat);
    } else {
        attachHeartbeat();
    }
})();
