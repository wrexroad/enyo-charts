enyo.kind({
	name: "myapp.MainView",
	kind: "FittableRows",
  classes: "chart-panel",
	fit: true,
	components:[
		{kind: "onyx.Toolbar"},
    {
      kind: "Chart.Cartesian", name: "chart", fit: true,
      width: 400,
      height: 400,
      
      bgColor: "white",
      fontSize: 14
    },
    {kind: "FittableColumns", classes: "enyo-center", components: [
      {kind: "onyx.Groupbox", components: [
			  {kind: "onyx.GroupboxHeader", content: "X Coordinates"},
			  {
          kind: "onyx.TextArea", name: "xVals", onchange:"inputChanged"
        },
		  ]},
      {kind: "onyx.Groupbox", components: [
			  {kind: "onyx.GroupboxHeader", content: "Y Coordinates"},
			  {
          kind: "onyx.TextArea", name: "yVals", onchange:"inputChanged"
        },
		  ]},
      {kind: "onyx.Groupbox", components: [
			  {kind: "onyx.GroupboxHeader", content: "Messages"},
			  {kind: "onyx.TextArea", name: "msg"}
		  ]}
    ]}
	],
  rendered: function() {
    var
      twopi = Math.PI * 2,
      twopihundredth = twopi / 100,
      xVals = [],
      yVals = [];
      
    this.inherited(arguments);
    
    //generate a 100 point sine wave
    for (var i = 0; i < twopi; i += twopihundredth) {
      xVals.push(360 * (i/ twopi));
      yVals.push(Math.sin(i));
    }
    //and fill the text boxes with them
    this.$.xVals.set("value", xVals.join(", "));
    this.$.yVals.set("value", yVals.join(", "));
    
    this.draw();
  },
	inputChanged: function(inSender, inEvent) {
		var xVals, yVals;
    
    xVals = this.$.xVals.value.split(",");
    yVals = this.$.yVals.value.split(",");
    
    if (xVals.length != yVals.length) {
      this.$.msg.set("content", "X and Y value lists must be the same length");
      return;
    }
    
    this.draw();
    this.resize();
	},
  draw: function() {
    var
      xVals = this.$.xVals.getValue().split(","),
      yVals = this.$.yVals.getValue().split(","),
      datasets = [{
        options: {},
        data: {
          name: "Sample Data",
          //An array of points where each element is a 2 element array [x, y]
          coords: []
        }
      }];
    
    //fill the coordinate array
    yVals.forEach(function(value, index) {
      datasets[0].data.coords.push([xVals[index], value]);
    })
    
    this.$.chart.draw(
      {/*options*/},
      {datasets: datasets}
    );
  }
});
