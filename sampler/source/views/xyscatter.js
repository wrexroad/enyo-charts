enyo.kind({
	name: "XYScatterSample",
	kind: "FittableRows",
  classes: "chart-panel",
	fit: true,
  published: {
    color: "black"
  },
	components: [
    {kind: "onyx.Toolbar", components: [
      {kind: "onyx.InputDecorator", components: [
        {content: "XY - Scatter"}
      ]}
    ]},
    {
      kind: "Chart.Cartesian", name: "chart",
      width: 400,
      height: 400,
      bgColor: "white",
      fontSize: 14
    },
    {kind: "FittableColumns", components: [
      {kind: "onyx.Groupbox", components: [
		   {kind: "onyx.GroupboxHeader", content: "X"},
		   {kind: "onyx.InputDecorator", components: [{
          kind: "onyx.TextArea", name: "xVals",
          attributes: {cols: 20, rows: 10},
          onchange: "draw"
        }]},
		  ]},
      {kind: "onyx.Groupbox", components: [
		   {kind: "onyx.GroupboxHeader", content: "Y"},
		   {kind: "onyx.InputDecorator", components: [{
          kind: "onyx.TextArea", name: "yVals",
          attributes: {cols: 20, rows: 10},
          onchange: "draw"
        }]},
		  ]}
    ]},
    {kind: "onyx.Groupbox", components: [
		 {kind: "onyx.GroupboxHeader", content: "Messages"},
		 {kind: "onyx.InputDecorator", components: [
        {kind: "onyx.TextArea", name: "msg", attributes: {cols: 40}}
      ]}
		]}
	],
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
    
    this.draw();
  },
  draw: function() {
    var
      //turn the x and y values into an array
      xVals = this.$.xVals.getValue().split(","),
      yVals = this.$.yVals.getValue().split(","),
      datasets = [{
        options: {color: this.color},
        data: {
          name: "Sample Data",
          //An array of points where each element is a 2 element array [x, y]
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
    
    this.$.chart.draw(
      {/*Plot Options*/},
      {datasets: datasets}
    );
    
    this.resize();
  }
});
