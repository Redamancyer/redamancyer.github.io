function initResizableSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');

    let isResizing = false;

    sidebar.addEventListener('mousemove', function(e) {
        if (e.offsetX > sidebar.clientWidth - 5) {
            sidebar.style.cursor = 'ew-resize';
        } else {
            sidebar.style.cursor = 'default';
        }
    });

    sidebar.addEventListener('mousedown', function(e) {
        document.body.style.userSelect = 'none'; // 禁用文本选择
        if (e.offsetX > sidebar.clientWidth - 5) {
            isResizing = true;
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', function() {
            isResizing = false;
            document.body.style.userSelect = ''; // 启用文本选择
            document.removeEventListener('mousemove', onMouseMove);
        });
    });

    function onMouseMove(e) {
        if (isResizing) {
            let width = e.clientX - sidebar.getBoundingClientRect().left;
            sidebar.style.setProperty('--sidebar-width', width + 'px');
            content.style.marginLeft = width + 'px';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initResizableSidebar();
});