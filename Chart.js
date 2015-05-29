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
    formatters: null,
    axisRange: null,
    dataCache: null,
    decorMargin: null,
    autoRange: null,
    dataLayers: null
  },
  observers: [
    {method: "redraw", path: ["height", "width", "fontSize", "axisRange"]}
  ],

  components: [
    {name: "decorCanvas", kind: "enyo.Canvas"}
  ],
  constructor: function() {
    this.inherited(arguments);

    this.dataCache = {};
    this.decorMargin = {top: 10, bottom: 10, left: 10, right: 10};

    //make sure log10 is defined
    if (!Math.log10) {
      Math.log10 = function(x) {
        return Math.log(x) / Math.log(10);
      };
    }

    this.dataLayers = {};
  },
  //functions directly related to generating the plot
  rendered: function() {
    this.inherited(arguments);

    var
      decorCanvas = this.$.decorCanvas;

    this.decorCtx = decorCanvas.node.getContext('2d');

    decorCanvas.render();
  },
  createDataCanvas: function(varName) {
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

    dataCanvas.render();

    //save a reference to the canvas and context
    this.dataLayers[canvasName] = {
      canvas: dataCanvas,
      ctx   : dataCanvas.node.getContext('2d')
    };
    
    //make sure the canvas is rendered
    this.dataLayers[canvasName].canvas.render();
    dataCanvas.update();

  },
  printTitle: function() {
    var
      ctx = this.decorCtx,
      cache = this.dataCache,
      offset = 0,
      dataset, set_i, name;

    ctx.save();
    ctx.translate(this.decorMargin.left, 0);
    ctx.textAlign = "start";
    ctx.textBaseline = "top";

    for (set_i in cache) {
        dataset = cache[set_i];
        name = dataset.name;
        ctx.fillStyle = dataset.style.color;
        ctx.fillText(name, offset, 0);
        offset += ctx.measureText(name + ' ').width;
    }

    ctx.restore();
  },
  redraw: function() {
    var
      decorWidth = this.width,
      decorHeight = this.height,
      margin = this.decorMargin,
      dataWidth = decorWidth - margin.left - margin.right,
      dataHeight = decorHeight - margin.top - margin.bottom,
      data_i, layer_i, canvas;


    //clear the canvases
    this.wipePlot();

    this.calculateMargins();

    //adjust the size of each canvas
    canvas = this.$.decorCanvas;
    canvas.setAttribute("height", this.height);
    canvas.setAttribute("width", this.width);
    canvas.update();

    for (layer_i in this.dataLayers) {
      canvas = this.dataLayers[layer_i].canvas;
      canvas.setAttribute("height", dataHeight);
      canvas.setAttribute("width", dataWidth);
      canvas.update();
    }

    //redraw everything
    this.calculateSpacing();
    this.decorate();
    if (this.dataCache) {
      for (data_i in this.dataCache) {
        this.drawData(this.dataCache[data_i]);
      }
    }

    return true;
  },
  resetPlot: function() {
    //reset all of the plotting parameters
    this.initValues();

    this.redraw();
  },
  resetLayer: function(varName) {
    var layer;

    if ((layer = this.dataLayers[varName + "_layer"])) {
      layer.ctx.clearRect(
        0, 0, this.width, this.height
      );
    }
  },
  wipePlot: function() {
    for (var layer_i in this.dataLayers) {
      this.dataLayers[layer_i].ctx.clearRect(
        0, 0, this.width, this.height
      );
    }
  },
  defaultFormatter: function(val, decimalPlaces) {
    decimalPlaces = +decimalPlaces || 1;

    return (+val).toFixed(decimalPlaces);
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
    this.axisRange = null;
    this.dataCache = null;
    this.autoRange = true;
  },
  addDataset: function() {},
  drawData: function() {},
  decorate: function() {},
  calculateSpacing: function() {},
  calculateMargins: function() {},
  invertCoordinates: function() {},
  invertValue: function() {}
});
