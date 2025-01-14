/**
 * Timeline.js
 * A compact JavaScript animation library with a GUI timeline for fast editing.
 * 
 * v0.2 - Forked by WaveF (wavef@qq.com) / 2022-08-26
 * v0.1 - Created by Marcin Ignac (http://marcinignac.com) / 2011-05-01
 */

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

Timeline.prototype.initGUI = function() {
  var self = this;

  this.trackLabelWidth = 108;
  this.trackLabelHeight = 20;
  this.tracksScrollWidth = 16;
  this.tracksScrollHeight = 0;
  this.tracksScrollThumbPos = 0;
  this.tracksScrollThumbHeight = 0;
  this.tracksScrollY = 0;
  this.timeScrollWidth = 0;
  this.timeScrollHeight = 16;
  this.timeScrollThumbPos = 0;
  this.timeScrollThumbWidth = 0;
  this.timeScrollX = 0;
  this.headerHeight = 30;
  this.canvasHeight = 200;
  this.draggingTime = false;
  this.draggingTracksScrollThumb = false;
  this.draggingTimeScrollThumb = false;
  this.draggingKeys = false;
  this.draggingTimeScale = false;
  this.selectedKeys = [];
  this.timeScale = 1;
  this.selectionBox = {
    startPoint: { x:0, y:0 },
    endPoint: { x:0, y:0 },
    bounds: { x:0, y:0, width:0, height:0 }
  };
  this.mouseDownPoint = { x:0, y:0 };
  this.trackNameCounter = 0;
  this.initTracks();
  this.load();

  /**
   * 时间轴容器div
   */
  this.container = document.createElement("div");
  this.container.style.width = "100%";
  this.container.style.height = this.canvasHeight + "px";
  this.container.style.background = "rgba(255,255,255,.8)";
  this.container.style.position = "fixed";
  this.container.style.left = "0px";
  this.container.style.bottom = "0px";
  this.container.style.transition = ".5s bottom";
  this.container.style.boxShadow = "0 0 8px rgba(0,0,0,.1)";
  this.container.style.backdropFilter = "blur(10px)";
  document.body.appendChild(this.container);

  /**
   * 面板顶部的分割线
   */
  this.splitter = document.createElement("div");
  this.splitter.style.width = "100%";
  this.splitter.style.height = "4px";
  this.splitter.style.cursor = "ns-resize";
  this.splitter.style.position = "fixed";
  this.splitter.style.left = "0px";
  this.splitter.style.bottom = (this.canvasHeight - 2) + "px";

  // 侦听面板顶部拖拽尺寸
  this.splitter.addEventListener("mousedown", function(e) {
    // e.preventDefault();
    function mouseMove(e) {
      var h = (window.innerHeight - e.clientY);
      self.splitter.style.bottom = (h - 2) + "px";
      self.container.style.height = h + "px";
      self.canvasHeight = h;
      self.tracksScrollY = 0;
      self.tracksScrollThumbPos = 0;
      self.save();
    }
    function mouseUp(e) {
      document.removeEventListener("mousemove", mouseMove, false);
      document.removeEventListener("mouseup", mouseUp, false);
    }
    document.addEventListener("mousemove", mouseMove, false);
    document.addEventListener("mouseup", mouseUp, false);
  }, false);
  this.container.appendChild(this.splitter);

  this.canvas = document.createElement("canvas");
  this.c = this.canvas.getContext("2d");
  this.canvas.width = 0;
  this.container.appendChild(this.canvas);

  // 构建关键帧编辑框
  this.buildInputDialog();

  this.canvas.addEventListener('click', function(event) {
     self.onMouseClick(event);
  }, false);
  this.canvas.addEventListener('mousedown', function(event) {
    self.onMouseDown(event);
  }, false);
  document.addEventListener('mousemove', function(event) {
    self.onDocumentMouseMove(event);
  }, false);
  this.canvas.addEventListener('mousemove', function(event) {
    self.onCanvasMouseMove(event);
  }, false);
  document.addEventListener('mouseup', function(event) {
    self.onMouseUp(event);
  }, false);
  this.canvas.addEventListener('dblclick', function(event) {
    self.onMouseDoubleClick(event);
  }, false);
};

/**
 * 鼠标按下
 */
Timeline.prototype.onMouseDown = function(event) {
  this.selectedKeys = [];
  
  var x = event.layerX;
  var y = event.layerY;
  this.mouseDownPoint = { x, y };

  if (x > this.trackLabelWidth && y < this.headerHeight) {
    //timeline
    this.draggingTime = true;
    this.onCanvasMouseMove(event);
  }
  else if (x > this.canvas.width - this.tracksScrollWidth && y > this.headerHeight) {
    //tracks scroll
    if (y >= this.headerHeight + this.tracksScrollThumbPos && y <= this.headerHeight + this.tracksScrollThumbPos + this.tracksScrollThumbHeight) {
      this.tracksScrollThumbDragOffset = y - this.headerHeight - this.tracksScrollThumbPos;
      this.draggingTracksScrollThumb = true;
    }
  }
  else if (x > this.trackLabelWidth && y > this.headerHeight && y < this.canvasHeight - this.timeScrollHeight) {

    // 选择一个关键帧
    this.selectKey(event.layerX, event.layerY);

    // 这里准备拖拽关键帧
    if (this.selectedKeys.length > 0) {
      this.draggingKeys = true;
    }

    // 这里准备画框框
    if (this.selectedKeys.length === 0) {
      this.drawingSelectionBox = true;
      this.selectionBox.startPoint = { x, y };
      this.selectionBox.endPoint = { x, y };
    }

    this.cancelKeyClick = false;
  }
  else if (x < this.trackLabelWidth && y > this.canvasHeight - this.timeScrollHeight) {
    //time scale
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - x) / this.trackLabelWidth, 1));
    this.draggingTimeScale = true;
    this.save();
  }
  else if (x > this.trackLabelWidth && y > this.canvasHeight - this.timeScrollHeight) {
    //time scroll
    if (x >= this.trackLabelWidth + this.timeScrollThumbPos && x <= this.trackLabelWidth + this.timeScrollThumbPos + this.timeScrollThumbWidth) {
      this.timeScrollThumbDragOffset = x - this.trackLabelWidth - this.timeScrollThumbPos;
      this.draggingTimeScrollThumb = true;
    }
  }
};

