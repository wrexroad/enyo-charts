enyo.kind({
  name: "Chart.Cartesian",
  kind: "Chart",

  published: {
    xSpacingFactor: 1,
    ySpacingFactor: 1
  },

  constructor: function() {
    this.inherited(arguments);

    this.initValues();
  },
  initValues: function() {
    this.inherited(arguments);

    this.formatters = {x: this.defaultFormatter, y: this.defaultFormatter};
    this.axisRange = {x: {min: NaN, max: NaN}, y: {min: NaN, max: NaN}};
    this.autoRange = {x: true, y: true};
  },
  setAxisRange: function(axis, newRange) {
    var autoRange = this.autoRange;

    autoRange[(axis || "").toLowerCase()] = false;
    this.set("autoRange", autoRange);
    this._setAxisRange(axis, newRange);
  },
  _setAxisRange: function(axis, newRange) {
    var
      range = this.axisRange,
      min, max, offset;

    axis = (axis || "").toLowerCase();
    newRange = newRange || {};

    min = isNaN(+newRange.min) ? range[axis].min : +newRange.min;
    max = isNaN(+newRange.max) ? range[axis].max : +newRange.max;
    
    //make sure min != max
    if (min == max) {
      //get a number that is the same order of magnitude as the number
      //of decimal places
      offset = 1 / this.calculateDecimalScale([range[axis].min]);
      min -= offset;
      max += offset;
    }

    range[axis].min = min;
    range[axis].max = max;
    this.set("axisRange", range);
  },
  calculateSpacing: function() {
    var
      yRange = this.axisRange.x,
      xRange = this.axisRange.y,
      canvasAttributes = this.$.dataCanvas.attributes;

    this.set(
      "xSpacingFactor",
      canvasAttributes.width / ((+xRange.max || 0) - (+xRange.min || 0))
    );
    this.set(
      "ySpacingFactor",
      canvasAttributes.height / ((+yRange.max || 0) - (+yRange.min || 0))
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
      dataCanvas = this.$.dataCanvas.attributes,
      dataHeight = dataCanvas.height,
      dataWidth = dataCanvas.width,
      numTics, value, step, offset, tic_i, labelWidth;

    //configure the drawing context
    ctx.save();
    ctx.strokeStyle = this.borderColor;
    ctx.textAlign = "end";
    ctx.font = "bold " + this.fontSize + "px " + this.font;

    //outline the grid
    ctx.strokeRect(margin.left, margin.top, dataWidth, dataHeight);

    //figure out how many labels will fit on the y axis
    numTics = dataHeight / (this.fontSize << 1) << 0;
    step = this.multiply((this.add(yMax, -yMin)), (1/numTics));

    //draw the y axis tics and labels
    if (step > 0) {
      ctx.save();

      //move to the bottom left corner of the dataCanvas
      ctx.translate(margin.left, this.height - margin.bottom);

      //use a for loop to draw all tic execpt the last one
      for (value = yMin; value < yMax; value = this.add(value, step)) {
        offset = -(value - yMin) * this.ySpacingFactor;

        ctx.fillText(yFormat(value), -5, offset + 5);
        ctx.beginPath();
        ctx.moveTo(0, offset);
        ctx.lineTo(5, offset);
        ctx.stroke();
      }

      //print the last tic at the top of the chart
      offset = -(yMax - yMin) * this.ySpacingFactor;
      ctx.fillText(yFormat(yMax), -5, offset + 5);
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(5, offset);
      ctx.stroke();
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

    numTics = Math.ceil(dataWidth / (labelWidth)) >> 0;
    step = this.multiply((this.add(xMax, -xMin)), (1/numTics));

    if (step > 0) {
      ctx.save();
      ctx.translate(margin.left, this.height - margin.bottom);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (value = xMin; value < xMax; value = this.add(value, step)) {
        offset = (value - xMin) * this.xSpacingFactor;
        ctx.fillText(xFormat(value), offset, this.fontSize);
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, 5);
        ctx.stroke();
      }
    }

    ctx.restore();
  },
  invertCoodinates: function(x, y) {
    return {
      x: this.axisRange.x.min + x / this.xSpacingFactor,
      y: this.axisRange.y.max - y / this.ySpacingFactor
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
      yMax = yRange.max;

    //if we are in autorange mode, check if the axis ranges need to be updated
    if (this.autoRange) {
      xRange = this.findRange(xCoords.concat(xMin, xMax));
      yRange = this.findRange(yCoords.concat(yMin, yMax));

      this.set("axisRange", {x: xRange, y: yRange});
    }

    //draw this dataset
    this.drawData(data);

    //cache the new dataset for use in redraws
    if (!this.dataCache) {
      this.dataCache = [];
    }
    this.dataCache.push(data);
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
      ctx = this.dataCtx,
      onPath = false,
      range = this.axisRange || {},
      xRange = range.x || {},
      xMin = xRange.min,
      xMax = xRange.max,
      yRange = range.y || {},
      yMin = yRange.min,
      yMax = yRange.max,
      pnt_i, x, y;

    //bail out if there are no data to plot
    if(!numPts) {return;}

    //auto generate some xaxis coordinates if they are not provided
    if(!xCoords.length) {
      for(pnt_i = 0; pnt_i < numPts; pnt_i++) {
        xCoords[pnt_i] = pnt_i;
      }
    }

    //configure the size and color of the brush
    ctx.save();
    ctx.lineWidth = style.brushWidth;
    ctx.strokeStyle = ctx.fillStyle = style.color

    if (style.lines) {  
      for (pnt_i = 0; pnt_i < numPts; pnt_i++) {
        //get the value of each point
        x = xCoords[pnt_i];
        y = yCoords[pnt_i];

        //convert the value to a pixel coordinate
        x = (x - xMin) * xSpacingFactor;
        y = (y - yMin) * ySpacingFactor;

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