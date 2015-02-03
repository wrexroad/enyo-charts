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
    dataCache: null,
    dataRegion: null
  },
  observers: [
    {method: "resize", path: ["height", "width", "fontSize"]},
    {method: "calculateSpacing", path: ["dataCache"]}
  ],

  components: [
    {name: "decorCanvas", kind: "enyo.Canvas"},
    {name: "dataCanvas", kind: "enyo.Canvas"}
  },

  //functions directly related to generating the plot
  rendered: function() {
    this.inherited(arguments);
    
    this.decorCtx = this.$.decorCanvas.node.getContext('2d');
    this.dataCtx  = this.$.dataCanvas.node.getContext('2d');

    //default x and y origins for the canvas coordinate system   
    this.origin = {x : 60, y : 20};

    this.resize();
  },
  resize: function(){
    
    //figure out where the data region is
    this.calculateMargins();
    if (!this.dataRegion) {
      return false;
    }

    //adjust the size of each canvas
    this.$.decorCanvas.attributes.height = this.height;
    this.$.decorCanvas.attributes.width = this.width;
    this.$.dataCanvas.attributes.height =
      this.height - this.dataRegion.top - this.dataRegion.bottom;
    this.$.dataCanvas.attributes.width =
      this.width - this.dataRegion.left - this.dataRegion.right;

    //clear the canvases
    this.$.decorCanvas.destroyClientControls();
    this.$.decorCanvas.update();
    this.$.dataCanvas.destroyClientControls();
    this.$.dataCanvas.update();
    
    //redraw
    if (this.dataCache) {
      this.drawData();
      this.drawDecor();
    }

    return true;
  },
  draw: function(chartData) {
    this.set("dataCache", chartData);
    this.drawData();
    this.drawDecor();
  },

  //utility functions
  createLabels: function (min, max, varData) {
    var
      label_i, stepSize, converter, sigFigs, range, labels = [], numLabels = 10;

    varData = varData || {};
    converter = varData.converter || Dave_js.Converters.default;
    sigFigs = varData.sigFigs;
    min = new Big(min || 0);
    max = new Big(max || 0);

    //get the range of values
    range = max.minus(min);
    
    //make sure there is a range
    if(max.eq(min)){
      console.error('Dave_js: Cannot create labels when min == max:');
      console.error('\t(' + min + ' == ' + max + ')');
      return [];
    }

    stepSize = range.div(numLabels);
    for (label_i = min; label_i.lte(max); label_i = label_i.plus(stepSize)) {
      labels.push({
        text: converter(+label_i, sigFigs),
        coord: +label_i.minus(min)
      });
    }

    return labels;
  },

  //abstract functions to be defined by the chart subkind
  drawData: function() {},
  drawDecor: function() {},
  calculateMargins: function() {},
  calculateSpacing: function() {},
  invertCoordinates: function() {}
});