/**
 * 鼠标在浏览器移动 
 */
Timeline.prototype.onDocumentMouseMove = function(event) {
  var x = event.layerX;
  var y = event.layerY;
  var deltaX = this.mouseDownPoint.x - x;

  // 这里是拖动播放头
  if (this.draggingTime) {
    this.time = this.xToTime(x);
    var animationEnd = this.findAnimationEnd();
    if (this.time < 0) this.time = 0;
    if (this.time > animationEnd) this.time = animationEnd;
  }

  // 这里是拖动关键帧
  if (this.draggingKeys) {

    this.selectedKeys.forEach(key => {
      let offset = key._offset;
      key.time = Math.max(0, this.xToTime(x + offset));
      this.sortTrackKeys(key.track);
      this.rebuildSelectedTracks();
    });

    this.cancelKeyClick = true;
    this.timeScrollThumbPos = this.timeScrollX * (this.timeScrollWidth - this.timeScrollThumbWidth);
  }

  if (this.draggingTimeScale) {
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - x) / this.trackLabelWidth, 1));
    this.save();
  }
};

/**
 * 鼠标在画布上移动
 */
Timeline.prototype.onCanvasMouseMove = function(event) {
  var x = event.layerX;
  var y = event.layerY;

  if (this.draggingTracksScrollThumb) {
    this.tracksScrollThumbPos = y - this.headerHeight - this.tracksScrollThumbDragOffset;
    if (this.tracksScrollThumbPos < 0) {
      this.tracksScrollThumbPos = 0;
    }
    if (this.tracksScrollThumbPos + this.tracksScrollThumbHeight > this.tracksScrollHeight) {
      this.tracksScrollThumbPos = Math.max(0, this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }
    if (this.tracksScrollHeight - this.tracksScrollThumbHeight > 0) {
      this.tracksScrollY = this.tracksScrollThumbPos/(this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }
    else {
      this.tracksScrollY = 0;
    }
  }
  if (this.draggingTimeScrollThumb) {
    this.timeScrollThumbPos = x - this.trackLabelWidth - this.timeScrollThumbDragOffset;
    if (this.timeScrollThumbPos < 0) {
      this.timeScrollThumbPos = 0;
    }
    if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
      this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    if (this.timeScrollWidth - this.timeScrollThumbWidth > 0) {
      this.timeScrollX = this.timeScrollThumbPos/(this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    else {
      this.timeScrollX = 0;
    }
  }
  if (this.drawingSelectionBox) {
    this.selectionBox.endPoint = { x, y };
  }
};

/**
 * 鼠标松开
 */
Timeline.prototype.onMouseUp = function(event) {
  if (this.draggingTime) {
    this.draggingTime = false;
  }
  if (this.draggingKeys) {
    this.draggingKeys = false;
  }
  if (this.draggingTracksScrollThumb) {
    this.draggingTracksScrollThumb = false;
  }
  if (this.draggingTimeScale) {
    this.draggingTimeScale = false;
  }
  if (this.draggingTimeScrollThumb) {
    this.draggingTimeScrollThumb = false;
  }

  // 拖动多个关键帧
  if (this.drawingSelectionBox) {
    this.draggingKeys = true;
    this.selectKeys(this.selectionBox.bounds);

    // 记录每个关键帧与鼠标的偏移量
    this.selectedKeys.forEach(key => {
      let keyX = this.timeToX(key.time);
      key._offset =  keyX - event.pageX;
    });
  }
  
  if (this.drawingSelectionBox) {
    this.drawingSelectionBox = false;
  }
};

/**
 * 鼠标单击
 */
Timeline.prototype.onMouseClick = function(event) {
  if (event.layerX < 1*this.headerHeight - 4 * 0 && event.layerY < this.headerHeight) {
    this.play();
  }
  if (event.layerX > 1*this.headerHeight - 4 * 0 && event.layerX < 2*this.headerHeight - 4 * 1 && event.layerY < this.headerHeight) {
    this.pause();
  }

  if (event.layerX > 2*this.headerHeight - 4 * 1 && event.layerX < 3*this.headerHeight - 4 * 2 && event.layerY < this.headerHeight) {
    this.stop();
  }

  if (event.layerX > 3*this.headerHeight - 4 * 2 && event.layerX < 4*this.headerHeight - 4 * 3 && event.layerY < this.headerHeight) {
    this.exportCode();
  }
};

/**
 * 鼠标双击
 */
Timeline.prototype.onMouseDoubleClick = function(event) {
  var x = event.layerX;
  var y = event.layerY;

  if (this.selectedKeys.length === 1) {
    // 双击编辑关键帧
    if (!this.cancelKeyClick) {
      this.showKeyEditDialog(event.pageX, event.pageY);
    }
  }
  else if (this.selectedKeys.length === 0) {

    if (x > this.trackLabelWidth && y < this.headerHeight) {
      //timeline
      var timeStr = prompt("Enter time") || "0:0:0";
      var timeArr = timeStr.split(":");
      var seconds = 0;
      var minutes = 0;
      var hours = 0;
      if (timeArr.length > 0) seconds = parseInt(timeArr[timeArr.length-1], 10);
      if (timeArr.length > 1) minutes = parseInt(timeArr[timeArr.length-2], 10);
      if (timeArr.length > 2) hours = parseInt(timeArr[timeArr.length-3], 10);
      this.time = this.totalTime = hours * 60 * 60 + minutes * 60 + seconds;
    }
    else if (x > this.trackLabelWidth && this.selectedKeys.length === 0 && y > this.headerHeight && y < this.canvasHeight - this.timeScrollHeight) {
      this.addKeyAt(x, y);
    }

  }
};

/**
 * 新增关键帧
 */
Timeline.prototype.addKeyAt = function(mouseX, mouseY) {
  var selectedTrack = this.getTrackAt(mouseX, mouseY);

  if (!selectedTrack) {
    return;
  }

  var newKey = {
      time: this.xToTime(mouseX),
      value: selectedTrack.target[selectedTrack.propertyName],
      easing: Timeline.Easing.Linear.EaseNone,
      track: selectedTrack
  };
  if (selectedTrack.keys.length === 0) {
    selectedTrack.keys.push(newKey);
  }
  else if (newKey.time < selectedTrack.keys[0].time) {
    newKey.value = selectedTrack.keys[0].value;
    selectedTrack.keys.unshift(newKey);
  }
  else if (newKey.time > selectedTrack.keys[selectedTrack.keys.length-1].time) {
    newKey.value = selectedTrack.keys[selectedTrack.keys.length-1].value;
    selectedTrack.keys.push(newKey);
  }
  else for(var i=1; i<selectedTrack.keys.length; i++) {
    if (selectedTrack.keys[i].time > newKey.time) {
      var k = (selectedTrack.keys[i].time - newKey.time)/(selectedTrack.keys[i].time - selectedTrack.keys[i-1].time);
      var delta = selectedTrack.keys[i].value - selectedTrack.keys[i-1].value;
      newKey.easing = selectedTrack.keys[i-1].easing;
      newKey.value = selectedTrack.keys[i-1].value + delta * newKey.easing(k);
      selectedTrack.keys.splice(i, 0, newKey);
      break;
    }
  }
  this.selectedKeys = [newKey];
  this.rebuildSelectedTracks();
};

/**
 * 获取鼠标所在位置的轨道
 */
Timeline.prototype.getTrackAt = function(mouseX, mouseY) {
  var scrollY = this.tracksScrollY * (this.tracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
  var clickedTrackNumber = Math.floor((mouseY - this.headerHeight + scrollY)/this.trackLabelHeight);

  if (clickedTrackNumber >= 0 && clickedTrackNumber >= this.tracks.length || this.tracks[clickedTrackNumber].type == "object") {
    return null;
  }

  return this.tracks[clickedTrackNumber];
};

/**
 * 选中单个关键帧
 */
Timeline.prototype.selectKey = function(mouseX, mouseY) {
  this.selectedKeys = [];

  var selectedTrack = this.getTrackAt(mouseX, mouseY);

  if (!selectedTrack) {
    return;
  }

  for(var i=0; i<selectedTrack.keys.length; i++) {
    var key = selectedTrack.keys[i];
    var x = this.timeToX(key.time);

    let keyX = this.timeToX(key.time);
    key._offset =  keyX - mouseX;

    if (x >= mouseX - this.trackLabelHeight*0.3 && x <= mouseX + this.trackLabelHeight*0.3) {
      this.selectedKeys.push(key);
      break;
    }
  }
};

/**
 * 从选区选中多个轨道
 */
Timeline.prototype.getTracksFromBounds = function(bounds) {
  var selectedTracks = [];
  var scrollY = this.tracksScrollY * (this.tracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
  var startY = bounds.y + scrollY - this.headerHeight;
  var endY = bounds.y + bounds.height + scrollY - this.headerHeight;
  var fromTrackIdx = Math.floor(startY / this.trackLabelHeight);
  var toTrackIdx = Math.floor(endY / this.trackLabelHeight);

  this.tracks.forEach((track, idx) => {
    if (idx >= fromTrackIdx && idx <= toTrackIdx) {
      selectedTracks.push(track);
    }
  });

  return selectedTracks;
};

/**
 * 选中多个关键帧
 */
Timeline.prototype.selectKeys = function(bounds) {
  this.selectedKeys = [];
  var fromMouseX = bounds.x;
  var toMouseX = bounds.x + bounds.width;
  var keySize = this.trackLabelHeight * 0.3;

  var selectedTracks = this.getTracksFromBounds(bounds);
  if (selectedTracks.length === 0) return;

  selectedTracks.forEach(track => {
    track.keys.forEach(key => {
      var x = this.timeToX(key.time);
      if (x >= fromMouseX - keySize && x <= toMouseX + keySize) {
        this.selectedKeys.push(key);
      }
    });
  });
};

Timeline.prototype.preUpdate = function() {
  this.updateGUI();
};

/**
 * 刷新 Canvas 界面
 */
Timeline.prototype.updateGUI = function() {
  if (!this.canvas) {
    this.initGUI();
  }

  this.canvas.width = window.innerWidth;
  this.canvas.height = this.canvasHeight;
  var w = this.canvas.width;
  var h = this.canvas.height;

  this.tracksScrollHeight = this.canvas.height - this.headerHeight - this.timeScrollHeight;
  var totalTracksHeight = this.tracks.length * this.trackLabelHeight;
  var tracksScrollRatio = this.tracksScrollHeight/totalTracksHeight;
  this.tracksScrollThumbHeight = Math.min(Math.max(20, this.tracksScrollHeight * tracksScrollRatio), this.tracksScrollHeight);

  this.timeScrollWidth = this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth;
  var animationEnd = this.findAnimationEnd();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(0); //100 to get some space after lask key
  var timeScrollRatio = Math.max(0, Math.min(visibleTime/animationEnd, 1));
  this.timeScrollThumbWidth = timeScrollRatio * this.timeScrollWidth;
  if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
    this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
  }

  this.c.clearRect(0, 0, w, h);

  //buttons
  this.drawRect(0*this.headerHeight - 4 * -1, 5, this.headerHeight - 8, this.headerHeight - 8, "transparent");
  this.drawRect(1*this.headerHeight - 4 *  0, 5, this.headerHeight - 8, this.headerHeight - 8, "transparent");
  this.drawRect(2*this.headerHeight - 4 *  1, 5, this.headerHeight - 8, this.headerHeight - 8, "transparent");
  this.drawRect(3*this.headerHeight - 4 *  2, 5, this.headerHeight - 8, this.headerHeight - 8, "transparent");

  //play
  this.c.strokeStyle = "#3D81F6";
  this.c.beginPath();
  this.c.moveTo(4 + 6.5, 5 + 5);
  this.c.lineTo(this.headerHeight - 8, this.headerHeight/2+1.5);
  this.c.lineTo(4 + 6.5, this.headerHeight - 8);
  this.c.lineTo(4 + 6.5, 5 + 5);
  this.c.fillStyle = '#3D81F6';
  this.c.fill();

  //pause
  this.c.rect(this.headerHeight + 5.5, 5 + 5.5, this.headerHeight/6, this.headerHeight - 8 - 11);
  this.c.rect(this.headerHeight + 5.5 + this.headerHeight/6 + 2, 5 + 5.5, this.headerHeight/6, this.headerHeight - 8 - 11);
  this.c.fillStyle = '#3D81F6';
  this.c.fill();

  //stop
  this.c.rect(2*this.headerHeight - 4 + 5.5, 5 + 5.5, this.headerHeight - 8 - 11, this.headerHeight - 8 - 11);
  this.c.fillStyle = '#3D81F6';
  this.c.fill();

  //export
  this.c.beginPath();
  this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 9.5);
  this.c.lineTo(3*this.headerHeight - 4 *  2 + 11.5, this.headerHeight - 9.5);
  this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 13.5);
  this.c.lineTo(3*this.headerHeight - 4 *  2 + 13.5, this.headerHeight - 13.5);
  this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 17.5);
  this.c.lineTo(3*this.headerHeight - 4 *  2 + 15.5, this.headerHeight - 17.5);
  this.c.lineWidth = 2;
  this.c.stroke();
  this.c.lineWidth = 1;

  //tracks area clipping path
  this.c.save();
  this.c.beginPath();
  this.c.moveTo(0, this.headerHeight+1);
  this.c.lineTo(this.canvas.width, this.headerHeight + 1);
  this.c.lineTo(this.canvas.width, this.canvas.height - this.timeScrollHeight);
  this.c.lineTo(0, this.canvas.height - this.timeScrollHeight);
  this.c.clip();

  for(var i=0; i<this.tracks.length; i++) {
    var yshift = this.headerHeight + this.trackLabelHeight * (i + 1);
    var scrollY = this.tracksScrollY * (this.tracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
    yshift -= scrollY;
    if (yshift < this.headerHeight) continue;
    this.drawTrack(this.tracks[i], yshift);
  }

  this.c.restore();

  //end of label panel
  this.drawLine(this.trackLabelWidth, 0, this.trackLabelWidth, h, "#DEDEDE");

  //timeline
  var timelineStart = 0;
  var timelineEnd = 10;
  var lastTimeLabelX = 0;

  this.c.fillStyle = "#666666";
  var x = this.timeToX(0);
  //for(var sec=timelineStart; sec<timelineEnd; sec++) {
  var sec = timelineStart;
  while(x < this.canvas.width) {
    x = this.timeToX(sec);
    this.drawLine(x, 0, x, this.headerHeight*0.3, "#999999");

    var minutes = Math.floor(sec / 60);
    var seconds = sec % 60;
    var time = minutes + ":" + ((seconds < 10) ? "0" : "") + seconds;

    if (x - lastTimeLabelX > 30) {
      this.c.fillText(time, x - 6, this.headerHeight*0.8);
      lastTimeLabelX = x;
    }
    sec += 1;
  }

  //time ticker
  this.drawLine(this.timeToX(this.time), 0, this.timeToX(this.time), h, "#FF0000");

  //time scale
  for(var j=2; j<20; j++) {
    var f = 1.0 - (j*j)/361;
    this.drawLine(7 + f*(this.trackLabelWidth-10), h - this.timeScrollHeight + 4, 7 + f*(this.trackLabelWidth - 10), h - 3, "#999999");
  }
  this.c.fillStyle = "#666666";
  this.c.beginPath();
  this.c.moveTo(7 + (1.0-this.timeScale)*(this.trackLabelWidth-10), h - 7);
  this.c.lineTo(11 + (1.0-this.timeScale)*(this.trackLabelWidth - 10), h - 1);
  this.c.lineTo(3 + (1.0-this.timeScale)*(this.trackLabelWidth - 10), h - 1);
  this.c.fill();

  //tracks scrollbar
  this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1, this.tracksScrollWidth, this.tracksScrollHeight, "#EEE");
  if (this.tracksScrollThumbHeight < this.tracksScrollHeight) {
    this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1 + this.tracksScrollThumbPos, this.tracksScrollWidth, this.tracksScrollThumbHeight, "#999");
  }

  //time scrollbar
  this.drawRect(this.trackLabelWidth, h - this.timeScrollHeight, w - this.trackLabelWidth - this.tracksScrollWidth, this.timeScrollHeight, "#EEE");
  if (this.timeScrollThumbWidth < this.timeScrollWidth) {
    this.drawRect(this.trackLabelWidth + 1 + this.timeScrollThumbPos, h - this.timeScrollHeight, this.timeScrollThumbWidth, this.timeScrollHeight, "#999");
  }

  //header borders
  this.drawLine(0, 0, w, 0, "#DEDEDE");
  this.drawLine(0, this.headerHeight, w, this.headerHeight, "#DEDEDE");
  this.drawLine(0, h - this.timeScrollHeight, this.trackLabelWidth, h - this.timeScrollHeight, "#DEDEDE");
  this.drawLine(this.trackLabelWidth, h - this.timeScrollHeight - 1, this.trackLabelWidth, h, "#DEDEDE");

  // selection box
  // 坐标翻转不能用于渲染，因为当鼠标不移动的时候会无法翻转
  if (this.drawingSelectionBox) {
    let { x: startX, y: startY } = this.selectionBox.startPoint;
    let { x: endX, y: endY } = this.selectionBox.endPoint;

    if (endY < this.headerHeight) { endY = this.headerHeight; }
    if (endX < this.trackLabelWidth) { endX = this.trackLabelWidth; }

    this.selectionBox.bounds = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    };

    this.drawSelectionBox(startX, startY, endX - startX, endY - startY);
  }
};

