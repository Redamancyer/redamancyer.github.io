var EventUtil = {
    addHandler: function (element, type, handler) {
        if (element.addEventListener)
            element.addEventListener(type, handler, { passive: false });
        else if (element.attachEvent)
            element.attachEvent("on" + type, handler);
        else
            element["on" + type] = handler;
    },
    removeHandler: function (element, type, handler) {
        if (element.removeEventListener)
            element.removeEventListener(type, handler, false);
        else if (element.detachEvent)
            element.detachEvent("on" + type, handler);
        else
            element["on" + type] = handler;
    },
    /**
     * 监听触摸的方向
     * @param target            要绑定监听的目标元素
     * @param isPreventDefault  是否屏蔽掉触摸滑动的默认行为（例如页面的上下滚动，缩放等）
     * @param upCallback        向上滑动的监听回调（若不关心，可以不传，或传false）
     * @param rightCallback     向右滑动的监听回调（若不关心，可以不传，或传false）
     * @param downCallback      向下滑动的监听回调（若不关心，可以不传，或传false）
     * @param leftCallback      向左滑动的监听回调（若不关心，可以不传，或传false）
     */
    listenTouchDirection: function (target, isPreventDefault) {
        this.addHandler(target, "touchstart", handleTouchEvent);
        this.addHandler(target, "touchend", handleTouchEvent);
        this.addHandler(target, "touchmove", handleTouchEvent);
        var startX;
        var startY;
        function findAncestorWithSpecificNode(element, specificNode) {
            if (!element || !specificNode) {
                return null;
            }

            if (element.classList.contains(specificNode)) {
                return element;
            }

            return findAncestorWithSpecificNode(element.parentElement, specificNode);
        }
        function handleTouchEvent(event) {
            switch (event.type) {
                case "touchstart":
                    startX = event.touches[0].pageX;
                    startY = event.touches[0].pageY;
                    break;
                case "touchend":
                    // var tagName = event.srcElement.tagName.toLowerCase();
                    // // console.log(tagName)
                    // if (tagName.startsWith('code') || tagName.startsWith('svg')) {
                    //     return;
                    // }

                    //检查是否是code和svg的后代
                    // 获取被点击的元素
                    var clickedElement = event.target;

                    // 判断是否点击了具有类名为 "lang-shell" 的 <code> 元素或其子孙节点
                    var codeElement1 = clickedElement.closest('div.mermaid');
                    if (codeElement1) {
                        // 如果点击了符合条件的元素或其子孙节点
                        // console.log('Clicked element is the desired <code> element or its descendant:', codeElement);
                        return ;
                    }
                    // 判断是否点击了具有类名为 "lang-shell" 的 <code> 元素或其子孙节点
                    var codeElement = clickedElement.closest('code.lang-shell');
                    if (codeElement) {
                        // 如果点击了符合条件的元素或其子孙节点
                        // console.log('Clicked element is the desired <code> element or its descendant:', codeElement);
                        return ;
                    }


                    //判断是否是主界面的元素

                    var specificNodeClass = 'sidebar'; // 特定节点的类名
                    var isMain = true;

                    // 调用递归函数查找包含特定节点的祖先节点
                    var ancestorWithSpecificNode = findAncestorWithSpecificNode(event.srcElement, specificNodeClass);

                    if (ancestorWithSpecificNode) {
                        // console.log('Ancestor with specific node found:', ancestorWithSpecificNode);
                        isMain = false;
                    }


                    var spanX = event.changedTouches[0].pageX - startX;
                    var spanY = event.changedTouches[0].pageY - startY;

                    if (Math.abs(spanX) > Math.abs(spanY)) {      //认定为水平方向滑动
                        var button = document.querySelector('.sidebar-toggle');
                        if (spanX > 30 && isMain) {         //向右
                            // console.log('right' )
                            // 触发按钮的点击事件
                            button.click();
                        } else if (spanX < -30 && !isMain) { //向左
                            // console.log('left')
                            button.click();
                        }
                    }
                    break;
                case "touchmove":
                    //阻止默认行为
                    if (isPreventDefault)
                        event.preventDefault();
                    break;
            }
        }
    }
};
// var sidebarElement = document.querySelector('aside.sidebar');
// var mainElement = document.querySelector('section.content');
// console.log(sidebarElement)
// console.log(mainElement)
EventUtil.listenTouchDirection(document, false);
// EventUtil.listenTouchDirection(mainElement, false);


