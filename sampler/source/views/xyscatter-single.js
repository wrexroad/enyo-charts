enyo.kind({
  name: "XYScatterSingle",
  kind: "Scroller",
  classes: "chart-panel",
  components: [
    {kind: "onyx.Toolbar", components: [
      {kind: "onyx.InputDecorator", components: [
        {content: "XY - Scatter (Plot Options)"}
      ]} 
    ]},
    {
      kind: "Chart.Cartesian", name: "chart",
      bgColor: "white",
      font: "sans-serif",
      fontSize: 14
    },
    
    {kind: "FittableColumns", components: [
      {kind: "onyx.Groupbox", components: [
        {kind: "onyx.GroupboxHeader", content: "Data Options"},
        {kind: "Group", components: [
          {
            kind: "onyx.Button",
            style: "padding: 10px; background-color: red",
            value: "red", active: true, content: "Red", ontap: "setColor"
          },
          {
            kind: "onyx.Button",
            style: "padding: 10px; background-color: blue",
            value: "blue", content: "Blue", ontap: "setColor"
          },
          {
            kind: "onyx.Button",
            style: "padding: 10px; background-color: green",
            value: "green", content: "Green", ontap: "setColor"
          },
          {
            kind: "onyx.Button",
            style: "padding: 10px; background-color: black",
            value: "black", content: "Black", ontap: "setColor"
          }
        ]},
        {components:[
          {
            kind: "onyx.Button", name: "lineFill", linedot: "line",
            content: "Line Fill", ontap:"toggleFill"
          },
          {
            kind: "onyx.Button", name: "dotFill", linedot: "dot",
            content: "Dot Fill", ontap:"toggleFill"
          },
          {content: "Line Width"},
          {
            kind: "onyx.Slider", name: "lineSize", 
            value: 3, onChanging:"draw", onChange:"draw"
          },
          {content: "Dot Width"},
          {
            kind: "onyx.Slider", name: "dotSize", 
            value: 30, onChanging:"draw", onChange:"draw"
          }
        ]}
      ]},
      {kind: "onyx.Groupbox", components: [
        {kind: "onyx.GroupboxHeader", content: "Sample Data"},
        {kind: "onyx.InputDecorator", components: [{
          kind: "onyx.Input", name: "datasetName",
          value: "Dataset 1",
          onchange: "draw"
        }]},
        {style: "display: inline-block; width: 49%", components: [
          {content: "X"},
          {
            kind: "onyx.TextArea", name: "xVals",
            attributes: {cols: 10, rows: 7},
            onchange: "draw"
          }
        ]},
        {style: "display: inline-block; width: 49%", components: [
          {content: "Y"},
          {
            kind: "onyx.TextArea", name: "yVals",
            attributes: {cols: 10, rows: 7},
            onchange: "draw"
          }
        ]}
      ]},
      {kind: "onyx.Groupbox", fit: true, components: [
        {kind: "onyx.GroupboxHeader", content: "Plot Options"},
        {kind: "onyx.InputDecorator", components: [
          {
            kind: "onyx.Input", name: "title",
            onchange: "draw", value: "Single Dataset Plot"
          }
        ]},
        {content: "Canvas Size"},
        {kind: "onyx.InputDecorator", components: [
          {
            kind: "onyx.Input", name: "width", attributes: {size: 5},
            onchange: "draw", value: 400
          },
          {content: "x"},
          {tag: "br"},
          {
            kind: "onyx.Input", name: "height", attributes: {size: 5},
            onchange: "draw", value: 400
          }
        ]},
        {content: "X Axis Range"},
          {kind: "onyx.InputDecorator", components: [
          {
            kind: "onyx.Input", name: "xMin", attributes: {size: 5},
            onchange: "draw", value: 0
          },
          {
            kind: "onyx.Input", name: "xMax", attributes: {size: 5},
            onchange: "draw", value: 100
          }
        ]},
        {content: "Y Axis Range"},
          {kind: "onyx.InputDecorator", components: [
          {
            kind: "onyx.Input", name: "yMin", attributes: {size: 5},
            onchange: "draw", value: 0
          },
          {
            kind: "onyx.Input", name: "yMax", attributes: {size: 5},
            onchange: "draw", value: 100
          }
        ]},
      ]}
    ]},
    {kind: "onyx.Groupbox", fit: true, components: [
      {kind: "onyx.GroupboxHeader", content: "Messages"},
      {kind: "onyx.InputDecorator", components: [
        {tag: "div", name: "msg"}
      ]}
    ]}
  ],
  published: {
    color: "red"
  },
  rendered: function() {
    this.inherited(arguments);
    
    this.generateData();
    
    if (this.width) {
      this.$.width.set("value", this.width - 20);
    }
    
    this.draw();
  },
  setColor: function(inSender, inEvent) {
    this.color = inSender.value;
    this.draw();
    return true;
  },
  toggleFill: function(inSender, inEvernt) {
    inSender.addRemoveClass("active");
    this.fill[inSender.linedot] = !this.fill[inSender.linedot];
    
    this.draw();
    return true;
  },
  generateData: function() {
    var
      xVals = [],
      yVals = [];
    
    //create a place to store the dot and line settings
    this.color = "red";
    this.fill = {dot: false, line: false};
    
    //generate some points of sort of linear data
    for (var i = 0; i < 100; i += (Math.random() * 2.5)) {
      xVals.push(i);
      yVals.push(((Math.random() > 0.5 ? -1 : 1) * Math.random() * 5) + i);
    }
    //and fill the text boxes with them
    this.$.xVals.set("value", xVals.join(", "));
    this.$.yVals.set("value", yVals.join(", "));
  },
  draw: function() {

    var
      //turn the x and y values into an array
      xVals = this.$.xVals.getValue().split(","),
      yVals = this.$.yVals.getValue().split(","),
      datasets = [{
        options: {
          color: this.color,
          lines: {
            size: this.$.lineSize.getValue() / 10,
            fill: this.fill.line
          },
          dots: {
            size: this.$.dotSize.getValue() / 10,
            fill: this.fill.dot
          }
        },
        data: {
          name: this.$.datasetName.value,
          //An 2d array of points where each element is a 2 element array [x, y]
          coords: []
        }
      }];
    
    //make sure we have the same number of coordinates for x and y 
    if (xVals.length != yVals.length) {
      this.$.msg.set("content", "X and Y value lists must be the same length");
      return;
    }
    
    //fill the 2d coordinate array
    yVals.forEach(function(value, index) {
      datasets[0].data.coords.push([xVals[index], value]);
    })
    
    this.$.chart.set("width", this.$.width.value);
    this.$.chart.set("height", this.$.height.value);
    
    this.$.chart.draw(
      {
        title: this.$.title.value,
        xMin: this.$.xMin.value,
        xMax: this.$.xMax.value,
        yMin: this.$.yMin.value,
        yMax: this.$.yMax.value,
      },
      {datasets: datasets}
    );
    
    this.resize();
  }
});
