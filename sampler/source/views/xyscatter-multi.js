enyo.kind({
  name: "XYScatterMulti",
  kind: "FittableRows",
  classes: "chart-panel",
  components: [
    {kind: "onyx.Toolbar", components: [
      {kind: "onyx.InputDecorator", components: [
        {content: "XY - Scatter (Multi Data)"}
      ]}
    ]},
    {
      kind: "Chart.Cartesian", name: "chart",
      plotTitle: "Approximation of Pi",
      bgColor: "white",
      font: "sans-serif",
      fontSize: 14
    },
    {kind: "onyx.InputDecorator", style: "display: inline-block", components: [ 
      {kind: "onyx.Button", content: "Add Data", ontap: "animationStep"},
      {
        kind: "onyx.Button", name: "animation",
        content: "Toggle Animation", ontap: "toggleAnimation"
      },
      {kind: "onyx.Button", content: "Reset", ontap: "reset"},
      {kind: "enyo.Group", components: [
			  {kind: "enyo.Checkbox", name: "lines", active: true, content: "Lines"},
        {tag: "br"},
			  {kind: "enyo.Checkbox", name: "dots", content: "Dots"},
        {tag: "br"},
			  {kind: "enyo.Checkbox", name: "poly", content: "Polygons"}
      ]}
    ]},
    {kind: "onyx.InputDecorator", components: [
      {content: "FPS: "},
      {kind: "onyx.Input", name: "fps", attributes: {size: 5}},
      {content: "Datasets Per Frame: "},
      {kind: "onyx.Input", name: "numSets", attributes: {size: 5}},
      {content: "Points Per Frame: "},
      {kind: "onyx.Input", name: "numPts", attributes: {size: 5}}
    ]}
  ],
  published: {
    datasets: 0,
    animation: 0
  },
  rendered: function() {
    this.inherited(arguments);
    
    this.initVals();
    this.draw();
  },
  initVals: function() {
    this.$.chart.plotTitle = "Approximation of Pi";
    this.datasets = [];
    this.numPts = 0;
    this.elapsedTime = NaN;
  },
  reset: function(inSender, inEvent) {
    this.initVals();
    this.draw();
    return true;
  },
  toggleAnimation: function() {
    this.animation = !this.animation;
    if (this.animation) {
      window.requestAnimationFrame(this.animationStep.bind(this));
    }
  },
  animationStep: function(timestamp) {
    if (this.animation) {
      window.requestAnimationFrame(this.animationStep.bind(this));
    }
    
    //record the draw time of the last frame and restart the draw timer
    this.elapsedTime = timestamp - this.drawTimer;
    this.drawTimer = timestamp;
    
    //create some new data and draw it
    this.addDataset();
    this.draw();
  },
  addDataset: function() {
    var
      coords = [],
      x, y, d, pnt_i;
    
    for (pnt_i = 0; pnt_i < 100; pnt_i++) {
      x = (Math.random() > 0.5 ? -1 : 1) * Math.random();
      y = (Math.random() > 0.5 ? -1 : 1) * Math.random();
      d = Math.hypot(x, y);
      if (d <= 1) {
        this.numPts++;
        coords.push([x, y]);
      }
    }
    
    this.datasets.push({
      options: {
        color: "#" + ((Math.random() * 0xFFFFFF) >> 0).toString(16),
        lines: {
          size: (this.$.lines.getActive() || this.$.poly.getActive()) ? 0.5 : 0,
          fill: this.$.poly.getActive()
        },
        dots: {
          size: this.$.dots.getActive() ? 3 : 0,
          fill: true
        }
      },
      data: {
        name: "Data " + this.datasets.length,
        coords: coords
      }
    });
  },
  draw: function() {
    this.$.chart.set("width", 400);
    this.$.chart.set("height", 400);
    
    this.$.chart.configurePlot({
      xMin: -1, xMax: 1, yMin: -1, yMax: 1,
      datasets: this.datasets
    });
    
    this.$.chart.draw();
    
    
    this.updateStats();
  },
  updateStats: function() {
    var fps = (1/(this.elapsedTime / 1000)).toFixed(3);
    this.$.fps.set("value", fps);
    this.$.numSets.set("value", this.datasets.length);
    this.$.numPts.set("value", this.numPts);
    this.$.chart.plotTitle =
      "Pi ~ " + ((this.numPts/(this.datasets.length * 100)) * 4).toFixed(5);
  }
});