Timeline.prototype.timeToX = function(time) {
  var animationEnd = this.findAnimationEnd();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(20); //50 to get some additional space
  if (visibleTime < animationEnd) {
    time -= (animationEnd - visibleTime) * this.timeScrollX;
  }

  return this.trackLabelWidth + time * (this.timeScale * 200) + 10;
};

Timeline.prototype.xToTime = function(x) {
  var animationEnd = this.findAnimationEnd();
  var visibleTime = (this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth - 20)/(this.timeScale * 200);
  var timeShift = Math.max(0, (animationEnd - visibleTime) * this.timeScrollX);
  return (x - this.trackLabelWidth - 10)/(this.timeScale * 200) + timeShift;
};

Timeline.prototype.drawTrack = function(track, y) {
  var xshift = 5;
  if (track.type == "object") {
    //object track header background
    this.drawRect(0, y - this.trackLabelHeight + 1, this.trackLabelWidth, this.trackLabelHeight-1, "#3D81F6");
    //label color
    this.c.fillStyle = "#FFF"; // 高亮选中层名字
  }
  else {
    xshift += 10;
    //label color
    this.c.fillStyle = "#555555";
  }

  //bottom track line
  this.drawLine(0, y, this.canvas.width, y, "rgba(0,0,0,.03)");
  //draw track label
  this.c.font="11px monospace";
  this.c.fillText(track.name, xshift, y - this.trackLabelHeight/4);

  //if it's property track then draw anims
  if (track.type == "property") {

    for(var i=0; i<track.keys.length; i++) {
      var key = track.keys[i];
      var selected = false;
      if (this.selectedKeys.indexOf(key) > -1) {
        selected = true;
      }
      var first = (i === 0);
      var last = (i == track.keys.length - 1);

      // 绘画关键帧，这里可以获取到关键帧的坐标点
      this.drawRombus(this.timeToX(key.time), y - this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, selected ? "#FF0000" : "#06F", true, true, selected ? "#FF0000" : "#06F");
      this.drawRombus(this.timeToX(key.time), y - this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, selected ? "#FFCDCD" : "#CEE1FE", !first, !last);

    }
  }
};

