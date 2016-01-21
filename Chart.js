enyo.kind({
  name: "Chart",
  kind: "Control",

  published: {
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
    axisRange: null,
    fullAxisRange: null,
    decorMargin: null,
    layers: null
  },
  components: [
    {name: "decorCanvas", kind: "enyo.Canvas"},
    {name: "exportCanvas", kind: "enyo.Canvas", showing: false}
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
      layerName;

    ctx.save();
    ctx.translate(this.decorMargin.left, 0);
    ctx.textAlign = "start";
    ctx.textBaseline = "top";

    for (layerName in layers) {
        ctx.fillStyle = layers[layerName].options.color;
        ctx.fillText(layerName, offset, 0);
        offset += ctx.measureText(layerName + ' ').width;
    }

    ctx.restore();
  },
  resetPlot: function() {
    //reset all of the plotting parameters and clear any drawing
    this.initValues();
    this.wipePlot();
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
    this.labels = null;
  },
  draw: function() {
    var
      decorWidth = this.width,
      decorHeight = this.height,
      margin = this.decorMargin,
      dataWidth = decorWidth - margin.left - margin.right,
      dataHeight = decorHeight - margin.top - margin.bottom,
      layer_i, canvas;

    //clear the canvases
    this.wipePlot();

    this.calculateMargins();
    
    //adjust the size of each canvas
    canvas = this.$.decorCanvas;
    canvas.setAttribute("height", this.height);
    canvas.setAttribute("width", this.width);
    canvas.update();
    
    canvas = this.$.exportCanvas;
    canvas.setAttribute("height", this.height);
    canvas.setAttribute("width", this.width);
    canvas.update();

    this.decorate();
    
    for (layer_i in this.layers) {
      canvas = this.layers[layer_i].canvas;
      canvas.setAttribute("height", dataHeight);
      canvas.setAttribute("width", dataWidth);
      canvas.update();
    }
    
    this.printTitle();
  },
  getRangeFromData: function() {},
  drawLinear: function() {},
  drawParabola: function() {},
  drawData: function() {},
  decorate: function() {},
  setAxisRange: function() {},
  calculateSpacing: function() {},
  calculateMargins: function() {},
  invertCoordinates: function() {},
  invertValue: function() {}
});
