enyo.kind({
  name: "Chart.Cartesian",
  kind: "Chart",

  published: {
    xSpacingFactor: 1,
    ySpacingFactor: 1
  },
  
  rendered: function() {
    this.inherited(arguments);
  
    //default range if none is set and there are no datasets
    this._setAxisRange({
      x: {min: NaN, max: NaN},
      y: {min: NaN, max: NaN}
    });
    this.set("autoRange" {x: true, y: true});
  },
  setAxisRange: function(axis, newRange) {
    var autoRange = this.autoRange;

    autoRange[(axis || "").toLowercase()] = false;
    this.set("autoRange", false);
    this._setAxisRange(newRange);
  },
  _setAxisRange: function(axis, newRange) {
    var range = this.axisRange;

    axis = (axis || "").toLowercase()

    range[axis].min: isNaN(+newRange.min) ? range.min : +newRange.min;
    range[axis].max: isNaN(+newRange.max) ? range.max : +newRange.max;

    this.set("axisRange", range);
  },
  calculateSpacing: function() {
    var
      yRange = this.axisRange.x,
      xRange = this.axisRange.y,
      canvasAttributes = this.$.dataCanvas.attributes;

    this.set(
      "xSpacingFactor", canvasAttributes.width / (xRange.max - xRange.min)
    );
    this.set(
      "ySpacingFactor", canvasAttributes.height / (yRange.max - yRange.min)
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

      //meh
      right: 0
    });
  },
  decorate: function() {
    var
      ctx = this.decorCtx,
      margin = this.decorMargin,
      labels = this.labels || {},
      formatters = this.formatters || {},
      yFormat = formatters.y || this.defaultFormatter,
      xFormat = formatters.x || this.defaultFormatter,
      axisRange = this.axisRange,
      yRange = axisRange.y,
      xRange = axisRange.x,
      numTics, ticValue, ticLocation, tic_i, labelWidth;

    //configure the drawing context
    ctx.save();
    ctx.strokeStyle = this.borderColor;
    ctx.textAlign = "end";
    ctx.font = "bold " + this.fontSize + "px " + this.font;

    //outline the grid
    ctx.translate(margin.left, margin.top);
    ctx.strokeRect(0, 0, this.width, this.height);

    //figure out how many labels will fit on the y axis
    numTics = (this.height / (this.fontSize << 1)) << 0;
    ticStep = (yRange.max || 0 - yRange.min || 0) / numTics;

    //draw the y axis tics and labels
    ctx.translate(0, this.height);
    for (tic_i = 0; tic_i < numTics; tic_i ++) {
      ticValue += ticStep;
      ticLocation = -ticValue * this.ySpacingFactor;

      ctx.fillText(yFormat(ticValue), -5, ticLocation + 5);
      ctx.beginPath();
      ctx.moveTo(0, ticLocation);
      ctx.lineTo(5, ticLocation);
      ctx.stroke();
    }

    //figure out the x label width. Assume that no labels will be longer than 
    //the min or max values.
    //If a min or max can not be found, just assume 20 characters
    labelWidth =
      ctx.measureText(
        (new Array(
          Math.max(xFormat(xRange.min).length, xFormat(xRange.min).length) || 20
        )).join('W')
      ).width;

    //figure out how many labels will fit on the x axis
    numTics = (this.width / (this.labelWidth << 1)) << 0;
    ticStep = (xRange.max || 0 - xRange.min || 0) / numTics;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (tic_i = 0; tic_i < numTics; tic_i ++) {
      ticValue += ticStep;
      ticLocation = ticValue * this.xSpacingFactor;

      ctx.fillText(xFormat(ticValue), ticLocation, this.fontSize);
      ctx.beginPath();
      ctx.moveTo(ticLocation, 0);
      ctx.lineTo(ticLocation, ticLength);
      ctx.stroke();
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
  },
  findRange: function(numbers){
    var min, max;

    //filter out anything that is not a number
    numbers = number.filter(
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