Timeline.prototype.drawLine = function(x1, y1, x2, y2, color) {
  this.c.strokeStyle = color;
  this.c.beginPath();
  this.c.moveTo(x1+0.5, y1+0.5);
  this.c.lineTo(x2+0.5, y2+0.5);
  this.c.stroke();
};

Timeline.prototype.drawRect = function(x, y, w, h, color) {
  this.c.fillStyle = color;
  this.c.fillRect(x, y, w, h);
};

Timeline.prototype.drawSelectionBox = function(x, y, w, h) {
  // this.c.save();
  this.c.beginPath();
  this.c.moveTo(x, y);
  this.c.lineTo(x + w, y);
  this.c.lineTo(x + w, y + h);
  this.c.lineTo(x, y + h);
  this.c.lineTo(x, y);

  this.c.fillStyle = "rgba(0,204,255,.1)";
  this.c.fill();

  this.c.lineWidth = 1;
  this.c.strokeStyle = "rgba(0,204,255,1)";
  this.c.stroke();
  // this.c.restore();
};

Timeline.prototype.drawCenteredRect = function(x, y, w, h, color) {
  this.c.fillStyle = color;
  this.c.fillRect(x-w/2, y-h/2, w, h);
};

Timeline.prototype.drawRombus = function(x, y, w, h, color, drawLeft, drawRight, strokeColor) {
  this.c.fillStyle = color;
  if (strokeColor) {
    this.c.lineWidth = 2;
    this.c.strokeStyle = strokeColor;
    this.c.beginPath();
    this.c.moveTo(x, y - h/2);
    this.c.lineTo(x + w/2, y);
    this.c.lineTo(x, y + h/2);
    this.c.lineTo(x - w/2, y);
    this.c.lineTo(x, y - h/2);
    this.c.stroke();
    this.c.lineWidth = 1;
  }

  if (drawLeft) {
    this.c.beginPath();
    this.c.moveTo(x, y - h/2);
    this.c.lineTo(x - w/2, y);
    this.c.lineTo(x, y + h/2);
    this.c.fill();
  }

  if (drawRight) {
    this.c.beginPath();
    this.c.moveTo(x, y - h/2);
    this.c.lineTo(x + w/2, y);
    this.c.lineTo(x, y + h/2);
    this.c.fill();
  }
};

