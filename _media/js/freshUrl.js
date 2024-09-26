// 获取当前时间戳
var timestamp = new Date().getTime();

// 获取当前页面 URL
var currentUrl = window.location.href;

// 检查当前 URL 是否已经包含查询参数
if (currentUrl.indexOf('t=') === -1) {
    // 如果 URL 中没有时间戳参数，则添加时间戳参数
    var separator = currentUrl.indexOf('?') !== -1 ? '&' : '?';
    var newUrl = currentUrl + separator + 't=' + timestamp;

    // 设置页面链接为新 URL
    window.location.href = newUrl;
}