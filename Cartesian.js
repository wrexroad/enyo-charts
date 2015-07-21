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

    this.axisRange = {x: {min: NaN, max: NaN}, y: {min: NaN, max: NaN}};
    this.autoRange = {x: true, y: true};
  },
  setAxisRange: function(axis, min, max) {
    var autoRange = this.autoRange;
    if (!axis) {return;}

    if (isNaN(min) || isNaN(max)) {
      autoRange[axis.toLowerCase()] = true;
      this.set("autoRange", autoRange);
      return;
    }

    autoRange[axis.toLowerCase()] = false;
    this.set("autoRange", autoRange);
    this._setAxisRange(axis, min, max);
  },
  _setAxisRange: function(axis, min, max) {
    var
      oldRange = this.axisRange,
      newRange = {},
      offset, axis_i;

    axis = (axis || "").toLowerCase();

    min = isNaN(+min) ? oldRange[axis].min : +min;
    max = isNaN(+max) ? oldRange[axis].max : +max;
    
    //make sure min != max
    if (min == max) {
      //get a number that is the same order of magnitude as the number
      //of decimal places
      offset = Math.pow(10, -this.getDecimalPlaces([min]));
      min -= offset;
      max += offset;
    }

    //build the new range from these min and max values and the other axes
    for (axis_i in oldRange) {
      if (oldRange.hasOwnProperty(axis_i)) {
        if (axis_i == axis) {
          newRange[axis_i] = {
            min: min, max: max
          };
        } else {
          newRange[axis_i] = {
            min: oldRange[axis_i].min, max: oldRange[axis_i].max
          };
        }
      }
    }

    this.set("axisRange", newRange);
  },
  autoScaleData: function(previous, current, property) {
    var
      cache = this.dataCache,
      range = {
        min: NaN,
        max: NaN
      },
      data_i;
    
    if (!current) {
      return;
    }

    for (data_i in cache) {
      range =
        this.findRange(cache[data_i].coords.y.concat(range.min, range.max));
    }
    this._setAxisRange("y", range.min, range.max);
  },
  calculateSpacing: function() {
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
    return {
      x: this.axisRange.x.min + coords.x / this.xSpacingFactor,
      y: this.axisRange.y.max - coords.y / this.ySpacingFactor
    };
  },
  invertValue: function (pointValue) {
    return {
      x: (pointValue.x  - this.axisRange.x.min) * this.xSpacingFactor,
      y: -(pointValue.y - this.axisRange.y.max) * this.ySpacingFactor
    };
  },
  addDataset: function(data) {
    var
      coords = data.coords || {},
      xCoords = coords.x || [],
      yCoords = coords.y || [],
      range = this.axisRange || {},
      xRange = range.x || {},
      xMin = xRange.min,
      xMax = xRange.max,
      yRange = range.y || {},
      yMin = yRange.min,
      yMax = yRange.max,
      name = data.name;

    if (!xCoords.length || !yCoords.length) {
      //no data
      return;
    }

    //if we are in autorange mode, check if the axis ranges need to be updated
    if (isNaN(xMin) || isNaN(xMax) || this.autoRange.x) {
      xRange = this.findRange(xCoords.concat(xMin, xMax));
      this._setAxisRange("x", xRange.min, xRange.max);
    }
    if (isNaN(yMin) || isNaN(yMax) || this.autoRange.y) {
      yRange = this.findRange(yCoords.concat(yMin, yMax));
      this._setAxisRange("y", yRange.min, yRange.max);
    }

    //cache the new dataset for use in redraws
    if (!this.dataCache) {
      this.dataCache = {};
    }
    if (data.update) {
      //add to the old cache
      (this.dataCache[name].coords.x).push(data.coords.x);
      (this.dataCache[name].coords.y).push(data.coords.y);
    } else {
      //replace the old cahce
      this.dataCache[name] = data;
    }
  },
  removeDataset: function(name) {
    if (this.dataCache[name]) {
      delete this.dataCache[name];
    }
  },
  clearCache: function() {
    this.dataCache = {};
    this.axisRange = {x: {min: NaN, max: NaN}, y: {min: NaN, max: NaN}};
    this.autoRange = {x: true, y: true};
  },
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
    if (!this.dataLayers[name + "_layer"]) {
      this.createDataCanvas(name);
    }
    ctx = this.dataLayers[name + "_layer"].ctx;

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
      x1 = xRange.min,
      x2 = xRange.max,
      y1 = (a * Math.pow(x1, 2)) + (b * x1) + c,
      y2 = (a * Math.pow(x2, 2)) + (b * x2) + c,
      tanM = 2 * a * x1 + b,
      tanB = y1 - (tanM * x1),
      cp1x = vertex[0],
      cp1y = (tanM * cp1x) + tanB,
      ctx;

    //make sure there is a canvas for this variable and get the context
    if (!this.dataLayers[name + "_layer"]) {
      this.createDataCanvas(name);
    }
    ctx = this.dataLayers[name + "_layer"].ctx;

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
    ctx.quadraticCurveTo(
      (cp1x - x1) * xSpacingFactor,
      -(cp1y - yRange.min) * ySpacingFactor,
      (x2 - x1) * xSpacingFactor,
      -(y2 - yRange.min) * ySpacingFactor
    );
    ctx.stroke();
  
    ctx.restore();
  },
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
      pnt_i, x, y, ctx;

    //bail out if there are no data to plot
    if(!numPts) {return;}

    //make sure there is a canvas for this variable and get the context
    if (!this.dataLayers[data.name + "_layer"]) {
      this.createDataCanvas(data.name);
    }
    ctx = this.dataLayers[data.name + "_layer"].ctx;

    //auto generate some xaxis coordinates if they are not provided
    if(!xCoords.length) {
      for(pnt_i = 0; pnt_i < numPts; pnt_i++) {
        xCoords[pnt_i] = pnt_i;
      }
    }

    //configure the size and color of the brush
    ctx.save();
    ctx.lineWidth = style.brushWidth;
    ctx.strokeStyle = ctx.fillStyle = style.color;

    //move to the bottom left corner of the dataCanvas
    ctx.translate(
      0, this.height - this.decorMargin.top - this.decorMargin.bottom
    );

    if (style.lines) {  
      for (pnt_i = 0; pnt_i < numPts; pnt_i++) {
        //get the value of each point
        x = xCoords[pnt_i];
        y = yCoords[pnt_i];

        //convert the value to a pixel coordinate
        x = (x - xRange.min) * xSpacingFactor;
        y = -(y - yRange.min) * ySpacingFactor;

        //if we hit a data gap, end the current path
        if (isNaN(y)) {
          ctx.stroke();
          onPath = false;
        } else {
          //make sure we have a current path
          if (!onPath) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            onPath = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      ctx.stroke();
    }

    ctx.restore();
  },
  findRange: function(numbers){
    var min, max;

    //filter out anything that is not a number
    numbers = numbers.filter(
      function(value){
          return (isNaN(+value) ? false : true);
      }
    );

    //get the min and max values for the x coordinates
    min = Math.min.apply(null, numbers);

    max = Math.max.apply(null, numbers);

    return {min: min, max: max};
  }
});