Timeline.prototype.initTracks = function() {
  this.tracks = [];
  var i, j;
  var anim;
  for(i=0; i<this.anims.length; i++) {
    anim = this.anims[i];
    var objectTrack = null;
    var propertyTrack = null;
    for(j=0; j<this.tracks.length; j++) {
      if (this.tracks[j].type == "object" && this.tracks[j].target == anim.target) {
        objectTrack = this.tracks[j];
      }
      if (this.tracks[j].type == "property" && this.tracks[j].target == anim.target && this.tracks[j].propertyName == anim.propertyName) {
        propertyTrack = this.tracks[j];
      }
    }
    if (!objectTrack) {
      objectTrack = {
        type: "object",
        id: anim.targetName,
        name: anim.targetName,
        target: anim.target,
        propertyTracks: []
      };
      if (!objectTrack.name) {
        objectTrack.name = "Object" + this.trackNameCounter++;
      }
      this.tracks.push(objectTrack);
    }

    if (!propertyTrack) {
      propertyTrack = {
        type: "property",
        id: objectTrack.name + "." + anim.propertyName,
        name: anim.propertyName,
        propertyName: anim.propertyName,
        target: anim.target,
        parent: objectTrack,
        anims: []
      };

      //find place to insert
      var parentObjectTrack = null;
      var nextObjectTrack = null;
      for(var k=0; k<this.tracks.length; k++) {
        if (this.tracks[k].type == "object") {
          if (parentObjectTrack && !nextObjectTrack) {
            nextObjectTrack = this.tracks[k];
          }
          if (this.tracks[k].target == propertyTrack.target) {
            parentObjectTrack = this.tracks[k];
          }
        }
      }

      if (nextObjectTrack) {
        //add ad the end of this object property tracks, just before next one
        var nextTrackIndex = this.tracks.indexOf(nextObjectTrack);
        this.tracks.splice(nextTrackIndex, 0, propertyTrack);
      }
      else {
        //add to end of all track
        this.tracks.push(propertyTrack);
      }

      parentObjectTrack.propertyTracks.push(propertyTrack);

    }

    propertyTrack.anims.push(anim);
  }

  //convert anims to keys
  for(i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];
    track.keys = [];
    if (track.type == "object") continue;
    for(j=0; j<track.anims.length; j++) {
      anim = track.anims[j];
      if (anim.delay > 0) {
        var startValue = 0;
        var easing = anim.easing;
        if (j === 0) {
          startValue = track.target[track.propertyName];
        }
        else {
          startValue = track.anims[j-1].endValue;
        }
        track.keys.push({
           time: anim.startTime,
           value: startValue,
           easing: easing,
           track: track
        });
      }
      var easingFunc = Timeline.Easing.Linear.EaseNone;
      if (j < track.anims.length - 1) {
        if (track.anims[j+1].delay === 0) {
          easingFunc = track.anims[j+1].easing;
        }
      }
      track.keys.push({
         time: anim.endTime,
         value: anim.endValue,
         easing: easingFunc,
         track: track
      });
    }
  }
};

