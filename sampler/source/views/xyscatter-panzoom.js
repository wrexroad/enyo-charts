enyo.kind({
  name: "XYScatterPanZoom",
  kind: "Scroller",
  classes: "chart-panel",
  components: [
    {kind: "onyx.Toolbar", components: [
      {kind: "onyx.InputDecorator", components: [
        {content: "XY - Scatter (Pan/Zoom)"}
      ]} 
    ]},
    {
      kind: "Chart.Cartesian", name: "chart", overlay: true,
      bgColor: "lightgrey",
      font: "sans-serif",
      fontSize: 14,
      axisTypes: {
        yLeft: {
          type: "Linear",
          tickCount: 10,
          color: "green"
        },
        yRight: {
          type: "Discrete",
          stops: [
            {label: "Upper Critical", value: 80, color: "red"},
            {label: "Upper Warning", value: 60, color: "yellow"},
            {label: "Lower Warning", value: 40, color: "yellow"},
            {label: "Lower Critical", value: 20, color: "red"},
          ],
          fullLength: true
        },
        x: {
          type: "Date",
          //dateFormat is used for displaying tick marks
          dateFormat: "%DOY/YYYY% %HH%:%mm%:%ss% %T%",
          //shortDateFormat is used for displaying plot coordinates and deltas
          shortDateFormat: "%DDDDD%d %HH%:%mm%:%ss%",
          tickCount: null, //defaults to auto calculated
          minorTickCount: 10 //default is 5           
        }
      }
    },
    {kind: "onyx.Groupbox", fit: true, components: [
      {kind: "onyx.GroupboxHeader", content: "Messages"},
      {kind: "onyx.InputDecorator", components: [
        {tag: "div", name: "msg"}
      ]}
    ]}
  ],
  published: {
    xMin: 0,
    xMax: 0,
    yMin: 0,
    yMax: 0
  },
  rendered: function() {
    this.inherited(arguments);
    
    this.xMax = +(new Date);
    this.xMin = this.xMax - 86400000;
    this.yMax = 100;
    this.yMin = 0;
    
    this.width = this.width - 20;
    this.height = 400;
    
    this.generateData();
    
    this.draw();
  },
  generateData: function() {
    var start, stop, step;
    this.xVals = [];
    this.yVals = [];
    
    //create a place to store the dot and line settings
    this.fill = {dot: false, line: false};
    
    //generate some points of sort of linear data
    start = this.xMin;
    stop = this.xMax;
    step = (stop - start) / 100;
    
    for (var x = start, y = 50; x < stop; ) {
      x += Math.random() * step;
      y = ((Math.random() > 0.5 ? -1 : 1) * Math.random() * 5) + y;
      this.xVals.push(x);
      this.yVals.push(y);
    }
  },
  draw: function() {
    var
      //turn the x and y values into an array
      xVals = this.xVals,
      yVals = this.yVals,
      datasets = [{
        options: {
          color: "blue",
          lines: {size: 0.5},
          dots: {size: 3}
        },
        data: {
          name: "Random Data",
          //An 2d array of points where each element is a 2 element array [x, y]
          coords: []
        }
      }];
    
    //fill the 2d coordinate array
    yVals.forEach(function(value, index) {
      datasets[0].data.coords.push([xVals[index], value]);
    })
    
    this.$.chart.set("width", this.width);
    this.$.chart.set("height", this.height);
    
    this.$.chart.draw(
      {
        title: "Sample Plot with Pan and Zoom",
        xMin: this.xMin,
        xMax: this.xMax,
        yMin: this.yMin,
        yMax: this.yMax,
      },
      {datasets: datasets}
    );
    
    this.resize();
  }
});
