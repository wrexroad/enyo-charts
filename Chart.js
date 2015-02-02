enyo.kind({
  name: "Chart",
  kind: "Component",
  
  published: {  
    height: 0,
    width: 0,
    plotRegion: 0,
    bgImg: "", //id of <img> tag to be used as a background
    bgColor: '#CCCCCC',
    borderColor: '#000000',
    gridColor: "gray",
    textColor: "black",
    cssFont: '14px "Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace',
    dataCache: null
  },
  observers: [
    {method: "resize", path: ["height", "width"]},
    {method: "calculateSpacing", path: ["dataCache"]}
  ],

  components: [
    {name: "decorCanvas", kind: "enyo.Canvas"},
    {name: "dataCanvas", kind: "enyo.Canvas"}
  },

  constructor: function() {
    this.inherited(arguments);

    //plotRegion defines the bounds of the data canvas relative to the decor
    this.plotRegion = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };

    //default x and y origins for the canvas coordinate system   
    this.origin = {x : 60, y : 20};

    this.resize();
  },
  resize: function(){
    
    //adjust the size of each canvas
    this.$.decorCanvas.attributes.height = this.height;
    this.$.decorCanvas.attributes.width = this.width;
    this.$.dataCanvas.attributes.height =
      this.height - this.plotRegion.top - this.plotRegion.bottom;
    this.$.dataCanvas.attributes.width =
      this.width - this.plotRegion.left - this.plotRegion.right;

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
  },
  draw: function(chartData) {
    this.set("dataCache", chartData);
    this.drawData();
    this.drawDecor();
  },

  //abstract functions to be defined by the chart subkind
  drawData: function() {},
  drawDecor: function() {},
  calculateSpacing: function() {},
  invertCoordinates: function() {}
});