/**
 * 构建关键帧编辑框
 */
Timeline.prototype.buildInputDialog = function() {
  this.keyEditDialog = document.createElement("div");
  this.keyEditDialog.id = "keyEditDialog";
  this.keyEditDialog.style.cssText = `
    position:absolute;
    background:#FFF;
    padding:10px 15px 15px;
    left:100px;
    top:100px;
    border: 1px solid #DEDEDE;
    box-sizing: border-box;
    box-shadow: 0 0 4px rgba(0,0,0,.1);
  `;

  var easingOptions = "";

  for(var easingFunctionFamilyName in Timeline.Easing) {
    var easingFunctionFamily = Timeline.Easing[easingFunctionFamilyName];
    for(var easingFunctionName in easingFunctionFamily) {
      easingOptions += "<option>" + easingFunctionFamilyName + "." + easingFunctionName + "</option>";
    }
  }

  var controls = `
    <div style="position:relative; display:flex; flex-direction:column; color:#585858;">
      <div style="display:flex; height:24px; line-height:24px; opacity:.4;">
        <span style="margin:0; font-size:14px; line-height:24px; letter-spacing:1px;">KEYFRAME</span>
        <span id="keyEditDialogCancel" style="cursor:pointer; position:absolute; display:inline-flex; align-items:center; font-size:16px; height:24px; line-height:24px; padding:0 6px; right:-5px; top:-1px;">×</span>
      </div>
      <label style="margin-top:10px; height:26px; line-height:26px; display:flex;">
        <span style="width:55px; overflow:hidden; font-size:14px;">Value</span>
        <input style="flex:1; border:0; background:#F3F3F3; padding:5px; border-right:8px solid #F3F3F3; outline:0;" type="number" id="keyEditDialogValue"/>
      </label>
      <label style="margin-top:10px; height:26px; line-height:26px; display:flex;">
        <span style="width:55px; overflow:hidden; font-size:14px;">Time</span>
        <input style="flex:1; border:0; background:#F3F3F3; padding:5px; border-right:8px solid #F3F3F3; outline:0;" type="number" id="keyEditDialogTime"/>
      </label>
      <label style="margin-top:10px; height:26px; line-height:26px; display:flex;">
        <span style="width:55px; overflow:hidden; font-size:14px;">Easing</span>
        <select style="flex:1; border:0; background:#F3F3F3; padding:5px; border-right:8px solid #F3F3F3; outline:0;" id="keyEditDialogEasing">${easingOptions}</select>
      </label>
      <div style="display:flex; gap:10px; margin-left:55px; margin-top:10px;">
        <input id="keyEditDialogDelete" style="border:0; outline:0; background:#FFF; border:1px solid #FF6C67; color:#FF6C67; height:24px; line-height:24px; padding:0 10px; border-radius:2px; cursor:pointer;" type="button" value="Delete"/>
        <input id="keyEditDialogOK" style="border:0; outline:0; background:#3D81F6; color:#FFF; height:24px; line-height:24px; padding:0 20px; border-radius:2px; cursor:pointer;" type="button" value="OK"/>
      </div>
    </div>
  `;
  this.keyEditDialog.innerHTML = controls;
  document.body.appendChild(this.keyEditDialog);

  this.keyEditDialogValue = document.getElementById("keyEditDialogValue");
  this.keyEditDialogTime = document.getElementById("keyEditDialogTime");
  this.keyEditDialogEasing = document.getElementById("keyEditDialogEasing");
  this.keyEditDialogOK = document.getElementById("keyEditDialogOK");
  this.keyEditDialogCancel = document.getElementById("keyEditDialogCancel");
  this.keyEditDialogDelete = document.getElementById("keyEditDialogDelete");

  // 增加窗体上升动画
  var dur = .3;
  var offset = 15;
  this.keyEditDialog.style.transform = `translateY(${-offset}px)`;
  this.keyEditDialog.style.animation = `show-timeline-dialog ${dur}s ease-out`;

  // 插入固定css
  this.style = document.createElement('style');
  document.head.appendChild(this.style);
  // this.style.sheet.insertRule();
  this.style.innerHTML += `
    @Keyframes show-timeline-dialog {
      from { transform: translateY(0); }
      to   { transform: translateY(${-offset}px); }
    }
  `;

  this.keyEditDialog.size = {
    width: this.keyEditDialog.offsetWidth,
    height: this.keyEditDialog.offsetHeight
  };



  var self = this;

  this.keyEditDialogOK.addEventListener('click', function() {
    self.applyKeyEditDialog();
    self.hideKeyEditDialog();
  }, false);

  this.keyEditDialogCancel.addEventListener('click', function() {
    self.hideKeyEditDialog();
  }, false);

  this.keyEditDialogDelete.addEventListener('click', function() {
    self.deleteSelectedKeys();
    self.rebuildSelectedTracks();
    self.hideKeyEditDialog();
  }, false);

  this.hideKeyEditDialog();
};

