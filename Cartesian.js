enyo.kind({
  name: "Chart.Cartesian",
  kind: "Chart",

  published: {
    xSpacingFactor: 1,
    ySpacingFactor: 1,
    autoranging: false
  },
  
  handlers: {
    onNewRange: "setAxisRange",
    onAutorange: "autorangeAxis"
  },
  
  constructor: function(opts) {
    var axes = opts.axisTypes || {};
    this.inherited(arguments);

    //set the x axis tick mark type
    axes.x = axes.x || {};
    axes.x.type = axes.x.type || "Linear";
    axes.x.name = "xTicks";
    axes.x.kind = axes.x.type + "Ticks";
    this.createComponent(axes.x);
      
    //try to get the left y axis. If its not defined,
    //default to looking for a generic y axis
    axes.yLeft = axes.yLeft || axes.y || {};
    axes.yLeft.type = axes.yLeft.type || "Linear";
    axes.yLeft.name = "yLeftTicks";
    axes.yLeft.kind = axes.yLeft.type + "Ticks";
    this.createComponent(axes.yLeft);
    
    //get the right y axis if defined
    if (axes.yRight) {
      axes.yRight.type = axes.yRight.type || "Linear";
      axes.yRight.name = "yRightTicks";
      axes.yRight.kind = axes.yRight.type + "Ticks";
      this.createComponent(axes.yRight);
    }

    this.initValues();
  },
  rendered: function() {
    this.inherited(arguments);
    //turn on the overlay if it is set
    this.toggleOverlay(this.overlay);
  },
  initValues: function() {
    this.inherited(arguments);

    //chose a default range for this plot.
    //This should get changed when data are added
    this.startRange = [[-5,5],[-5,5]];
    this.targetRange = [[-5,5],[-5,5]];
    this.currentRange = [[-5,5],[-5,5]];
  },
  toggleOverlay: function(activate) {
    var overlay = this.$.overlay;

    if (activate && !overlay) {
      overlay = this.createComponent({
        kind: "CartesianOverlay", name: "overlay", plotview: this
      });

      this.binding({from: "height", to: "$.overlay.chartHeight"});
      this.binding({from: "width", to: "$.overlay.chartWidth"});
      this.binding({from: "crosshairs", to: "$.overlay.showCrosshairs"});
      this.binding(
        {from: "autoranging", to: "$.overlay.autoranging", oneWay: false}
      );
      
      overlay.render();
    } else if (!activate && overlay) {
      overlay.destroy();
      this.overlay = false;
    }
  },
  
  changeAxisType: function(xy, axisKindObj) {
    xy = (xy || "") + "";
    if (xy != "x" && xy != "y" && xy != "yLeft" && xy != "yRight") {return;}
    
    //if the generic y axis was defined, set yLeft instead
    xy = xy === "y" ? "yLeft" : xy;
    
    axisKindObj.name = xy + "Ticks";
    axisKindObj.type = axisKindObj.type || "Linear";
    axisKindObj.kind = axisKindObj.type + "Ticks";
    
    if (this.$[xy + "Ticks"]) {
      this.$[xy + "Ticks"].destroy();
    }
    this.createComponent(axisKindObj);
  },
  calculateSpacing: function() {
    var
      margin = this.decorMargin,
      width  = this.width - margin.left - margin.right,
      height = this.height - margin.top - margin.bottom;

    this.set(
      "xSpacingFactor",
      width / ((+this.currentRange[0][1] || 0) - (+this.currentRange[0][0] || 0))
    );
    this.set(
      "ySpacingFactor",
      height / ((+this.currentRange[1][1] || 0) - (+this.currentRange[1][0] || 0))
    );
  },
  calculateMargins: function() {
    var
      yLeftTicks, yLeftTicksWidth, yRightTicks, yRightTicksWidth,
      testLabelLeft, testLabelRight, oldMargins;
    
    //if either the left or right y ticks are not defined,
    //just create a function to return the minimal label width
    yLeftTicks = this.$.yLeftTicks || {labelWidth: function(){return 10;}};
    yRightTicks = this.$.yRightTicks || {labelWidth: function(){return 0;}};
    
    //figure out the width of the y tick mark labels
    yLeftTicksWidth = yLeftTicks.innerLabel? 0 : yLeftTicks.labelWidth();
    yRightTicksWidth = yRightTicks.innerLabel? 0 : yRightTicks.labelWidth();

    //create the longest label possible containing either the number of
    // characters in the tick label or 10 characters, whichever is larget
    testLabelLeft =
      new Array(yLeftTicksWidth > 10 ? yLeftTicksWidth : 10).join('W');
    testLabelRight =
      new Array(yRightTicksWidth).join('W');
    
    oldMargins = this.decorMargin;
    
    this.set("decorMargin", {
      //room for the title
      top: this.fontSize * 3,
      
      //room for two lines of x axis lables
      bottom: this.fontSize << 1,

      //convert the y label character widths to pixels
      left: this.decorCtx.measureText(testLabelLeft).width,
      right: this.decorCtx.measureText(testLabelRight).width,
    });

    if (this.overlay && this.$.overlay) {
     this.$.overlay.set("marginLeft", this.decorMargin.left); 
     this.$.overlay.set("marginRight", this.decorMargin.right);
     this.$.overlay.set("marginTop", this.decorMargin.top);
     this.$.overlay.set("marginBottom", this.decorMargin.bottom); 
    }
  },
  decorate: function() {
    var
      ctx = this.decorCtx,
      margin = this.decorMargin,
      range = this.currentRange || {},
      xMin = range[0][0],
      xMax = range[0][1],
      yMin = range[1][0],
      yMax = range[1][1],
      dataHeight = this.height - margin.top - margin.bottom,
      dataWidth  = this.width - margin.left - margin.right,
      labelOffset, tickOffset, tick_i, ticks, axis;

    //make sure the x and y ranges are valid
    if(!(xMax - xMin) || !(yMax - yMin)) {
      return;
    }
    
    this.inherited(arguments);

    //configure the drawing context
    ctx.save();
    ctx.font = this.fontSize + "px " + this.font;

    //fill background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(margin.left, margin.top, dataWidth, dataHeight);

    //outline the grid
    ctx.strokeStyle = this.borderColor;
    ctx.fillStyle = this.borderColor;
    ctx.strokeRect(margin.left, margin.top, dataWidth, dataHeight);

    //draw the left hand y axis tics and labels
    if ((axis = this.$.yLeftTicks)) {
      axis.setRange(yMin, yMax);
      axis.set("tickCount",
        +axis.tickCount || this.height / (2 * this.fontSize)
      );
      
      ctx.save();
      
      if (axis.innerLabel) {
        ctx.textAlign = "start";
        labelOffset = 15;
      } else {
        ctx.textAlign = "end";
        labelOffset = -5;
      }
      
      ctx.translate(margin.left, dataHeight + margin.top);
      ticks = axis.ticks;
      for (tick_i = 0; tick_i < ticks.length; tick_i++) {
        //set the color for this tick, or for this axis, or the default color
        ctx.strokeStyle =
          ticks[tick_i].color || ticks.color || this.borderColor;
       
        //get the formatted label and make sure it doesnt isnt a duplicate
        tickOffset = -(ticks[tick_i].value - yMin) * this.ySpacingFactor;
        if (ticks[tick_i].label) {
          ctx.fillText(ticks[tick_i].label, labelOffset, tickOffset + 5);
        }      
        ctx.beginPath();
        ctx.moveTo(0, tickOffset);
        if (ticks[tick_i].minor) {
          ctx.lineTo(5, tickOffset);
        } else if (axis.fullLength || ticks[tick_i].fullLength) {
          ctx.lineTo(dataWidth, tickOffset);
        } else {
          ctx.lineTo(15, tickOffset);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    
    //draw the right hand y axis tics and labels
    if ((axis = this.$.yRightTicks)) {
      axis.setRange(yMin, yMax);
      axis.set("tickCount",
        +axis.tickCount || this.height / (2 * this.fontSize)
      );
      
      ctx.save();
      if (axis.innerLabel) {
        ctx.textAlign = "end";
        labelOffset = -15;
      } else {
        ctx.textAlign = "start";
        labelOffset = 5;
      }
      
      ctx.translate(margin.left + dataWidth, dataHeight + margin.top);
      ticks = axis.ticks;
      for (tick_i = 0; tick_i < ticks.length; tick_i++) {
        ctx.strokeStyle =
          ticks[tick_i].color || axis.color || this.borderColor;
          
        //get the formatted label and make sure it doesnt isnt a duplicate
        tickOffset = -(ticks[tick_i].value - yMin) * this.ySpacingFactor;
        if (ticks[tick_i].label) {
          if ((axis.fullLength||ticks[tick_i].fullLength) && axis.innerLabel) {
            ctx.textBaseline = "top";
            ctx.fillText(
              ticks[tick_i].label, labelOffset, tickOffset - this.fontSize
            );
          } else {
            ctx.fillText(ticks[tick_i].label, labelOffset, tickOffset + 5); 
          }
        }      
        ctx.beginPath();
        ctx.moveTo(0, tickOffset);
        if (ticks[tick_i].minor) {
          ctx.lineTo(-5, tickOffset);
        } else if (axis.fullLength || ticks[tick_i].fullLength) {
          ctx.lineTo(-dataWidth, tickOffset);
        } else {
          ctx.lineTo(-15, tickOffset);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    
    //print the x ticks
    if ((axis = this.$.xTicks)) {
      axis.setRange(xMin, xMax);
      axis.set("tickCount",
        +axis.tickCount ||
        (dataWidth / (
          ctx.measureText(
            new Array(axis.labelWidth() || 0).join("W")
          ).width
        ))
      );
      
      ctx.save();
      ctx.translate(margin.left, this.height - margin.bottom);
      ctx.textAlign = "center";
      if (axis.innerLabel) {
        ctx.textBaseline = "bottom";
        labelOffset = -15 - this.fontSize;
      } else {
        ctx.textBaseline = "top";
        labelOffset = this.fontSize;
      }

      ticks = axis.ticks;

      for (tick_i = 0; tick_i < ticks.length; tick_i++) {
        ctx.strokeStyle =
          ticks[tick_i].color || axis.color || this.borderColor;
          
        tickOffset = (ticks[tick_i].value - xMin) * this.xSpacingFactor;
        if (ticks[tick_i].label) {
          ctx.fillText(ticks[tick_i].label, tickOffset, labelOffset);
        }
        ctx.beginPath();
        if (ticks[tick_i].minor) {
          ctx.moveTo(tickOffset, -5);
        } else if (!axis.fullLength) {
          ctx.moveTo(tickOffset, -15);
        } else {
          ctx.moveTo(tickOffset, -dataHeight);
        }
        
        ctx.lineTo(tickOffset, 0);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    ctx.restore();
  },
  invertCoordinates: function(coords) {
    if (!coords) {
      return null;
    } else {
      return {
        x: this.currentRange[0][0] + coords.x / this.xSpacingFactor,
        y: this.currentRange[1][1] - coords.y / this.ySpacingFactor
      };
    }
  },
  invertValue: function (pointValue) {
    if (!pointValue) {
      return null;
    } else {
      return {
        x: (pointValue.x  - this.currentRange[0][0]) * this.xSpacingFactor,
        y: -(pointValue.y - this.currentRange[1][1]) * this.ySpacingFactor
      };
    }
  },
  drawLinear: function(params) {
    var
      color = params.color || "black",
      name = params.name,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      xMin = this.currentRange[0][0],
      xMax = this.currentRange[0][1],
      yMin = this.currentRange[1][0],
      m = params.m || 0,
      b = params.b || 0,
      x1 = xMin,
      x2 = xMax,
      y1 = x1 * m + b,
      y2 = x2 * m + b,
      ctx;

    //make sure there is a canvas for this variable and get the context
    if (!this.layers[name + "_layer"]) {
      this.createDataCanvas(name);
    }
    ctx = this.layers[name + "_layer"].ctx;

    //configure the size and color of the brush
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.setLineDash([10, 10]);

    //move to the bottom left corner of the dataCanvas
    ctx.translate(
      0, this.height - this.decorMargin.top - this.decorMargin.bottom
    );  

    ctx.beginPath();
    ctx.moveTo(0, -(y1 - yMin) * ySpacingFactor);
    ctx.lineTo((x2 - x1) * xSpacingFactor, -(y2 - yMin) * ySpacingFactor);
    ctx.stroke();
  
    ctx.restore();
  },
  drawParabola: function(params) {
    var
      color = params.color || "black",
      name = params.name,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      xMin = this.currentRange[0][0],
      xMax = this.currentRange[0][1],
      yMin = this.currentRange[1][0],
      a = params.a || 0,
      b = params.b || 0,
      c = params.c || 0,
      vertex = params.vertex || [0,0],
      width = xMax - xMin,
      x1 = vertex[0] - width,
      y1 = (a * Math.pow(x1, 2)) + (b * x1) + c,
      x2 = vertex[0] + width,
      y2 = y1,
      tanM = 2 * a * x1 + b,
      tanB = y1 - (tanM * x1),
      cp1y = (tanM * vertex[0]) + tanB,
      ctx;

    //make sure there is a canvas for this variable and get the context
    if (!this.layers[name + "_layer"]) {
      this.createDataCanvas(name);
    }
    ctx = this.layers[name + "_layer"].ctx;

    //configure the size and color of the brush
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.setLineDash([10, 10]);

    //move to the bottom left corner of the dataCanvas
    ctx.translate(
      0, this.height - this.decorMargin.top - this.decorMargin.bottom
    );
    
    ctx.beginPath();
    ctx.moveTo(
      (x1 - xMin) * xSpacingFactor, -(y1 - yMin) * ySpacingFactor
    );
    ctx.quadraticCurveTo(
      (vertex[0] - xMin) * xSpacingFactor, -(cp1y - yMin) * ySpacingFactor,
      (x2 - xMin) * xSpacingFactor, -(y2 - yMin) * ySpacingFactor
    );
    ctx.stroke();
  
    ctx.restore();
  },
  autorangeAxis: function(inSender, inEvent) {
    var
      datasets = this.datasets || [],
      equations = this.equations || [],
      range = this.currentRange || {},
      xMin = +range[0][0],
      xMax = +range[0][1],
      easingAxes = [false, true]; //ease only the y axis by default
    
    //If x axis range is not already set, get it from the data
    if (!isFinite(xMin + xMax)) {
      easingAxes[0] = true;//also ease the x axis if it wasnt defined
      
      if (datasets.length) {
        range = this.getRangeFromData(datasets, 0);
        xMin = isFinite(xMin) ? xMin : +range.min;
        xMax = isFinite(xMax) ? xMax : +range.max;
      }
    }
    
    //get the y axis range from the datapoints in the x axis range
    range = this.getRangeFromData(datasets, 1, {axis: 0, min: xMin, max: xMax});

    this.setAxisRange(null, {
      range: [[xMin, xMax], [+range.min, +range.max]],
      easingStart: range.badRange? 0 : enyo.perfNow(),
      easingAxes: easingAxes
    });
    
    return true;
  },
  draw: function() {
    var
      //make sure the datasets and equations are in arrays
      datasets = this.datasets || [],
      equations = this.equations || [],
      easeStart, easeProgress, easeAxes;

    //do any generic Chart setup
    //if Chart decides we dont need to draw anything, abort.
    if (!this.inherited(arguments)) {
      return;
    }

    //if we are currently easing the axis range, updated the current range
    //based on how long it has been since we started the easing
    if ((easeStart = this.targetRange.easingStart)) {
      easeProgress = enyo.easedLerp(easeStart, 250, enyo.easing.cubicOut);
      
      //if we have reached 90% of our target
      //or fps has dropped below 10, cancel easing
      if (easeProgress > 0.9 || this.fps < 10) {
        this.targetRange.easingStart = null;
        this.currentRange = [
          [this.targetRange[0][0], this.targetRange[0][1]],
          [this.targetRange[1][0], this.targetRange[1][1]]
        ];
      } else {
        easeAxes = this.targetRange.easingAxes;
        
        this.currentRange = [
          [
            this.startRange[0][0] +
              (this.targetRange[0][0] - this.startRange[0][0]) * 
                (easeAxes[0] ? easeProgress : 1),
            this.startRange[0][1] +
              (this.targetRange[0][1] - this.startRange[0][1]) * 
                (easeAxes[0] ? easeProgress : 1)
          ],
          [
            this.startRange[1][0] +
              (this.targetRange[1][0] - this.startRange[1][0]) * 
                (easeAxes[1] ? easeProgress : 1),
            this.startRange[1][1] +
              (this.targetRange[1][1] - this.startRange[1][1]) * 
                (easeAxes[1] ? easeProgress : 1)
          ]
        ];
        
        //still easing so we need to draw again
        this.needsDraw = true;
      }
    } else if (this.autoranging && this.newRange) {
      this.autorangeAxis();
    }
    
    this.newRange = false;
    
    //calculate the pixel spacing before anything else is done
    this.calculateSpacing();
    
    //draw each dataset and equation
    datasets.forEach(function(dataset) {
      var name = dataset.name || (dataset.data || {}).name;
      
      //if this dataset doesnt have a name, just give it the layer number
      if (!name) {
        (dataset.data || {}).name = name = Object.keys(this.layers).length;
      }
      
      //check if we already have a layer for this dataset
      if (!this.layers[name + "_layer"]) {
        //this is a new dataset, create a layer for it
        this.createDataCanvas(name, dataset.options);
      }
      
      //draw the dataset onto the canvas
      this.drawDataset(dataset, this.layers[name + "_layer"].ctx);
      
      //remeber what we plotted this time
      this.activeLayerNames[name + "_layer"] = true;
    }, this);
    
    equations.forEach(function(dataset) {
      var
        opts = dataset.options || {},
        name = opts.name;
      
      if (!name) {
        opts.name = name = Object.keys(this.layers).length;
      }
      if (!this.layers[name + "_layer"]) {
        this.createDataCanvas(name);
      }
      this.drawEquation(dataset, this.layers[name + "_layer"].ctx);
    }, this);
    
    //remove any unused layers
    this.cleanup();
    
    //add the plot border and tic marks
    this.decorate();
  },
  drawDataset: function(dataset, ctx) {
    var
      opts = dataset.options || {},
      data = dataset.data || {},
      coords = data.coords || [],
      lineWidth = +((opts.lines || {}).size),
      dotWidth = +((opts.dots || {}).size),
      subpixel = this.antialiasing ? 0.5 : 0,
      dot;
      
      //bail out if there are no data to plot
      if(!coords.length) {return;}
      
      //clear the drawing canvas unless noClobber is set
      if (!opts.noClobber) {
        this.resetLayer(opts.name);
      }
      
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = opts.color || "black";
      
      //move to the bottom left corner of the dataCanvas
      ctx.translate(
        0, this.height - this.decorMargin.top - this.decorMargin.bottom
      );
  
      if (dotWidth) {
        dot = this.$.renderedPoint;
        dot.set("color", opts.color);
        dot.set("size", dotWidth);
        dot.set("fill", opts.dots.fill);
        
        this.drawDots(ctx, coords, dot.node, dotWidth);
      }
      if (lineWidth) {
        this.drawLine(ctx, coords, lineWidth, opts.lines, subpixel);
      }
      ctx.restore();
  },
  drawDots: function(ctx, coords, dotCanvas, dotWidth) {
    var
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      xMin = this.currentRange[0][0],
      yMin = this.currentRange[1][0];
    
    coords.forEach(function(pnt) {
      //'pnt' is a 2 element array: [x,y].
      //If we have antialiasing on we will shift the 
      //x and y coordinates by a half pixel.

      var
        x = (((pnt[0] - xMin) * xSpacingFactor) >> 0),
        y = ((-(pnt[1] - yMin) * ySpacingFactor) >> 0);
      
      //if we hit a data gap, end the current path
      if (isFinite(y)) {
        ctx.drawImage(dotCanvas, x - dotWidth, y - dotWidth);
      }
    }, this);    
  },
  drawLine: function(ctx, coords, lineWidth, opts, subpixel) {
    var
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      onPath = false,
      xMin = this.currentRange[0][0],
      yMin = this.currentRange[1][0];

    ctx.save();
    
    ctx.lineWidth = lineWidth;
    
    ctx.beginPath();
    coords.forEach(function(pnt) {
      //'pnt' is a 2 element array: [x,y].
      //If we have antialiasing on we will shift the 
      //x and y coordinates by a half pixel.

      var
        x = (((pnt[0] - xMin) * xSpacingFactor) >> 0)  + subpixel,
        y = ((-(pnt[1] - yMin) * ySpacingFactor) >> 0) + subpixel;
      
      //if we hit a data gap, end the current path
      if (!isFinite(y)) {
        onPath = false;
      } else {
        //make sure we have a current path
        if (!onPath) {
          ctx.moveTo(x, y);
          onPath = true;
        } else {
          if (lineWidth) {
            ctx.lineTo(x, y);
          }
        }
      }
    }, this);
    
    if (opts.fill) {
      if (lineWidth) {
        //this will fill the area between the curve and 0.
        //we need to close the
        //curve by drawing a straight light alone y=0
        ctx.lineTo(
          (((coords[0][0] - xMin) * xSpacingFactor) >> 0),
          ((-(coords[0][1] - yMin) * ySpacingFactor) >> 0)
        );
        /*ctx.lineTo(coords[coords.length - 1][0], yMin);
        ctx.lineTo(coords[0][0], yMin);
        ctx.lineTo(coords[0][0], coords[0][1]);*/
      }
      ctx.fill();
    } else {
      ctx.stroke(); 
    }    
    ctx.restore();
  }
});
