enyo.kind({
  name: "XYLineMulti",
  kind: "FittableRows",
  classes: "chart-panel",
  components: [
    {kind: "onyx.Toolbar", components: [
      {kind: "onyx.InputDecorator", components: [
        {content: "XY - Line (Multi Data)"}
      ]}
    ]},
    {
      kind: "Chart.Cartesian", name: "chart",
      plotTitle: "Multi-Dataset Plot",
      bgColor: "white",
      font: "sans-serif",
      fontSize: 14
    },
    
    {kind: "onyx.Button", content: "Add Data", ontap: "animationStep"},
    {
      kind: "onyx.Button", name: "animation",
      content: "Toggle Animation", ontap: "toggleAnimation"
    },
    {kind: "onyx.Button", content: "Reset", ontap: "reset"},
    {kind: "onyx.InputDecorator", components: [
      {content: "FPS: "},
      {kind: "onyx.Input", name: "fps", attributes: {size: 10}},
      {content: "Datasets Plotted: "},
      {kind: "onyx.Input", name: "numSets", attributes: {size: 10}},
      {content: "Points Plotted: "},
      {kind: "onyx.Input", name: "numPts", attributes: {size: 10}}
    ]}
  ],
  published: {
    datasets: 0,
    animation: 0
  },
  rendered: function() {
    this.inherited(arguments);
    
    this.datasets = [];
    
    this.draw();
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
  reset: function() {
    this.datasets = [];
    this.elapsedTime = NaN;
    this.draw();
  },
  addDataset: function() {
    var
      twopi = Math.PI * 2,
      twopininety = twopi / 90,
      amplitude = ((10 - this.datasets.length) / 10),
      coords = [[], []];
    
    //generate a 90 point sine wave that is a little shorter than the last
    for (var i = 0; i < twopi; i += twopininety) {
      coords.push(
        [(360 * (i / twopi)).toFixed(3), (Math.sin(i) * amplitude).toFixed(3)]
      );
    }
    
    this.datasets.push({
      options: {
        color: "#" + ((Math.random() * 0xFFFFFF) >> 0).toString(16),
        lines: {
          size: 0.5,
          fill: false
        },
        dots: {
          size: 0
        }
      },
      data: {
        name: "Data " + this.datasets.length,
        coords: coords
      }
    });
  },
  draw: function() {
    this.$.chart.set("width", this.width ? (this.width - 20) : 400);
    this.$.chart.set("height", 400);
    
    this.$.chart.draw(
      {/*Manually set plot range here*/},
      {datasets: this.datasets}
    );
    
    this.updateStats();
  },
  updateStats: function() {
    var fps = (1/(this.elapsedTime / 1000)).toFixed(3);
    this.$.fps.set("value", fps);
    this.$.numSets.set("value", this.datasets.length);
    this.$.numPts.set("value", this.datasets.length * 90);
  }
});