Timeline.prototype.applyKeyEditDialog = function() {
  var value = Number(this.keyEditDialogValue.value);
  var time = Number(this.keyEditDialogTime.value);

  if (isNaN(value) || isNaN(time)) return;

  var selectedOption = this.keyEditDialogEasing.options[this.keyEditDialogEasing.selectedIndex];
  var easing = Timeline.easingMap[selectedOption.value] ;
  for(var i=0; i<this.selectedKeys.length; i++) {
    this.selectedKeys[i].easing = easing;
    this.selectedKeys[i].value = value;
    this.selectedKeys[i].time = time;
  }
  this.rebuildSelectedTracks();
};

// 显示帧编辑面板
Timeline.prototype.showKeyEditDialog = function(mouseX, mouseY) {

  this.keyEditDialogValue.value = this.selectedKeys[0].value;
  this.keyEditDialogTime.value = this.selectedKeys[0].time;

  for(var i=0; i<this.keyEditDialogEasing.options.length; i++) {
    var option = this.keyEditDialogEasing.options[i];
    var easingFunction = Timeline.easingMap[option.value];
    if (easingFunction == this.selectedKeys[0].easing) {
      this.keyEditDialogEasing.selectedIndex = i;
      break;
    }
  }

  this.hideKeyEditDialog();
  setTimeout(()=>{ this.keyEditDialog.style.display = "block"; },1);
  

  let _x, _y;
  _x = mouseX + this.keyEditDialog.size.width > window.innerWidth ? mouseX - this.keyEditDialog.size.width : mouseX;
  _y = mouseY - this.keyEditDialog.size.height;
  
  this.keyEditDialog.style.left = (_x - 0) + "px";
  this.keyEditDialog.style.top = (_y - 0) + "px";

  this.keyEditDialogValue.focus();
};

