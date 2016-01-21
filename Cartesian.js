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
    
    this.initValues();
  },
  initValues: function() {
    this.inherited(arguments);

    //chose a default range for this plot.
    //This should get changed when data are added
    this.setAxisRange(-5, 5, -5, 5);
  },
  setAxisRange: function(xMin, xMax, yMin, yMax) {
    this.xMin = +xMin || this.xMin;
    this.xMax = +xMax || this.xMax;
    this.yMin = +yMin || this.yMin;
    this.yMax = +yMax || this.yMax;
    
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
      xMin = this.xMin,
      xMax = this.xMax,
      yMin = this.yMin,
      yMax = this.yMax,
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
  
  draw: function(plotRange, datasets, equations) {
    this.inherited(arguments);

    var
      xMin = +plotRange.xMin,
      xMax = +plotRange.xMax,
      yMin = +plotRange.yMin,
      yMax = +plotRange.yMax;
    
    //make sure the datasets and equations are in arrays
    datasets = [].concat(datasets || []);
    equations = [].concat(equations || []);
    
    //make sure we have a valid range
    if (!isFinite(xMin + xMax) || !isFinite(yMin + yMax)) {
      if (datasets.length) {
        var newRange = this.getRangeFromData(datasets);
        xMin = isFinite(+plotRange.xMin) ? +plotRange.xMin : +newRange.xMin;
        xMax = isFinite(+plotRange.xMax) ? +plotRange.xMax : +newRange.xMax;
        yMin = isFinite(+plotRange.yMin) ? +plotRange.yMin : +newRange.yMin;
        yMax = isFinite(+plotRange.yMax) ? +plotRange.yMax : +newRange.yMax;
      }
    }
    
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
    dataset = dataset || {};

    var
      opts = dataset.options || {},
      data = dataset.data || {},
      coords = data.coords || [],
      numPts = coords.length,
      xSpacingFactor = this.xSpacingFactor,
      ySpacingFactor = this.ySpacingFactor,
      onPath = false,
      xMin = this.xMin,
      yMin = this.yMin,
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
    
    ctx.beginPath();
    coords.forEach(function(pnt) {
      //'pnt' is a 2 element array: [x,y]
      var
        x = (pnt[0] - xMin) * xSpacingFactor,
        y = -(pnt[1] - yMin) * ySpacingFactor;
      
      //if we hit a data gap, end the current path
      if (!isFinite(y)) {
        if (opts.fill && lineWidth) {
          //need to extend line down to y=0 for proper fill
          ctx.lineTo(x, yMin);
        }
        onPath = false;
      } else {
        //make sure we have a current path
        if (!onPath) {
          if (opts.fill && lineWidth) {
            //need to extend line up from y=0 for proper fill
            ctx.moveTo(x, (yMin * ySpacingFactor));
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
    }, this);
    
    if (opts.fill) {
      if (lineWidth && !dotWidth) {
        //this will fill the area between the curve and 0.
        //we need to close the
        //curve by drawing a straight light alone y=0
        ctx.lineTo(coords[numPts - 1][0], yMin);
        ctx.lineTo(coords[0][0], yMin);
        ctx.lineTo(coords[0][0], coords[0][1]);
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
      buffer;

    datasets.forEach(function(dataset) {
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
    
    buffer = (yMax - yMin) * 0.1;
    
    return {
      xMin : xMax,
      xMax : xMin,
      yMin : yMin - buffer,
      yMax : yMax + buffer
    }
  },
});
