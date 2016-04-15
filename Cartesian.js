enyo.kind({
  name: "Chart.Cartesian",
  kind: "Chart",

  published: {
    xSpacingFactor: 1,
    ySpacingFactor: 1
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
  initValues: function() {
    this.inherited(arguments);

    //chose a default range for this plot.
    //This should get changed when data are added
    this.setAxisRange(-5, 5, -5, 5);
  },
  toggleOverlay: function(activate) {
    var overlay;
    
    if (activate) {
      overlay = this.createComponent({
        kind: "CartesianOverlay", name: "overlay", plotview: this
      });
      this.binding({from: "height", to: "$.overlay.chartHeight"});
      this.binding({from: "width", to: "$.overlay.chartWidth"});
    } else if (overlay = this.$.overlay) {
      overlay.destroyRegions();
      overlay.destroy();
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
    
    this.$[xy + "Ticks"].destroy();
    this.createComponent(axisKindObj);
  },
  setAxisRange: function(xMin, xMax, yMin, yMax) {
    this.xMin = isFinite(+xMin) ? +xMin : this.xMin;
    this.xMax = isFinite(+xMax) ? +xMax : this.xMax;
    this.yMin = isFinite(+yMin) ? +yMin : this.yMin;
    this.yMax = isFinite(+yMax) ? +yMax : this.yMax;
    
    //figure out the transform matrix and create a point inverting function
    this.calculateSpacing();
  },
  getAxisRange: function() {
    return [
      [this.xMin, this.xMax],
      [this.yMin, this.yMax]
    ]
  },
  calculateSpacing: function() {
    var
      margin = this.decorMargin,
      width  = this.width - margin.left - margin.right,
      height = this.height - margin.top - margin.bottom;

    this.set(
      "xSpacingFactor", width / ((+this.xMax || 0) - (+this.xMin || 0))
    );
    this.set(
      "ySpacingFactor", height / ((+this.yMax || 0) - (+this.yMin || 0))
    );
  },
  calculateMargins: function() {
    var
      yLeftTicks, yLeftTicksWidth, yRightTicks, yRightTicksWidth,
      testLabelLeft, testLabelRight;
    
    //if either the left or right y ticks are not defined,
    //just create a function to return the minimal label width
    yLeftTicks = this.$.yLeftTicks || {labelWidth: function(){return 10;}};
    yRightTicks = this.$.yRightTicks || {labelWidth: function(){return 0;}};
    
    //figure out the width of the y tick mark labels
    yLeftTicksWidth = yLeftTicks.labelWidth();
    yRightTicksWidth = yRightTicks.labelWidth();
    
    //create the longest label possible containing either the number of
    // characters in the tick label or 10 characters, whichever is larget
    testLabelLeft =
      new Array(yLeftTicksWidth > 10 ? yLeftTicksWidth : 10).join('W');
    testLabelRight =
      new Array(yRightTicksWidth).join('W');
     
    this.set("decorMargin", {
      //room for the title
      top: this.fontSize * 3,
      
      //room for two lines of x axis lables
      bottom: this.fontSize << 1,

      //convert the y label character widths to pixels
      left: this.decorCtx.measureText(testLabelLeft).width,
      right: this.decorCtx.measureText(testLabelRight).width,
    });
  },
  decorate: function() {
    var
      ctx = this.decorCtx,
      margin = this.decorMargin,
      xMin = this.xMin,
      xMax = this.xMax,
      yMin = this.yMin,
      yMax = this.yMax,
      dataHeight = this.height - margin.top - margin.bottom,
      dataWidth  = this.width - margin.left - margin.right,
      offset, tick_i, ticks;

    //make sure the x and y ranges are valid
    if(!(xMax - xMin) || !(yMax - yMin)) {
      return;
    }
    
    this.inherited(arguments);

    //configure the drawing context
    ctx.save();
    ctx.textAlign = "end";
    ctx.font = this.fontSize + "px " + this.font;

    //fill background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(margin.left, margin.top, dataWidth, dataHeight);

    //outline the grid
    ctx.strokeStyle = this.borderColor;
    ctx.fillStyle = this.borderColor;
    ctx.strokeRect(margin.left, margin.top, dataWidth, dataHeight);

    //get the tick mark locations and labels for this range
    this.$.xTicks.setRange(xMin, xMax);
    this.$.xTicks.set("tickCount",
      +this.$.xTicks.tickCount ||
      (dataWidth / (
        ctx.measureText(
          new Array(this.$.xTicks.labelWidth() || 0).join("W")
        ).width
      ))
    );

    this.$.yLeftTicks.setRange(yMin, yMax);
    this.$.yLeftTicks.set("tickCount",
      +this.$.yLeftTicks.ticktickCount || this.height / (2 * this.fontSize)
    );
    
    if (this.$.yRightTicks) {
      this.$.yRightTicks.setRange(yMin, yMax);
      this.$.yRightTicks.set("tickCount",
        +this.$.yRightTicks.tickCount || this.height / (2 * this.fontSize)
      );
    }
    
    //draw the left hand y axis tics and labels
    if (this.$.yLeftTicks) {
      ctx.save();
      ctx.translate(margin.left, dataHeight + margin.top);
      ticks = this.$.yLeftTicks.ticks;
      for (tick_i = 0; tick_i < ticks.length; tick_i++) {
        //set the color for this tick, or for this axis, or the default color
        ctx.strokeStyle =
          ticks[tick_i].color || ticks.color || this.borderColor;
       
        //get the formatted label and make sure it doesnt isnt a duplicate
        offset = -(ticks[tick_i].value - yMin) * this.ySpacingFactor;
        if (ticks[tick_i].label) {
          ctx.fillText(ticks[tick_i].label, -5, offset + 5);
        }      
        ctx.beginPath();
        ctx.moveTo(0, offset);
        if (ticks[tick_i].minor) {
          ctx.lineTo(5, offset);
        } else if (!this.$.yLeftTicks.fullLength) {
          ctx.lineTo(15, offset);
        } else {
          ctx.lineTo(dataWidth, offset);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    
    //draw the right hand y axis tics and labels
    if (this.$.yRightTicks) {
      ctx.save();
      ctx.textAlign = "start";
      ctx.translate(margin.left + dataWidth, dataHeight + margin.top);
      ticks = this.$.yRightTicks.ticks;
      for (tick_i = 0; tick_i < ticks.length; tick_i++) {
        ctx.strokeStyle =
          ticks[tick_i].color || this.$.yRightTicks.color || this.borderColor;
          
        //get the formatted label and make sure it doesnt isnt a duplicate
        offset = -(ticks[tick_i].value - yMin) * this.ySpacingFactor;
        if (ticks[tick_i].label) {
          ctx.fillText(ticks[tick_i].label, 5, offset + 5);
        }      
        ctx.beginPath();
        ctx.moveTo(0, offset);
        if (ticks[tick_i].minor) {
          ctx.lineTo(-5, offset);
        } else if (!this.$.yRightTicks.fullLength) {
          ctx.lineTo(-15, offset);
        } else {
          ctx.lineTo(-dataWidth, offset);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    
    //print the x ticks
    if (this.$.xTicks) {
      ctx.save();
      ctx.translate(margin.left, this.height - margin.bottom);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ticks = this.$.xTicks.ticks;

      for (tick_i = 0; tick_i < ticks.length; tick_i++) {
        ctx.strokeStyle =
          ticks[tick_i].color || this.$.xTicks.color || this.borderColor;
          
        offset = (ticks[tick_i].value - xMin) * this.xSpacingFactor;
        if (ticks[tick_i].label) {
          ctx.fillText(ticks[tick_i].label, offset, this.fontSize);
        }
        ctx.beginPath();
        if (ticks[tick_i].minor) {
          ctx.moveTo(offset, -5);
        } else if (!this.$.xTicks.fullLength) {
          ctx.moveTo(offset, -15);
        } else {
          ctx.moveTo(offset, -dataHeight);
        }
        
        ctx.lineTo(offset, 0);
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
        x: this.xMin + coords.x / this.xSpacingFactor,
        y: this.yMax - coords.y / this.ySpacingFactor
      };
    }
  },
  invertValue: function (pointValue) {
    if (!pointValue) {
      return null;
    } else {
      return {
        x: (pointValue.x  - this.xMin) * this.xSpacingFactor,
        y: -(pointValue.y - this.yMax) * this.ySpacingFactor
      };
    }
  },
  drawLinear: function(params) {
    var
      color = params.color || "black",
      name = params.name,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      xMin = this.xMin,
      xMax = this.xMax,
      yMin = this.yMin,
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
      xMin = this.xMin,
      xMax = this.xMax,
      yMin = this.yMin,
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
  
  draw: function(plotOptions, plottables, antialiasing) {
    plotOptions = plotOptions || {};
    plottables = plottables || {};
    
    var
      datasets = plottables.datasets,
      equations = plottables.equations,
      xMin = +plotOptions.xMin,
      xMax = +plotOptions.xMax,
      yMin = +plotOptions.yMin,
      yMax = +plotOptions.yMax;

    //do any generic Chart setup
    this.inherited(arguments);
    
    //make sure the datasets and equations are in arrays
    datasets = [].concat(datasets || []);
    equations = [].concat(equations || []);
    
    if (!(datasets.length + equations.length)) {
      return;
    }

    //make sure we have a valid range
    if (!isFinite(xMin + xMax) || !isFinite(yMin + yMax)) {
      if (datasets.length) {
        var newRange = this.getRangeFromData(datasets);
        xMin =
          isFinite(+plotOptions.xMin) ? +plotOptions.xMin : +newRange.xMin;
        xMax =
          isFinite(+plotOptions.xMax) ? +plotOptions.xMax : +newRange.xMax;
        yMin =
          isFinite(+plotOptions.yMin) ? +plotOptions.yMin : +newRange.yMin;
        yMax =
          isFinite(+plotOptions.yMax) ? +plotOptions.yMax : +newRange.yMax;
      }
    }
    
    //calculate the pixel spacing before anything else is done
    this.setAxisRange(xMin, xMax, yMin, yMax);
    
    //draw each dataset and equation
    datasets.forEach(function(dataset) {
      var name = (dataset.data || {}).name;
      
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
      this.drawDataset(dataset, this.layers[name + "_layer"].ctx, antialiasing);
      
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
  drawDataset: function(dataset, ctx, antialiasing) {
    var
      opts = dataset.options || {},
      data = dataset.data || {},
      coords = data.coords || [],
      lineWidth = +((opts.lines || {}).size),
      dotWidth = +((opts.dots || {}).size),
      subpixel = antialiasing ? 0.5 : 0,
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
      xMin = this.xMin,
      yMin = this.yMin;
    
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
      xMin = this.xMin,
      yMin = this.yMin;

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
  },
  getRangeFromData: function(datasets) {
    var
      xMin = Number.POSITIVE_INFINITY,
      xMax = Number.NEGATIVE_INFINITY,
      yMin = Number.POSITIVE_INFINITY,
      yMax = Number.NEGATIVE_INFINITY,
      buffer, xVals, yVals;
    
    datasets.forEach(function(dataset) {
      //no range was given, so dig through the coordinates and figure it out
      if (!dataset.data.range) {
        xVals = [];
        yVals = [];
        dataset.data.coords.forEach(function(coord) {
          if (isFinite(+coord[0])) {xVals.push(+coord[0]);}
          if (isFinite(+coord[1])) {yVals.push(+coord[1]);}
        });
        
        dataset.data.range = [[],[]];
        dataset.data.range[0][0] = Math.min.apply(this, xVals);
        dataset.data.range[0][1] = Math.max.apply(this, xVals);
        dataset.data.range[1][0] = Math.min.apply(this, yVals);
        dataset.data.range[1][1] = Math.max.apply(this, yVals); 
      }
      
      //see if this dataset contains a global extreme
      if (dataset.data.range[0][0] < xMin) {
        xMin = +dataset.data.range[0][0];
      }
      if (dataset.data.range[0][1] > xMax) {
        xMax = +dataset.data.range[0][1];
      }
      if (dataset.data.range[1][0] < yMin) {
        yMin = +dataset.data.range[1][0];
      }
      if (dataset.data.range[1][1] > yMax) {
        yMax = +dataset.data.range[1][1];
      }
    }, this);
    
    //we dont want the plot to have the min and max point pressed right up 
    //against the boarder, add a 10% buffer
    buffer = (yMax - yMin) * 0.1;
    
    return {
      xMin : xMin,
      xMax : xMax,
      yMin : yMin - buffer,
      yMax : yMax + buffer
    }
  },
});