// 隐藏帧编辑面板
Timeline.prototype.hideKeyEditDialog = function() {
  this.keyEditDialog.style.display = "none";
};

Timeline.prototype.deleteSelectedKeys = function() {
  for(var i=0; i<this.selectedKeys.length; i++) {
    var selectedKey = this.selectedKeys[i];
    var keyIndex = selectedKey.track.keys.indexOf(selectedKey);
    selectedKey.track.keys.splice(keyIndex, 1);
  }
  this.rebuildSelectedTracks();
};

Timeline.prototype.sortTrackKeys = function(track) {
  track.keys.sort(function(a,b) { return a.time - b.time; });

  var result = "";
  for(var i=0; i<track.keys.length; i++) {
    result += track.keys[i].time + " ";
  }
};

Timeline.prototype.rebuildSelectedTracks = function() {
  for(var i=0; i<this.selectedKeys.length; i++) {
    this.rebuildTrackAnimsFromKeys(this.selectedKeys[i].track);
  }
  this.save();
};

Timeline.prototype.rebuildTrackAnimsFromKeys = function(track) {
  var deletedAnims = [];
  var j;

  //remove all track's anims from the timeline
  for(j=0; j<track.anims.length; j++) {
    var index = this.anims.indexOf(track.anims[j]);
    deletedAnims.push(track.anims[j]);
    this.anims.splice(index, 1);
  }

  //remove all anims from the track
  track.anims.splice(0, track.anims.length);

  if (track.keys.length === 0) {
    return;
  }

  var delay = track.keys[0].time;
  var prevKeyTime = track.keys[0].time;
  var prevKeyValue = track.keys[0].value;
  var prevKeyEasing = Timeline.Easing.Linear.EaseNone;
  //create new anims based on keys
  for(j=0; j<track.keys.length; j++) {
    var key = track.keys[j];
    var anim = {
      timeline: this,
      target: track.target,
      propertyName: track.propertyName,
      startValue: prevKeyValue,
      endValue: key.value,
      delay: delay,
      startTime: prevKeyTime,
      endTime: key.time,
      easing: prevKeyEasing
    };
    track.anims.push(anim);
    this.anims.push(anim);
    delay = 0;
    prevKeyTime = key.time;
    prevKeyValue = key.value;
    prevKeyEasing = key.easing;
  }
};

Timeline.prototype.exportCode = function() {
  var code = "";

  for(var i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];
    if (track.type == "object") continue;
    if (track.anims.length === 0) continue;
    code += 'anim("' + track.parent.name + '",' + track.parent.name + ')';
    for(var j=0; j<track.anims.length; j++) {
      var anim = track.anims[j];
      code += '.to(';
      if (anim.delay)
        code += anim.delay + ',';
      code += '{' + '"' + anim.propertyName + '"' + ':' + anim.endValue + '}';
      code += ',' + (anim.endTime - anim.startTime);
      if (anim.easing != Timeline.Easing.Linear.EaseNone)
        code += ', Timeline.Easing.' + Timeline.easingFunctionToString(anim.easing);
      code += ')';
      //code += '.to(' + anim.delay + ',{' + '"' + anim.propertyName + '"' + ':' + anim.endValue + '} ')';
    }
    code += ';\n';
  }

  prompt("Copy this:", code);
};

Timeline.prototype.save = function() {
  var data = {};

  for(var i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];
    var keysData = [];
    for(var j=0; j<track.keys.length; j++) {
      keysData.push({
        time: track.keys[j].time,
        value: track.keys[j].value,
        easing: Timeline.easingFunctionToString(track.keys[j].easing)
      });
    }
    data[track.id] = keysData;
  }

  localStorage["timeline.js.settings.canvasHeight"] = this.canvasHeight;
  localStorage["timeline.js.settings.timeScale"] = this.timeScale;
  localStorage["timeline.js.data." + this.name] = JSON.stringify(data);
};

Timeline.prototype.load = function() {
  if (localStorage["timeline.js.settings.canvasHeight"]) {
    this.canvasHeight = localStorage["timeline.js.settings.canvasHeight"];
  }
  if (localStorage["timeline.js.settings.timeScale"]) {
    this.timeScale = localStorage["timeline.js.settings.timeScale"];
  }

  var dataString = localStorage["timeline.js.data." + this.name];
  if (!dataString) return;
  var data = JSON.parse(dataString);
  for(var i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];
    if (!data[track.id]) {
      continue;
    }
    if (track.type == "property") {
      var keysData = data[track.id];
      track.keys = [];
      for(var j=0; j<keysData.length; j++) {
        track.keys.push({
          time: keysData[j].time,
          value: keysData[j].value,
          easing: Timeline.stringToEasingFunction(keysData[j].easing),
          track: track
        });
      }
      this.rebuildTrackAnimsFromKeys(track);
    }
  }
};

/**
 * 清除localStorage存储的动画数据
 */
Timeline.prototype.clear = function() {
  var dataName = "timeline.js.data." + this.name;
  localStorage.setItem(dataName, '');
};