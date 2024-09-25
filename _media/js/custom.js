function initResizableSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');

    let isResizing = false;

    sidebar.addEventListener('mousemove', function(e) {
        if (e.offsetX > sidebar.clientWidth - 10) {
            sidebar.style.cursor = 'ew-resize';
        } else {
            sidebar.style.cursor = 'default';
        }
    });

    sidebar.addEventListener('mousedown', function(e) {
        if (e.offsetX > sidebar.clientWidth - 10) {
            isResizing = true;
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', function() {
            isResizing = false;
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