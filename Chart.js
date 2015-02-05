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
    fontSize: 14,
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

    this.decorCtx = this.$.decorCanvas.node.getContext('2d');
    this.dataCtx  = this.$.dataCanvas.node.getContext('2d');
  },
  redraw: function() {
    var data_i;

    this.calculateMargins();

    //adjust the size of each canvas
    this.$.decorCanvas.attributes.height = this.height;
    this.$.decorCanvas.attributes.width = this.width;
    this.$.dataCanvas.attributes.height =
      this.height - this.decorMargin.top - this.decorMargin.bottom;
    this.$.dataCanvas.attributes.width =
      this.width - this.decorMargin.left - this.decorMargin.right;

    this.wipePlot();

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
    this.$.decorCanvas.destroyClientControls();
    this.$.decorCanvas.update();
    this.$.dataCanvas.destroyClientControls();
    this.$.dataCanvas.update();
  },
  defaultFormatter: function(val) {
    return val;
  },

  //abstract functions to be defined by the chart subkind
  addDataset: function() {},
  drawData: function() {},
  decorate: function() {},
  calculateSpacing: function() {},
  calculateMargins: function() {},
  invertCoordinates: function() {}
});