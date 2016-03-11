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
      bgColor: "white",
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
    this.animationStep();
  },
  animationStep: function() {
    if (this.animation) {
      window.requestAnimationFrame(this.animationStep.bind(this));
    }
    
    this.addDataset();
    this.draw();
  },
  reset: function() {
    this.datasets = [];
    this.draw();
  },
  addDataset: function() {
    var
      twopi = Math.PI * 2,
      twopininety = twopi / 90,
      amplitude = ((10 - this.datasets.length) / 10),
      coords = [[], []];
     
    //start a draw timer to help collect statistics
    this.startTime = enyo.perfNow();
    
    //generate a 90 point sine wave that is a little shorter than the last
    for (var i = 0; i < twopi; i += twopininety) {
      coords.push(
        [(360 * (i / twopi)).toFixed(3), (Math.sin(i) * amplitude).toFixed(3)]
      );
    }
    
    this.datasets.push({
      options: {
        color: "#" + ((Math.random() * 0xFFFFFF) >> 0).toString(16)
      },
      data: {
        name: "Data " + this.datasets.length,
        coords: coords
      }
    });
  },
  draw: function() {
    var startTime = enyo.perfNow();

    this.$.chart.set("width", this.width ? (this.width - 20) : 400);
    this.$.chart.set("height", 400);
    
    this.$.chart.draw(
      {/*Manually set plot range here*/},
      {datasets: this.datasets}
    );
    
    this.updateStats();
  },
  updateStats: function() {
    this.$.fps.set("value", (enyo.perfNow() - this.startTime).toFixed(3));
    this.$.numSets.set("value", this.datasets.length);
    this.$.numPts.set("value", this.datasets.length * 90);
  }
});
