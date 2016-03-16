enyo.kind({
  name: "XYScatterSingle",
  kind: "FittableRows",
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
      fontSize: 14
    },
    {kind: "FittableColumns", components: [
      {kind: "onyx.Groupbox", components: [
        {kind: "onyx.GroupboxHeader", content: "X"},
        {kind: "onyx.InputDecorator", components: [{
          kind: "onyx.TextArea", name: "xVals",
          attributes: {cols: 10, rows: 7},
          onchange: "draw"
        }]},
      ]},
      {kind: "onyx.Groupbox", components: [
        {kind: "onyx.GroupboxHeader", content: "Y"},
        {kind: "onyx.InputDecorator", components: [{
          kind: "onyx.TextArea", name: "yVals",
          attributes: {cols: 10, rows: 7},
          onchange: "draw"
        }]}
      ]},
      {kind: "onyx.Groupbox", fit: true, components: [
        {kind: "onyx.GroupboxHeader", content: "Plot Options"},
        {kind: "onyx.InputDecorator", components: [
          {content: "Width: "},
          {
            kind: "onyx.Input", name: "width", attributes: {size: 5},
            onchange: "draw", value: 400
          },
          {content: "Height: "},
          {
            kind: "onyx.Input", name: "height", attributes: {size: 5},
            onchange: "draw", value: 400
          }
        ]},
        {kind: "onyx.InputDecorator", components: [
          {content: "xMin: "},
          {
            kind: "onyx.Input", name: "xMin", attributes: {size: 5},
            onchange: "draw", value: 0
          },
          {content: "xMax: "},
          {
            kind: "onyx.Input", name: "xMax", attributes: {size: 5},
            onchange: "draw", value: 360
          }
        ]},
        {kind: "onyx.InputDecorator", components: [
          {content: "yMin: "},
          {
            kind: "onyx.Input", name: "yMin", attributes: {size: 5},
            onchange: "draw", value: -1
          },
          {content: "yMax: "},
          {
            kind: "onyx.Input", name: "yMax", attributes: {size: 5},
            onchange: "draw", value: 1
          }
        ]},
      ]}
    ]},
    
    {fit: true, components: [
      {kind: "onyx.GroupboxHeader", content: "Data Options"},
      {kind: "Group", components: [
        {
          kind: "onyx.Button", style: "padding: 10px; background-color: red",
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
      {content: "Line Width"},
      {
        kind: "onyx.Slider", name: "lineSize", 
        value: 5,
        onChanging:"draw", onChange:"draw"
      },
      {content: "Point Width"},
      {
        kind: "onyx.Slider", name: "dotSize", 
        value: 0,
         onChanging:"draw", onChange:"draw"
      }
    ]},
    {kind: "onyx.Groupbox", components: [
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
    var
      twopi = Math.PI * 2,
      twopininety = twopi / 90,
      xVals = [],
      yVals = [];
      
    this.inherited(arguments);
    
    //generate a 90 point sine wave
    for (var i = 0; i < twopi; i += twopininety) {
      xVals.push((360 * (i / twopi)).toFixed(3));
      yVals.push(Math.sin(i).toFixed(3));
    }
    //and fill the text boxes with them
    this.$.xVals.set("value", xVals.join(", "));
    this.$.yVals.set("value", yVals.join(", "));

    if (this.width) {
      this.$.width.set("value", this.width - 20);
    }
    
    this.draw();
  },
  setColor: function(inSender, inEvent) {
    this.color = inSender.value;
    this.draw();
  },
  draw: function() {

    var
      //turn the x and y values into an array
      xVals = this.$.xVals.getValue().split(","),
      yVals = this.$.yVals.getValue().split(","),
      datasets = [{
        options: {
          color: this.color,
          lines: {size: this.$.lineSize.getValue() / 10},
          dots: {size: this.$.dotSize.getValue() / 10}
        },
        data: {
          name: "Sample Data",
          //An 2d array of points where each element is a 2 element array [x, y]
          coords: []
        }
      }];

    //if x values are not provided, just use the index form the y values
    if (this.$.xVals.value.trim() == "") {
      yVals.forEach(function(val, i) {
        xVals[i] = i;
      });
    } 
    
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
