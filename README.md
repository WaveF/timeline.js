# Timeline.js

一个用于动画的时间轴编辑器组件

![Timeline](https://ax.minicg.com/images/timeline-js.jpg)

演示案例:
https://wavef.gitee.io/timeline.js/examples/cssAnimation2.html

项目网站:
http://marcinignac.com/blog/timeline-js/

原作者：
[Marcin Ignac](https://github.com/vorg)

改版：
[WaveF](https://gitee.com/wavef)


## 使用

### 1. 动画
```html
<script src="timeline/timeline.js"></script>
<script>
  // 注意！在这个 Fork 版本里我已经将 anim() 方法挂到了 Timeline 对象下
  // 因此不再有全局的 anim 方法，只能通过 Timeline 来访问 anim
  const { anim } = Timeline;
  anim(target).to(delay, {property:value,...}, duration, easing);
</script>
```

指定`target`后你可以链式引用任意数量的动画，如果希望多个属性动画平行进行，只需要在同一目标上再次使用`anim()`方法
#### 1.1 基本用法

- 将目标的`x`属性在`1`秒内移动到`100`，并使用`Quadratic.EaseIn`缓动，
- 停留5秒，再在`2`秒内移动回`0`

```js
anim(sprite)
  .to({x:100}, 1, Timeline.Easing.Quadratic.EaseIn)
  .to(5, {x:0}, 2);
```

#### 1.2 平行动画

同时驱动`rect`元素的宽和高，使其数值在`3`秒内变化到`50`和`75`，
并让其透明度一起变化，数值在`4`秒内变化到`0`

```js
anim(rect).to({width:50, height:75}, 3);
anim(rect).to({opacity:0}, 4);
```

### 2. 时间轴面板

```html
<script src="timeline/gui.js"></script>
<script>
  const { anim } = Timeline;
  anim(targetName, target).to(delay, {property:value,...}, duration, easing);
</script>
```

在已创建动画的情况下，添加`gui.js`会在页面底部启用**时间轴面板**，并为每个属性动画创建一条编辑轨道。在时间轴面板上可以点击和拖动关键帧对动画进行调整，在轨道空白区域上双击可以创建新的关键帧，点击**导出按钮**则可以拷贝代码；
> 注意：在此 Fork 版本中，需要双击关键帧进行编辑，并且现在支持框选多个关键帧进行拖动

在使用**时间轴面板**时，我们需要在`anim()`方法中指定动画目标的别名（这个别名也会被用于导出代码），
每个使用`to()`驱动的属性，都可以在时间轴面板中找到其轨道；

动画数据会自动记录在`localStorage`中，这样在刷新页面时动画将仍然能进行播放，被缓存的同名动画将会忽略`to()`方法，这意味着你可能即便修改了代码动画也无任何变化，但你可以手动清除掉缓存。
> 注意：在此 Fork 版本中我添加了一个`Timeline.clear()`方法用于清除已被缓存的动画


#### 2.1 时间轴示例

将`rect`元素以指定的别名`(rect)`显示在时间轴上，并让其`x`和`y`属性维持原值，
由于别名将被用于代码导出，因此强烈建议使用元素的唯一`id`作为其别名

```js
anim("rect", rect).to({x:rect.x, y:rect.y});
```


### 3. Node.js

首先从`npm`安装 `timeline-js`

`npm install timeline-js`

然后这样使用

```js
// 注意：Fork版将模块名称从 Timeline 改为了 TimelineJS
const TimelineJS = require('timeline-js');
const Timeline = TimelineJS.Timeline;
const { anim } = Timeline;
anim(target).to(delay, {property:value,...}, duration, easing);
```