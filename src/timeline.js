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

(function(root){
  var Timeline = function() {
    this.name = "Global";
    this.anims = [];
    this.time = 0;
    this.totalTime = 0;
    this.loopCount = 0;
    this.loopMode = 0;
    this.playing = true;
    this.version = 0.2;
    var self = this;
    this.fps = 30;

    raf(self.update.bind(self), this.fps);
  };

  function raf(callback, fps) {
    let fpsInterval = 1000 / fps, then = now = Date.now(), elapsedTime = 0;
    let loop = () => {
      requestAnimationFrame(loop);
      now = Date.now();
      elapsedTime = now - then;
      if (elapsedTime > fpsInterval) {
        then = now - (elapsedTime % fpsInterval);
        callback();
      }
    };
    loop();
  }

  Timeline.getGlobalInstance = function() {
    if (!Timeline.globalInstance) {
      Timeline.globalInstance = new Timeline();
    }
    return Timeline.globalInstance;
  };

  //Possible values of n:
  //-1 infinite loop
  //0  play forever without looping, continue increasing time even after last animation
  //1  play once and stop at the time the last animation finishes
  //>1 loop n-times
  Timeline.prototype.loop = function(n) {
    this.loopMode = n;
  };

  Timeline.prototype.stop = function() {
    this.playing = false;
    this.time = 0;
  };

  Timeline.prototype.pause = function() {
    this.playing = false;
  };

  Timeline.prototype.play = function() {
    this.playing = true;
  };

  Timeline.prototype.preUpdate = function() {
    //placeholder for hooks like GUI rendering
  };

  Timeline.prototype.update = function(dt) {
    var deltaTime = dt || 1 / this.fps;

    this.preUpdate();

    if (this.playing) {
      this.totalTime += deltaTime;
      this.time += deltaTime;
    }

    if (this.loopMode !== 0) {
      var animationEnd = this.findAnimationEnd();
      if (this.time > animationEnd) {
        if (this.loopMode == -1 || (this.loopCount < this.loopMode)) {
          this.time = 0;
          this.loopCount++;
          for(var i=0; i<this.anims.length; i++) {
            this.anims[i].hasStarted = false;
            this.anims[i].hasEnded = false;
          }
        }
        else {
          this.playing = false;
        }
      }
    }

    this.applyValues();
  };

  Timeline.prototype.findAnimationEnd = function() {
    var endTime = 0;
    for(var i=0; i<this.anims.length; i++) {
      if (this.anims[i].endTime > endTime) {
        endTime = this.anims[i].endTime;
      }
    }
    return endTime;
  };

  Timeline.prototype.applyValues = function() {
    for(var i=0; i<this.anims.length; i++) {
      var propertyAnim = this.anims[i];
      if (this.time < propertyAnim.startTime || propertyAnim.hasEnded) {
        continue;
      }

      if (this.time >= propertyAnim.startTime && !propertyAnim.hasStarted) {
        var startValue = propertyAnim.target[propertyAnim.propertyName];
        if (startValue.length && startValue.indexOf('px') > -1) {
          propertyAnim.startValue = Number(startValue.replace('px', ''));
          propertyAnim.unit = 'px';
        }
        else {
          propertyAnim.startValue = Number(startValue);
        }
        propertyAnim.hasStarted = true;
        if (propertyAnim.onStart) {
          propertyAnim.onStart();
        }
      }
      var duration = propertyAnim.endTime - propertyAnim.startTime;
      var t = duration ? (this.time - propertyAnim.startTime)/(duration) : 1;
      t = Math.max(0, Math.min(t, 1));
      t = propertyAnim.easing(t);

      var value = propertyAnim.startValue + (propertyAnim.endValue - propertyAnim.startValue) * t;
      // console.log(value)

      if (propertyAnim.unit) value += propertyAnim.unit;
      propertyAnim.target[propertyAnim.propertyName] = value;

      if (propertyAnim.parent && propertyAnim.parent.onUpdateCallback) {
        propertyAnim.parent.onUpdateCallback(propertyAnim);
      }

      if (this.time >= propertyAnim.endTime && !propertyAnim.hasEnded) {
        propertyAnim.hasEnded = true;
        if (propertyAnim.onEnd) {
          propertyAnim.onEnd();
        }
      }

      if (t == 1) {
        if (this.loopMode == 0) {
          this.anims.splice(i, 1);
          i--;
        }
      }
    }
  };

  //--------------------------------------------------------------------

  function Anim(name, target, timeline) {
    this.startTime = 0;
    this.endTime = 0;
    this.time = 0;
    this.propertyAnims = [];
    this.hasStarted = false;
    this.hasEnded = false;

    this.name = name;
    this.target = target;
    this.timeline = timeline;
    this.animGroups = [];
  }

  //delay, properties, duration, easing
  Anim.prototype.to = function() {
    var args = [];
    for(var i=0; i<arguments.length; i++) {
      args.push(arguments[i]);
    }
    var delay;
    var properties;
    var duration;
    var easing;

    if (typeof(args[0]) == "number") {
      delay = args.shift();
    }
    else {
      delay = 0;
    }

    if (typeof(args[0]) == "object") {
      properties = args.shift();
    }
    else {
      properties = {};
    }

    if (typeof(args[0]) == "number") {
      duration = args.shift();
    }
    else {
      duration = 1;
    }

    if (typeof(args[0]) == "function") {
      easing = args.shift();
    }
    else {
      easing = Timeline.Easing.Linear.EaseNone;
    }

    var animGroup = [];
    var nop = function() {}

    for(var propertyName in properties) {
      var animInfo = {
        hasStarted: false,
        timeline: this.timeline,
        targetName: this.name,
        target: this.target,
        propertyName: propertyName,
        endValue: properties[propertyName],
        delay: delay,
        startTime: this.timeline.time + delay + this.endTime,
        endTime: this.timeline.time + delay + this.endTime + duration,
        easing: easing,
        parent: this,
        onStart: nop,
        onEnd: nop
      };
      this.timeline.anims.push(animInfo);
      animGroup.push(animInfo);
    }
    this.animGroups.push(animGroup);
    this.endTime += delay + duration;
    return this;
  };

  Anim.prototype.onStart = function(callback) {
    var currentAnimGroup = this.animGroups[this.animGroups.length-1];
    if (!currentAnimGroup) return;

    var called = false;

    currentAnimGroup.forEach(function(anim) {
      anim.onStart = function() {
        if (!called) {
          called = true;
          callback();
        }
      };
    })

    return this;
  }

  Anim.prototype.onUpdate = function(callback) {
    var self = this;
    this.onUpdateCallback = function() {
      callback();
    };
    return this;
  }

  Anim.prototype.onEnd = function(callback) {
    var currentAnimGroup = this.animGroups[this.animGroups.length-1];
    if (!currentAnimGroup) return;

    var called = false;

    currentAnimGroup.forEach(function(anim) {
      anim.onEnd = function() {
        if (!called) {
          called = true;
          callback();
        }
      }
    })

    return this;
  }

  function anim(targetName, targetObject, parentTimeline) {
    var args = [];
    for(var i=0; i<arguments.length; i++) {
      args.push(arguments[i]);
    }
    var name;
    var target;
    var timeline;

    if (typeof(args[0]) == "string") {
      name = args.shift();
    }

    if (typeof(args[0]) == "object") {
      target = args.shift();
    }
    else {
      target = {};
    }

    if (typeof(args[0]) == "object") {
      timeline = args.shift();
    }
    else {
      timeline = Timeline.getGlobalInstance();
    }

    return new Anim(name, target, timeline);
  }

  //--------------------------------------------------------------------

  Timeline.Easing = { Linear: {}, Quadratic: {}, Cubic: {}, Quartic: {}, Quintic: {}, Sinusoidal: {}, Exponential: {}, Circular: {}, Elastic: {}, Back: {}, Bounce: {} };

  Timeline.Easing.Linear.EaseNone = function ( k ) {
    return k;
  };

  Timeline.Easing.Quadratic.EaseIn = function ( k ) {
    return k * k;
  };

  Timeline.Easing.Quadratic.EaseOut = function ( k ) {
    return - k * ( k - 2 );
  };

  Timeline.Easing.Quadratic.EaseInOut = function ( k ) {
    if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
    return - 0.5 * ( --k * ( k - 2 ) - 1 );
  };

  Timeline.Easing.Cubic.EaseIn = function ( k ) {
    return k * k * k;
  };

  Timeline.Easing.Cubic.EaseOut = function ( k ) {
    return --k * k * k + 1;
  };

  Timeline.Easing.Cubic.EaseInOut = function ( k ) {
    if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
    return 0.5 * ( ( k -= 2 ) * k * k + 2 );
  };

  Timeline.Easing.Elastic.EaseIn = function( k ) {
    var s, a = 0.1, p = 0.4;
    if ( k === 0 ) return 0; if ( k == 1 ) return 1; if ( !p ) p = 0.3;
    if ( !a || a < 1 ) { a = 1; s = p / 4; }
    else s = p / ( 2 * Math.PI ) * Math.asin( 1 / a );
    return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
  };

  Timeline.Easing.Elastic.EaseOut = function( k ) {
    var s, a = 0.1, p = 0.4;
    if ( k === 0 ) return 0; if ( k == 1 ) return 1; if ( !p ) p = 0.3;
    if ( !a || a < 1 ) { a = 1; s = p / 4; }
    else s = p / ( 2 * Math.PI ) * Math.asin( 1 / a );
    return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );
  };

  Timeline.Easing.Elastic.EaseInOut = function( k ) {
    var s, a = 0.1, p = 0.4;
    if ( k === 0 ) return 0; if ( k == 1 ) return 1; if ( !p ) p = 0.3;
    if ( !a || a < 1 ) { a = 1; s = p / 4; }
    else s = p / ( 2 * Math.PI ) * Math.asin( 1 / a );
    if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
    return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;
  };

  Timeline.Easing.Back.EaseIn = function( k ) {
    var s = 1.70158;
    return k * k * ( ( s + 1 ) * k - s );
  };

  Timeline.Easing.Back.EaseOut = function( k ) {
    var s = 1.70158;
    return ( k = k - 1 ) * k * ( ( s + 1 ) * k + s ) + 1;
  };

  Timeline.Easing.Back.EaseInOut = function( k ) {
    var s = 1.70158 * 1.525;
    if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
    return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );
  };

  Timeline.Easing.Bounce.EaseIn = function( k ) {
    return 1 - Timeline.Easing.Bounce.EaseOut( 1 - k );
  };

  Timeline.Easing.Bounce.EaseOut = function( k ) {
    if ( ( k /= 1 ) < ( 1 / 2.75 ) ) {
      return 7.5625 * k * k;
    } else if ( k < ( 2 / 2.75 ) ) {
      return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
    } else if ( k < ( 2.5 / 2.75 ) ) {
      return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
    } else {
      return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
    }
  };

  Timeline.Easing.Bounce.EaseInOut = function( k ) {
    if ( k < 0.5 ) return Timeline.Easing.Bounce.EaseIn( k * 2 ) * 0.5;
    return Timeline.Easing.Bounce.EaseOut( k * 2 - 1 ) * 0.5 + 0.5;
  };

  Timeline.easingFunctionToString = function( f ) {
    for(var name in Timeline.easingMap) {
      if (Timeline.easingMap[name] == f) {
        return name;
      }
    }
  };

  Timeline.stringToEasingFunction = function( name ) {
    return Timeline.easingMap[name];
  };

  Timeline.easingMap = {
  };

  for(var easingFunctionFamilyName in Timeline.Easing) {
    var easingFunctionFamily = Timeline.Easing[easingFunctionFamilyName];
    for(var easingFunctionName in easingFunctionFamily) {
      Timeline.easingMap[easingFunctionFamilyName + "." + easingFunctionName] = easingFunctionFamily[easingFunctionName];
    }
  }


  //--------------------------------------------------------------------

  Timeline.anim = anim;

  if (typeof define === "function" && define.amd) {
      /* AMD */
      define('Timeline', Timeline);
  } else if (typeof module === "object" && typeof exports === "object") {
      /* CommonJS */
      module.exports['TimelineJS'] = Timeline;
  } else if (typeof exports === "object") {
      /* CommonJS2 */
      exports['TimelineJS'] = Timeline;
  } else {
      /* ES5 */
      root['Timeline'] = Timeline;
  }

}(this));