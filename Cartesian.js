enyo.kind({
  name: "Chart.Cartesian",
  kind: "Chart",

  published: {
    xSpacingFactor: 1,
    ySpacingFactor: 1
  },

  drawData: function() {
    
  },
  drawDecor: function() {
    var
      ctx = this.decorCtx,
      plotRegion = this.plotRegion;

    //configure the drawing context
    ctx.save();
    ctx.strokeStyle = this.borderColor;
    ctx.textAlign = "end";

    //outline the grid
    ctx.translate(plotRegion.left, plotRegion.top);
    ctx.strokeRect(0, 0, this.width, this.height);

    //draw the y axis tics and labels
    ctx.translate(0, this.height);
    
    labels =
      Dave_js.Utils.createLabels(
        this.range.yMin,
        this.range.yMax,
        y
      );
    numLabels = labels.length;

    for (pnt_i = 0, ticLocation = 0; pnt_i < numLabels; pnt_i ++) {
      ticLocation = -labels[pnt_i].coord * this.spacing.y;
      ctx.fillText(labels[pnt_i].text, -5, ticLocation + 5);
      ctx.beginPath();
      ctx.moveTo(0, ticLocation);
      ctx.lineTo(5, ticLocation);
      ctx.stroke();
    }

    //draw the x axis tics and labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    labels =
      Dave_js.Utils.createTimeLabels(
        this.range.xMin,
        this.range.xMax,
        dataStore.getVar(vars.x)
      );
      
    numLabels = labels.length;
    halfWidth =
      Math.ceil(ctx.measureText((new Array(x.labelLength)).join('W')).width);

    for (pnt_i = 0, ticLocation = 0; pnt_i < numLabels; pnt_i++) {
      labelText = labels[pnt_i].text;
      ticLocation = labels[pnt_i].coord * this.spacing.x;

      if(ticLocation > lastText) {
        ctx.fillText(labelText, ticLocation, fontSize);
        lastText = ticLocation + halfWidth;
        ticLength = -15;
      } else {
        ticLength = -5;
      }

      ctx.beginPath();
      ctx.moveTo(ticLocation, 0);
      ctx.lineTo(ticLocation, ticLength);
      ctx.stroke();
    }
    ctx.restore();
  },
  calculateMargins: function() {
    this.set("plotRegion", {
      //room for the title
      top: this.fontSize,
      
      //room for two lines of x axis lables
      bottom: this.fontSize << 1,

      //y axis lables can be 10 charcters wide
      left: this.decorCtx.measureText((new Array(10)).join('W')).width,

      //meh
      right: 0
    });
  },
  calculateSpacing: function() {
    var data = this.dataCache;

    this.set("xSpacingFactor", this.width / (data.xMax - data.xMin));
    this.set("ySpacingFactor", this.height / (data.yMax - data.yMin));
  },
  invertCoodinates: function(x, y) {
    return {
      x: this.xMin + x / this.xSpacingFactor,
      y: this.yMax - y / this.ySpacingFactor
    };
  }
});