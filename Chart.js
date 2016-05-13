enyo.kind({
  name: "Chart",
  kind: "Scroller",

  published: {
    plotTitle: "",
    width: 0,
    height: 0,
    bgImg: "", //id of <img> tag to be used as a background
    bgColor: '#CCCCCC',
    borderColor: '#000000',
    gridColor: "gray",
    textColor: "black",
    fontName: '"Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace',
    fontSize: 10,
    decorCtx: null,
    exportCtx: null,
    formatters: null,
    decorMargin: null,
    layers: null,
    overlay: false,
    startRange: null,
    currentRange: null,
    targetRange: null,
    easingFunction: null,
    newRange: false,
    lastDrawTime: 0,
    fps: 0,
    needsDraw: true
  },
  components: [
    {name: "decorCanvas", kind: "enyo.Canvas"},
    {name: "exportCanvas", kind: "enyo.Canvas", showing: false},
    {name: "renderedPoint", kind: "RenderedPoint", showing: false}
  ],
  constructor: function() {
    this.inherited(arguments);

    this.decorMargin = {top: 10, bottom: 10, left: 10, right: 10};

    //make sure log10 is defined
    if (!Math.log10) {
      Math.log10 = function(x) {
        return Math.log(x) / Math.log(10);
      };
    }
    
    this.layers = {};
  },
  //functions directly related to generating the plot
  rendered: function() {
    this.inherited(arguments);

    var
      decorCanvas = this.$.decorCanvas,
      exportCanvas = this.$.exportCanvas;

    this.decorCtx = decorCanvas.node.getContext('2d');
    this.exportCtx = exportCanvas.node.getContext('2d');

    decorCanvas.setAttribute("height", this.height);
    decorCanvas.setAttribute("width", this.width);
    
    decorCanvas.render();
    exportCanvas.render();
    
    this.initValues();
    
    this.draw();
  },
  createDataCanvas: function(varName, options) {
    var
      margin = this.decorMargin,
      top = margin.top,
      left = margin.left,
      width = this.width - margin.left - margin.right,
      height = this.height - margin.top - margin.bottom,
      canvasName, dataCanvas;

    //make sure the canvas has a name
    canvasName = (varName || "") + "_layer";

    //create the enyo component
    dataCanvas = this.createComponent({
      name: canvasName, kind: "enyo.Canvas",
      style:
        "position: absolute;" +
        "left:" + left + "px; " +
        "top:" + top + "px;"
    });

    //make sure the canvas is the right size
    dataCanvas.setAttribute("height", height);
    dataCanvas.setAttribute("width", width);

    //make sure the canvas is rendered
    dataCanvas.render();
    dataCanvas.update();

    //save a reference to the canvas and context
    this.layers[canvasName] = {
      canvas : dataCanvas,
      ctx    : dataCanvas.node.getContext('2d'),
      options: (options || {})
    }; 
  },
  printTitle: function() {
    var
      ctx = this.decorCtx,
      offset = 0,
      layers = this.layers,
      margin = this.decorMargin,
      layerName, printedName, titleAreaWidth;

    ctx.save();
    ctx.translate(this.decorMargin.left, 0);
    ctx.textAlign = "start";
    ctx.textBaseline = "top";

    //print the main plot title
    titleAreaWidth = this.width - margin.left - margin.right;
    ctx.font = (this.fontSize * 1.5) + "px " + this.font;
    ctx.fillStyle = "black";
    ctx.fillText(
      this.plotTitle || "", 
      (titleAreaWidth - ctx.measureText(this.plotTitle).width) >> 1,
      this.fontSize >> 1
    );

    //print a legend as a subtitle
    ctx.font = this.fontSize + "px " + this.font;
    for (layerName in layers) {
        printedName = layerName.substring(0, (layerName).indexOf("_layer"));
        ctx.fillStyle = layers[layerName].options.color;
        ctx.fillText(printedName, offset, this.fontSize * 2);
        offset += ctx.measureText(printedName + ' ').width;
    }

    ctx.restore();
  },
  resetPlot: function() {
    //reset all of the plotting parameters and clear any drawing
    this.initValues();
    this.cleanup();
  },
  resetLayer: function(varName) {
    var layer;

    if ((layer = this.layers[varName + "_layer"])) {
      layer.ctx.clearRect(
        0, 0, this.width, this.height
      );
    }
  },
  wipePlot: function() {
    for (var layer_i in this.layers) {
      this.layers[layer_i].ctx.clearRect(
        0, 0, this.width, this.height
      );
    }
  },
  cleanup: function() {
    for (var layer_i in this.layers) {
      if (!this.activeLayerNames[layer_i]){
        this.layers[layer_i].canvas.destroy();
        delete this.layers[layer_i];
      }
    }
  },
  
  exportPNG: function() {
    var
      ctx = this.exportCtx,
      margin = this.decorMargin;
    
    ctx.drawImage(this.$.decorCanvas.node, 0, 0);
    for (var layer_i in this.layers) {
      ctx.drawImage(
        this.layers[layer_i].canvas.node, margin.left, margin.top
      );
    }
    
    window.open(
      ctx.canvas.toDataURL().replace("image/png", "image/force-download")
    );
  },
  
  defaultFormatter: function(val, decimalPlaces) {
    decimalPlaces = +decimalPlaces || 1;

    return (+val).toFixed(decimalPlaces);
  },
  addPolynomial: function(params) {
    var
      coeff = params.coeff || [],
      numCoeff = coeff.length,
      name = params.name || "",
      a, b, c, x, y;

    if (!numCoeff) {
      return;
    }

    if (!this.cachedPolynomials) {
      this.cachedPolynomials = {};
    }

    if (numCoeff === 1) {
      //just a constant, convert to 1st order polynomial
      this.cachedPolynomials[name] = {
        name: name,
        order: 1,
        color: params.color || "black",
        m: 0,
        b: coeff[0] || 0
      };
    } else if (numCoeff === 2) {
      this.cachedPolynomials[name] = {
        name: name,
        order: 1,
        color: params.color || "black",
        m: coeff[0] || 0,
        b: coeff[1] || 0
      };
    } else if (numCoeff === 3) {
      //this is a parabola, find the vertex
      a = coeff[0] || 0;
      b = coeff[1] || 0;
      c = coeff[2] || 0;
      x = -b / (2 * a);
      y = (a * Math.pow(x, 2)) + (b * x) + c;

      this.cachedPolynomials[name] = {
        name: name,
        order: 2,
        color: params.color || "black",
        a: a,
        b: b,
        c: c,
        vertex: [x, y]
      };
    } else {
      return;
    }

    return this;
  },
  removePolynomial: function(name) {
    if(this.cachedPolynomials) {
      delete this.cachedPolynomials[name];
      delete this.layers[name + "_layer"];
    }
  },
  drawPolynomial: function(params) {
    if (params.order === 1) {
      this.drawLinear(params);
    } else if (params.order === 2) {
      this.drawParabola(params);
    }
  },

  //functions for some floating point arithmetic
  getDecimalPlaces: function(numbers) {
    var
      decimalPlaces = 0,
      number, exp, num_i;

    numbers = [].concat(numbers);

    //figure out how many decimal places need to be preserved
    for (num_i = 0; num_i < numbers.length; num_i++) {
      //force the number into exponential string
      number = (+numbers[num_i] || 0).toExponential();

      //split off the exponent part of the string and parse it as a number
      exp = +(number.split("e")[1]) || 0;

      //if there is a negative exponent adjust the number we need to preserve
      if (exp < 0) {
        decimalPlaces = exp < decimalPlaces ? exp : decimalPlaces;
      }
    }

    //decimal places were represented as negative powers of 10,
    //chage to a positive power of 10
    return (-decimalPlaces);
  },
  add: function() {
    var
      scale = Math.pow(10, this.getDecimalPlaces(arguments)),
      result = 0,
      num_i;

    //scale all the numbers up by the amount need to make the ints and add them
    // to the result
    for (num_i = 0; num_i < arguments.length; num_i++) {
      result += (arguments[num_i] || 0) * scale;
    }

    //scale the result back down
    return result / scale;
  },
  multiply: function() {
    var
      scale = Math.pow(10, this.getDecimalPlaces(arguments)),
      result = +arguments[0] || 0,
      num_i;
    for (num_i = 1; num_i < arguments.length; num_i++) {
      result *= (+arguments[num_i] || 0) * scale;
    }
    return result / scale;
  },

  //abstract functions to be defined by the chart subkind
  initValues: function() {
    this.activeLayerNames = {};
    this.labels = null;
  },
  configurePlot: function(plotOptions) {
    if (typeof plotOptions != "object") {
      return;
    }
    
    this.needsDraw = true;
    
    for (var opt in plotOptions) {
      if (plotOptions.hasOwnProperty(opt)) {
        if (opt == "axisRange") {
          this.setAxisRange(null, {range: plotOptions[opt]});
        } else {
          this.set(opt, plotOptions[opt]);
        }
      }
    }
  },
  setAxisRange: function(inSender, inEvent) {
    var
      newRange = inEvent.range || [],
      easingStart = inEvent.easingStart || 0,
      axis;
      
    //make sure there is a valid range
    if (!newRange.length) {
      return;
    }
    
    //set the targetRange
    for (axis = 0; axis < newRange.length; axis++) {
      if (newRange[axis].length) {
        //make sure target range has been initialized for this axis
        this.targetRange[axis] = [
          isFinite(+newRange[axis][0]) ?
            newRange[axis][0] :
            (this.targetRange[axis] || [])[0],
          isFinite(+newRange[axis][1]) ?
            newRange[axis][1] :
            (this.targetRange[axis] || [])[1]  
        ];
      }
    }
    
    if (easingStart) {
      //we are going to start easing,
      //remember the easing axes, starting time, and the current starting range
      this.targetRange.easingStart = easingStart;
      this.targetRange.easingAxes = inEvent.easingAxes;
      for (axis = 0; axis < this.currentRange.length; axis++) {
        if (this.currentRange[axis].length) {
          this.startRange[axis] = [
            isFinite(+this.currentRange[axis][0]) ?
              this.currentRange[axis][0] :
              (this.startRange[axis] || [])[0],
            isFinite(+this.currentRange[axis][1]) ?
              this.currentRange[axis][1] :
              (this.startRange[axis] || [])[1]  
          ];
        }
      }
    } else {
      //not easing, copy the targetRange to the currentRange
      for (axis = 0; axis < this.currentRange.length; axis++) {
        this.currentRange[axis] = [
          isFinite(+this.targetRange[axis][0]) ?
            this.targetRange[axis][0] :
            (this.currentRange[axis] || [])[0],
          isFinite(+this.targetRange[axis][1]) ?
            this.targetRange[axis][1] :
            (this.currentRange[axis] || [])[1]
        ];
      }
    }
    
    this.calculateSpacing();
    
    //send out a signal for any other plots that need to sync with our range
    enyo.Signals.send(
      "onNewRange", {chartID: this.id, axisRange: inEvent.range}
    );
    
    //set a flag indicated the range has changed since the last draw event
    this.newRange = true;
    
    //set the flag for a plot redraw
    this.needsDraw = true;
    
    return true;
  },
  getAxisRange: function() {
    return this.currentRange.xMin;
  },
  draw: function() {
    var
      decorWidth = this.width,
      decorHeight = this.height,
      margin = this.decorMargin,
      dataWidth = decorWidth - margin.left - margin.right,
      dataHeight = decorHeight - margin.top - margin.bottom,
      now = enyo.perfNow(),
      layer_i, canvas, overlay;
    
    this.fps = 1000 / (now - this.lastDrawTime) || 0;
    this.lastDrawTime = now;

    window.requestAnimationFrame(this.draw.bind(this));

    //update the overlay if its showing
    if ((overlay = this.$.overlay)) {
      overlay.refresh();
    }
    
    //if nothing has changed, dont redraw
    if (!this.needsDraw) {
      return false;
    } else {
      this.needsDraw = false;
    }
    
    //if the plot has been hidden for some reason, there is no reason to draw
    if (!this.showing) {
      return false;
    }
    
    //bail out if there is no decoration canvas
    if (!decorWidth || !decorHeight) {
      return false;
    }
        
    //make sure we actually have something to draw before continuing
    if (!((this.datasets || []).length + (this.equations || []).length)) {
      return false;
    }
    
    //clear the canvases
    this.wipePlot();
    this.activeLayerNames = {};
    
    //adjust the size of each canvas
    this.calculateMargins();
    canvas = this.$.decorCanvas;
    canvas.setAttribute("height", this.height);
    canvas.setAttribute("width", this.width);
    canvas.update();
    
    canvas = this.$.exportCanvas;
    canvas.setAttribute("height", this.height);
    canvas.setAttribute("width", this.width);
    canvas.update();

    for (layer_i in this.layers) {
      canvas = this.layers[layer_i].canvas;
      canvas.setAttribute("height", dataHeight);
      canvas.setAttribute("width", dataWidth);
      canvas.update();
    }
    
    return true;
  },
  decorate: function() {
    this.printTitle();
  },
  getRangeFromData: function(datasets, axis, bounds) {
    var
      min = Number.POSITIVE_INFINITY,
      max = Number.NEGATIVE_INFINITY,
      boundRange, buffer, vals, range;
    
    //we can indicate that only datapoints within a range of a cetrain axis
    //should be allowed to be considered for the new range
    bounds = bounds || {};
    boundRange = isFinite(bounds.axis + bounds.min + bounds.max);
    
    //axis has to be a number indicating which
    //element of the data point to look at
    axis = +axis;
    if (!isFinite(axis)) {
      return null;
    }
    
    datasets.forEach(function(dataset) {
      //no range was given, so dig through the coordinates and figure it out
      vals = [];
      dataset.data.coords.forEach(function(coord) {
        if (!(boundRange &&
          (+coord[bounds.axis] > bounds.max ||
          bounds.min > +coord[bounds.axis])
        )) {
          if (isFinite(+coord[axis])) {vals.push(+coord[axis]);}
        }
      });
      dataset.data.range = [[],[]];
      dataset.data.range[axis][0] = Math.min.apply(this, vals);
      dataset.data.range[axis][1] = Math.max.apply(this, vals); 

      //see if this dataset contains a global extreme
      if (dataset.data.range[axis][0] < min) {
        min = +dataset.data.range[axis][0];
      }
      if (dataset.data.range[axis][1] > max) {
        max = +dataset.data.range[axis][1];
      }
    }, this);
    
    //if we failed to find a range within bounds,
    //look for a range ignoring bounds
    if (boundRange && !isFinite(min + max)) {
      range = this.getRangeFromData(datasets, axis);
      min = range.min;
      max = range.max;
    }
    
    //we dont want the plot to have the min and max point pressed right up 
    //against the boarder, add a 10% buffer
    buffer = (max - min) * 0.1 || 1;
    range = {
      min : min - buffer,
      max : max + buffer
    };
    
    //if we still dont have a good range, just make something up
    if (!isFinite(range.min + range.max)) {
      range = {min: -10, max: 10};
    }
    
    return range;
  },
  drawLinear: function() {},
  drawParabola: function() {},
  drawData: function() {},
  calculateSpacing: function() {},
  calculateMargins: function() {},
  invertCoordinates: function() {},
  invertValue: function() {}
});
