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
    dataCtx: null,
    formatters: null,
    axisRange: null,
    dataCache: null,
    decorMargin: null,
    autoRange: null,
  },
  observers: [
    {method: "redraw", path: ["height", "width", "fontSize", "axisRange"]},
  ],

  components: [
    {name: "decorCanvas", kind: "enyo.Canvas"},
    {name: "dataCanvas", kind: "enyo.Canvas"}
  ],
  constructor: function() {
    this.inherited(arguments);

    this.dataCache = [];
    this.decorMargin = {top: 10, bottom: 10, left: 10, right: 10};
  },
  //functions directly related to generating the plot
  rendered: function() {
    this.inherited(arguments);

    var
      decorCanvas = this.$.decorCanvas,
      dataCanvas = this.$.dataCanvas;

    this.decorCtx = decorCanvas.node.getContext('2d');
    this.dataCtx  = dataCanvas.node.getContext('2d');

    decorCanvas.render();
    dataCanvas.render();
  },
  redraw: function() {
    var
      decorCanvas = this.$.decorCanvas,
      dataCanvas = this.$.dataCanvas,
      data_i;

    this.calculateMargins();

    //adjust the size of each canvas
    decorCanvas.setAttribute("height", this.height);
    decorCanvas.setAttribute("width", this.width);
    decorCanvas.update();
    //decorCanvas.render();

    dataCanvas.setAttribute("height", 
      this.height - this.decorMargin.top - this.decorMargin.bottom
    );
    dataCanvas.setAttribute("width", 
      this.width - this.decorMargin.left - this.decorMargin.right
    );
    dataCanvas.setAttribute("style",  
        "position: absolute;" + 
        "left:" + this.decorMargin.left + "px; " +
        "top:" + this.decorMargin.top + "px;"
    );
    dataCanvas.update();
    //dataCanvas.render();

    //redraw everything
    this.calculateSpacing();
    this.decorate();
    if (this.dataCache) {
      for (data_i = 0; data_i < this.dataCache.length; data_i++) {
        this.drawData(this.dataCache[data_i]);
      }
    }
    
    return true;
  },
  resetPlot: function() {
    //reset all of the plotting parameters
    this.labels = null;
    this.axisRange = null;
    this.dataCache = null;
    this.autoRange = true;

    //clear the canvases
    this.wipePlot()
  },
  wipePlot: function() {
    this.dataCtx.clearRect(
      0,
      0,
      (this.height - this.decorMargin.top - this.decorMargin.bottom),
      (this.width - this.decorMargin.left - this.decorMargin.right)
    );
  },
  defaultFormatter: function(val) {
    return val;
  },

  //functions for some floating point arithmetic
  calculateDecimalScale: function(numbers) {
    var
      decimalPlaces = 0,
      number, exp, num_i;

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
    decimalPlaces = -decimalPlaces;    

    //converter the number of decimal places to a scale factor that will
    //turn all floats into ints
    return Math.pow(10, decimalPlaces);
  },
  add: function() {
    var
      scale = this.calculateDecimalScale(arguments),
      result = 0,
      num_i;

    //scale all the numbers up by the amount need to make the ints and add them 
    // to the result
    for (num_i = 0; num_i < arguments.length; num_i++) {
      result += arguments[num_i] * scale;
    }

    //scale the result back down
    return result / scale;
  },
  multiply: function() {
    var
      scale = this.calculateDecimalScale(arguments),
      result = 0,
      num_i;
    for (num_i = 0; num_i < arguments.length; num_i++) {
      result *= arguments[num_i] * scale;
    }
    return result / scale;
  },

  //abstract functions to be defined by the chart subkind
  addDataset: function() {},
  drawData: function() {},
  decorate: function() {},
  calculateSpacing: function() {},
  calculateMargins: function() {},
  invertCoordinates: function() {}
});