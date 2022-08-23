const { log, clear } = top.console;
clear();

/**
 * 核心库　http://marcinignac.com/blog/timeline-js/
 */

// 清除缓存的动画
// 不知道为什么它要把动画写到浏览器缓存, 已缓存的动画不会接受新的to()方法, 最好清理一下不然调试时代码改了数值也看不见
localStorage.setItem('timeline.js.data.Global', '')


// 设置动画无限循环
const tl = Timeline.getGlobalInstance()
tl.loop(-1)
tl.fps = 24 /* 这玩意更像是动画时间缩放,因为无论怎样动画看上去都是60fps的,只是动画速度变化了 */


// 动画参数格式(见animProps)
const box = document.querySelector('#box')
const animProps = {
    element: box,
    y: 0,
    angle: 0
}


// 添加关键帧, 第一个参数是轨道名, 同名轨道不会再次接受to()方法, 需要手动清理localStorage(见上)
anim('box', animProps)
    .to({'y':50}, 0)
    .to({'y':400}, 1, Timeline.Easing.Cubic.EaseIn)
    .to({'y':50}, 1, Timeline.Easing.Cubic.EaseOut)
anim('box', animProps)
    .to({'angle':0},0)
    .to({'angle':360}, 1, Timeline.Easing.Cubic.EaseIn)
    .to({'angle':720}, 1, Timeline.Easing.Cubic.EaseOut)


// 打印数值变化
// setInterval(`log(animProps)`, 500)


// 自行实现动画渲染
// timeline-js 不与动画耦合,只驱动数值,因此可用于 DOM/SVG/3D 等不同场景,主要是它还带了个时间轴面板!!
rAF();
function rAF() {
    animProps.element.style.top = `${animProps.y}px`
    animProps.element.style.transform = `rotate(${animProps.angle}deg)`
    requestAnimationFrame(rAF, document.body)
}


// 按钮事件
const btns = document.querySelectorAll('.btn')
btns.forEach(btn => {
    btn.addEventListener('click', e => {
        tl.container.classList.add('timeline')
        let name = e.currentTarget.className
        if (name.includes('play')) { tl.play() }
        else if (name.includes('pause')) { tl.pause() }
        else if (name.includes('stop')) { tl.stop() }
        else if (name.includes('toggle')) {
            tl.container.classList.toggle('hide-tl')
        }
    })
})