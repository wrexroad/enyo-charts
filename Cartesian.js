enyo.kind({
  name: "Chart.Cartesian",
  kind: "Chart",

  published: {
    xSpacingFactor: 1,
    ySpacingFactor: 1
  },

  constructor: function() {
    this.inherited(arguments);

    this.formatters = {x: this.defaultFormatter, y: this.defaultFormatter};

    //this.initValues();
  },
  /*initValues: function() {
    this.inherited(arguments);

    this.axisRange = {x: {min: NaN, max: NaN}, y: {min: NaN, max: NaN}};
    this.fullAxisRange = {x: {min: NaN, max: NaN}, y: {min: NaN, max: NaN}};
  },*/
  /*setAxisRange: function(axis, min, max) {
    var
      range = this.axisRange,
      offset;

    if (!(axis = (axis || "").toLowerCase())) {
      return false;
    }

    if (!isFinite(+min)) {
      min = this.fullAxisRange[axis].min;
    }
    if (!isFinite(+max)) {
      max = this.fullAxisRange[axis].max;
    }

    //make sure min != max
    if (min == max) {
      //get a number that is the same order of magnitude as the number
      //of decimal places
      offset = Math.pow(10, -this.getDecimalPlaces([min]));
      min -= offset;
      max += offset;
    }

    //build the new range from these min and max values and the other axes
    range[axis] = {
      min: min, max: max
    };
    
    return range;
  },*/
  calculateSpacing: function(xMin, xMax, yMin, yMax) {
    var
      margin = this.decorMargin,
      width  = this.width - margin.left - margin.right,
      height = this.height - margin.top - margin.bottom;

    this.set(
      "xSpacingFactor", width / ((+xMax || 0) - (+xMin || 0))
    );
    this.set(
      "ySpacingFactor", height / ((+yMax || 0) - (+yMin || 0))
    );
  },
  /*calculateSpacing: function() {
    var
      yRange = this.axisRange.y,
      xRange = this.axisRange.x,
      margin = this.decorMargin,
      width  = this.width - margin.left - margin.right,
      height = this.height - margin.top - margin.bottom;

    this.set(
      "xSpacingFactor", width / ((+xRange.max || 0) - (+xRange.min || 0))
    );
    this.set(
      "ySpacingFactor", height / ((+yRange.max || 0) - (+yRange.min || 0))
    );
  },*/
  calculateMargins: function() {
    this.set("decorMargin", {
      //room for the title
      top: this.fontSize,
      
      //room for two lines of x axis lables
      bottom: this.fontSize << 1,

      //y axis lables can be 10 charcters wide
      left: this.decorCtx.measureText((new Array(10)).join('W')).width,

      right: 5
    });
  },
  decorate: function() {
    var
      ctx = this.decorCtx,
      margin = this.decorMargin,
      formatters = this.formatters,
      yFormat = formatters.y,
      xFormat = formatters.x,
      axisRange = this.axisRange,
      yRange = axisRange.y,
      yMin = yRange.min || 0,
      yMax = yRange.max || 0,
      xRange = axisRange.x,
      xMin = xRange.min || 0,
      xMax = xRange.max || 0,
      dataHeight = this.height - margin.top - margin.bottom,
      dataWidth  = this.width - margin.left - margin.right,
      diff, scale, value, step, offset, minor_i,
      text_i, labelWidth, decimalPlaces, firstTic, lastTic, numTics;

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

    diff = (yMax - yMin) / 10; 

    // get the integer and fractional part of the scale's magnitude
    scale = Math.log10(diff);
    scale -= scale >> 0;
    
    // pick a canonical scale
    if (scale < 0.3010299956639812) { // scale < Math.log10(2)
      step = 0.1;
    }
    else if (scale < 0.6989700043360189) { // scale < Math.log10(5)
      step = 0.2;
    }
    else {
      step = 0.5;
    }

    // get the step size with the proper exponent
    step *= Math.pow(10, (Math.log10(diff)) >> 0);

    decimalPlaces = this.getDecimalPlaces(step);
  
    //draw the y axis tics and labels
    if (step > 0) {
      ctx.save();

      //move to the bottom left corner of the dataCanvas
      ctx.translate(margin.left, dataHeight + margin.top);

      //use a for loop to draw all tic execpt the last one
      firstTic = Math.ceil(yMin / step) * step;
      lastTic = ((yMax / step) >> 0) * step;
      for (
        value = firstTic, minor_i = 0;
        value <= lastTic;
        value = this.add(value, step), minor_i++
      ) {
        //if we have drawn 10 minor tics, include a major
        if ((minor_i % 10) === 0) {
          //get the formatted label and make sure it doesnt isnt a duplicate
          text_i = yFormat(value, decimalPlaces);

          offset = -(text_i - yMin) * this.ySpacingFactor;
          
          ctx.fillText(text_i, -5, offset + 5);
          ctx.beginPath();
          ctx.moveTo(0, offset);
          ctx.lineTo(15, offset);
          ctx.stroke();
        } else {
          //draw the minor tic mark
          offset = -(value - yMin) * this.ySpacingFactor;
          ctx.beginPath();
          ctx.moveTo(0, offset);
          ctx.lineTo(5, offset);
          ctx.stroke(); 
        }
      }
      ctx.restore();
    }

    //figure out the x label width. Assume that no labels will be longer than 
    //the min or max values.
    //If a min or max can not be found, just assume 20 characters
    labelWidth =
      ctx.measureText(
        (new Array(
          Math.max(xFormat(xMin).length, xFormat(xMax).length) || 20
        )).join('W')
      ).width;

    //decimalPlaces = this.getDecimalPlaces(xMax, xMin);
    numTics = Math.ceil(dataWidth / (labelWidth)) >> 0;
    step = (xMax - xMin) / numTics / 10;

    if (step > 0) {
      ctx.save();
      ctx.translate(margin.left, this.height - margin.bottom);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (
        value = xMin, minor_i = 0;
        value < xMax;
        value = this.add(value, step), minor_i++
      ) {
        if ((minor_i % 10) === 0) {
          offset = (value - xMin) * this.xSpacingFactor;
          ctx.fillText(xFormat(value, decimalPlaces), offset, this.fontSize);
          ctx.beginPath();
          ctx.moveTo(offset, -15);
          ctx.lineTo(offset, 0);
          ctx.stroke();
        } else {
          //draw the minor tic mark
          offset = (value - xMin) * this.xSpacingFactor;
          ctx.beginPath();
          ctx.moveTo(offset, -5);
          ctx.lineTo(offset, 0);
          ctx.stroke(); 
        }
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
        x: this.axisRange.x.min + coords.x / this.xSpacingFactor,
        y: this.axisRange.y.max - coords.y / this.ySpacingFactor
      };
    }
  },
  invertValue: function (pointValue) {
    if (!pointValue) {
      return null;
    } else {
      return {
        x: (pointValue.x  - this.axisRange.x.min) * this.xSpacingFactor,
        y: -(pointValue.y - this.axisRange.y.max) * this.ySpacingFactor
      };
    }
  },/*
  addDataset: function(name, data) {
    var
      coords, xCoords, yCoords, fullRange,
      xRange, yRange, newData, cached;
    
    data = data || {}; 
    coords = data.coords || {};
    xCoords = coords.x || [];
    yCoords = coords.y || [];
    fullRange = this.fullAxisRange || {};
    xRange = fullRange.x || {};
    yRange = fullRange.y || {};

    if (!xCoords.length || !yCoords.length) {
      //no data
      return false;
    }

    //check if we already have this dataset
    if (!this.dataCache) {
      this.dataCache = {};
      newData = true;
    } else {
      cached = this.dataCache[name] || {};
      if (data.checksum && data.checksum == cached.checksum) {
        newData = false;
      } else {
        newData = true;
        //somehow the dataset has changed, update the full scale axis range
        this.fullAxisRange = {
          x: {
            min: Math.min.apply(this,
              xCoords.concat(xRange.min || Number.MAX_SAFE_INTEGER)
            ),
            max: Math.max.apply(this,
              xCoords.concat(xRange.max || Number.MIN_SAFE_INTEGER)
            )
          },
          y: {
            min: Math.min.apply(this,
              yCoords.concat(yRange.min || Number.MAX_SAFE_INTEGER)
            ),
            max: Math.max.apply(this,
              yCoords.concat(yRange.max || Number.MIN_SAFE_INTEGER)
            )
          }
        };
      } 
    }

    //cache the new dataset for use in redraws
    if (data.update) {
      //add to the old cache
      (this.dataCache[name].coords.x).push(xCoords);
      (this.dataCache[name].coords.y).push(yCoords);
    } else {
      //replace the old cache even if we dont have new data
      //some of the settings may have changed
      this.dataCache[name] = data;
    }
    
    return newData;
  },
  removeDataset: function(name) {
    if (this.dataCache[name]) {
      delete this.dataCache[name];
    }
  },
  clearCache: function() {
    this.dataCache = null;
    this.axisRange = {x: {min: NaN, max: NaN}, y: {min: NaN, max: NaN}};
  },*/
  drawLinear: function(params) {
    var
      color = params.color || "black",
      name = params.name,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      range = this.axisRange || {},
      xRange = range.x || {},
      yRange = range.y || {},
      m = params.m || 0,
      b = params.b || 0,
      x1 = xRange.min,
      x2 = xRange.max,
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
    ctx.moveTo(0, -(y1 - yRange.min) * ySpacingFactor);
    ctx.lineTo((x2 - x1) * xSpacingFactor, -(y2 - yRange.min) * ySpacingFactor);
    ctx.stroke();
  
    ctx.restore();
  },
  drawParabola: function(params) {
    var
      color = params.color || "black",
      name = params.name,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      range = this.axisRange || {},
      xRange = range.x || {},
      yRange = range.y || {},
      a = params.a || 0,
      b = params.b || 0,
      c = params.c || 0,
      vertex = params.vertex || [0,0],
      width = xRange.max - xRange.min,
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
      (x1 - xRange.min) * xSpacingFactor,
      -(y1 - yRange.min) * ySpacingFactor
    );
    ctx.quadraticCurveTo(
      (vertex[0] - xRange.min) * xSpacingFactor,
      -(cp1y - yRange.min) * ySpacingFactor,
      (x2 - xRange.min) * xSpacingFactor,
      -(y2 - yRange.min) * ySpacingFactor
    );
    ctx.stroke();
  
    ctx.restore();
  },
  /*
  drawData: function(data) {
    var
      style = data.style || {},
      coords = data.coords || {},
      xCoords = coords.x || [],
      yCoords = coords.y || [],
      numPts = yCoords.length,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      onPath = false,
      range = this.axisRange || {},
      xRange = range.x || {},
      yRange = range.y || {},
      lineWidth = style.lineSize,
      dotWidth = style.dotSize,
      halfDot = style.dotSize / 2,
      pnt_i, x, y, ctx;

    //bail out if there are no data to plot
    if(!numPts) {return;}

    //make sure there is a canvas for this variable and get the context
    if (!this.layers[data.name + "_layer"]) {
      this.createDataCanvas(data.name);
    }
    ctx = this.layers[data.name + "_layer"].ctx;

    //auto generate some xaxis coordinates if they are not provided
    if(!xCoords.length) {
      for(pnt_i = 0; pnt_i < numPts; pnt_i++) {
        xCoords[pnt_i] = pnt_i;
      }
    }

    //configure the size and color of the brush
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = ctx.fillStyle = style.color;

    //move to the bottom left corner of the dataCanvas
    ctx.translate(
      0, this.height - this.decorMargin.top - this.decorMargin.bottom
    );
    
    ctx.beginPath();
    for (pnt_i = 0; pnt_i < numPts; pnt_i++) {
      //get the value of each point
      x = xCoords[pnt_i];
      y = yCoords[pnt_i];
      
      //convert the value to a pixel coordinate
      x = (x - xRange.min) * xSpacingFactor;
      y = -(y - yRange.min) * ySpacingFactor;

      //if we hit a data gap, end the current path
      if (isNaN(y)) {
        if (style.fill && lineWidth) {
          //need to extend line down to y=0 for proper fill
          ctx.lineTo(
            x, (yRange.min * ySpacingFactor)
          );
        }
        onPath = false;
      } else {
        //make sure we have a current path
        if (!onPath) {
          if (style.fill && lineWidth) {
            //need to extend line up from y=0 for proper fill
            ctx.moveTo(x, (yRange.min * ySpacingFactor));
            ctx.lineTo(x, y);
          } else {
            //not filling so we can just move the brush to
            //the new coordinate without worrying about connecting
            ctx.moveTo(x, y);  
          }
          
          onPath = true;
        } else {
          if (lineWidth) {
            ctx.lineTo(x, y);
          }
          if (dotWidth) {
            ctx.moveTo(x, y);
            ctx.arc(x - halfDot, y - halfDot, dotWidth, 0, 7);
          }
        }
      }
    }
    
    if (style.fill) {
      if (lineWidth && !dotWidth) {
        //this will fill the area between the curve and 0. we need to close the
        //curve by drawing a straight light alone y=0
        ctx.lineTo(
          x, (yRange.min * ySpacingFactor)
        );
        ctx.lineTo(
          ((xCoords[0] - xRange.min) * xSpacingFactor),
          (yRange.min * ySpacingFactor)
        );
        ctx.lineTo(
          ((xCoords[0] - xRange.min) * xSpacingFactor),
          ((yRange.min - yCoords[0]) * ySpacingFactor)
        );
      }
      ctx.fill();
    } else {
      ctx.stroke(); 
    }    
    ctx.restore();
  }*/
  draw: function(plotRange, datasets, equations) {
    var
      xMin = +plotRange.xMin,
      xMax = +plotRange.xMax,
      yMin = +plotRange.yMin,
      yMax = +plotRange.yMax;
    
    //make sure we have a valid range
    if (!isFinite(xMin + xMax) || !isFinite(yMin + yMax)) {
      if (datasets) {
        var newRange = this.getRangeFromData(datasets);
        xMin = isFinite(+plotRange.xMin) ? +plotRange.xMin : +newRange.xMin;
        xMax = isFinite(+plotRange.xMax) ? +plotRange.xMax : +newRange.xMax;
        yMin = isFinite(+plotRange.yMin) ? +plotRange.yMin : +newRange.yMin;
        yMax = isFinite(+plotRange.yMax) ? +plotRange.yMax : +newRange.yMax;
      }
    }
    
    //figure out the transform matrix and create a point inverting function
    this.calculateSpacing(xMin, xMax, yMin, yMax);
    
    //make sure the datasets and equations are in arrays
    datasets = [].concat(datasets);
    equations = [].concat(equations);
    
    //draw each dataset and equation
    datasets.forEach(function(dataset) {
      var
        opts = dataset.options || {},
        name = opts.name;
      
      //if this dataset doesnt have a name, just give it the layer number
      if (!name) {
        opts.name = name = Object.keys(this.layers).length;
      }
      
      //check if we already have a layer for this dataset
      if (!this.layers[name + "_layer"]) {
        //this is a new dataset, create a layer for it
        this.createDataCanvas(name);
      }
      
      //draw the dataset onto the canvas
      this.drawDataset(dataset, this.layers[name + "_layer"].ctx);
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
  },
  drawDataset: function(dataset, ctx) {
    var
      coords = dataset.data || [],
      opts = dataset.options || {},
      numPts = coords.length,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      onPath = false,
      range = this.axisRange || {},
      xRange = range.x || {},
      yRange = range.y || {},
      lineWidth = +((opts.lines || {}).size) || 0.5,
      dotWidth = +((opts.dots || {}).size) || 0,
      halfDot = dotWidth / 2;

    //bail out if there are no data to plot
    if(!numPts) {return;}

    //clear the drawing canvas unless noClobber is set
    if (!opts.noClobber) {
      this.resetLayer(opts.name);
    }

    //configure the size and color of the brush
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = ctx.fillStyle = opts.color || "black";

    //move to the bottom left corner of the dataCanvas
    ctx.translate(
      0, this.height - this.decorMargin.top - this.decorMargin.bottom
    );
    
    //set the transform matrix.
    //We translate the point to the canvas origin, then scale it based on
    //value-to-pixel ratio 
    ctx.setTransform(
      xSpacingFactor, 0, 0, -ySpacingFactor, -xRange.min, -yRange.min
    );
    
    ctx.beginPath();
    coords.forEach(function(pnt) {
      //'pnt' is a 2 element array: [x,y]
      
      //if we hit a data gap, end the current path
      if (!isFinite(pnt[1])) {
        if (opts.fill && lineWidth) {
          //need to extend line down to y=0 for proper fill
          ctx.lineTo(pnt[0], yRange.min);
        }
        onPath = false;
      } else {
        //make sure we have a current path
        if (!onPath) {
          if (opts.fill && lineWidth) {
            //need to extend line up from y=0 for proper fill
            ctx.moveTo(pnt[0], (yRange.min * ySpacingFactor));
            ctx.lineTo(pnt[0], pnt[1]);
          } else {
            //not filling so we can just move the brush to
            //the new coordinate without worrying about connecting
            ctx.moveTo(pnt[0], pnt[1]);  
          }
          
          onPath = true;
        } else {
          if (lineWidth) {
            ctx.lineTo(pnt[0], pnt[1]);
          }
          if (dotWidth) {
            ctx.moveTo(pnt[0], pnt[1]);
            ctx.arc(pnt[0] - halfDot, pnt[1] - halfDot, dotWidth, 0, 7);
          }
        }
      }
    }, this);
    
    if (opts.fill) {
      if (lineWidth && !dotWidth) {
        //this will fill the area between the curve and 0.
        //we need to close the
        //curve by drawing a straight light alone y=0
        ctx.lineTo(coords[numPts - 1][0], yRange.min);
        ctx.lineTo(coords[0][0], yRange.min);
        ctx.lineTo(coords[0][0], coords[0][1]);
      }
      ctx.fill();
    } else {
      ctx.stroke(); 
    }    
    ctx.restore();
  }
});
