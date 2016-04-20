/* global enyo */
enyo.kind({
  name: "CartesianOverlay",
  published: {
    bounds: null,
    plotView: null,
    avtiveRegion: null,
    cursor: null,
    showCrosshairs: true,
    crosshairsColor: "#330000",
    crosshairsLabel: "",
    zoomboxCoords: null,
    zoomboxColor: "#330000",
    trendlineCoords: null,
    trendlineColor: "green",
    trendlineLabel: "",
    chartHeight: 0,
    chartWidth: 0,
    offset: 0,
  },
  observers: {
    resize: ["chartWidth", "chartHeight", "plotView.plotMargins"]
  },
  events: {
    onZoom: "",
    onPan: "",
    onRange: "",
    onSetAutorange: "",
    onSetAxisRange: ""
  },
  rendered: function() {
    this.inherited(arguments);
    this.holdPulseCount = 0;
    this.cancelTap = false;

    //get the associated plotView
    this.plotView = this.owner;

    this.resize();
  },
  resize: function(previous, current, property) {
    var bounds, region, coords;

    //check if anything really changed
    if (
      previous && current &&
      previous.top == current.top && 
      previous.bottom == current.bottom && 
      previous.left == current.left && 
      previous.right == current.right
    ) {
      return true;
    }

    //get rid of any current overlay regions
    this.destroyRegions();

    //figure out the new sizes of each region
    bounds = this.calculateBounds();

    if (bounds === null) {
      return null;
    }

    //create data region
    region = this.createRegion(bounds.dataRegion, "dataRegion").render();
    region.onmove = "cursorMoved";
    region.onenter = "cursorEntered";
    region.onleave = "cursorLeft";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";
    region.onmousewheel = "zoomByWheel";
    region.ondragfinish = "handleDrag";
    region.ondrag = "handleDrag";
    region.onholdpulse = "handlePulse";
    region.onrelease = "handleRelease";

    /*
    //create crosshairs
    region.createComponent(
      {kind: "Overlay.Crosshairs", name: "crosshairs"}
    );
    region.$.crosshairs.labelColor = "green";
    region.$.crosshairs.lineColor = "#330000"; 
    */
    /*//create a zoom box canvas element in dataRegion
    region.createComponent({
      kind: "enyo.canvas.Rectangle", name: "zb",
      outlineColor: "#330000", color: "", bounds: {}
    });*/
    
    //create trendline stuff
    /*region.createComponent(
      {
        kind: "Overlay.Trendline", name: "trendline",
        labelColor: "green", lineColor: "#330000"
      }
    );
    region.$.trendline.bounds = {
      width: bounds.dataRegion.width,
      height: bounds.dataRegion.height
    };
    
    if (typeof this.mark1 == "object") {
      coords = this.plotView.invertValue(this.mark1);
      region.$.trendline.bounds.x1 = coords.x;
      region.$.trendline.bounds.y1 = coords.y;
    }
    if (typeof this.mark2 == "object") {
      coords = this.plotView.invertValue(this.mark2);
      region.$.trendline.bounds.x2 = coords.x;
      region.$.trendline.bounds.y2 = coords.y;
    }
    region.$.trendline.createLabel = {
      method: (function(coords) {
        var
          x1 = coords.x1,
          x2 = coords.x2,
          y1 = coords.y1,
          y2 = coords.y2,
          pointValue, dx, dy;
        
        pointValue = this.plotView.invertCoordinates({x: x1, y: y1});
        x1 = pointValue.x;
        y1 = pointValue.y;
        pointValue = this.plotView.invertCoordinates({x: x2, y: y2});
        x2 = pointValue.x;
        y2 = pointValue.y;
        
        dx = x2 - x1;
        dy = y2 - y1;
        
        return (
          "Δy: " + (dy).toPrecision(5) + ", " +
          "Δt: " +
            //check for more than one day 
            (dx > 86400 ? ((dx / 86400) >> 0) + "d " : "") +
            dx
        );
      }),
      context: this
    };
    */


    //create zoom margins
    region = this.createRegion(bounds.leftRegion, "leftRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";
    
    region = this.createRegion(bounds.rightRegion, "rightRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";

    region = this.createRegion(bounds.bottomRegion, "bottomRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";
    
    return true;
  },
  createRegion: function(bounds, name) {
    var region;

    if (this.$[name]) {return;}

    //create a canvas that we can use to draw over the plot
    region = this.createComponent({
      kind: "enyo.Canvas", name: name,
      doubleTapEnabled: true,
      classes: "plot-overlay",
      attributes: {
        height: bounds.height,
        width:  bounds.width
      },
      style: 
        "position: absolute;" +
        "left:" + bounds.left + "px; " +
        "top:" + bounds.top + "px; " +
        "z-index: 99;"
    });

    region.render();
    return region;
  },
  destroyRegions: function() {
    //either get the overlay or an empty but destroyable object
    (this.$.dataRegion || {destroy: function(){}}).destroy();
    (this.$.leftRegion || {destroy: function(){}}).destroy();
    (this.$.rightRegion || {destroy: function(){}}).destroy();
    (this.$.bottomRegion || {destroy: function(){}}).destroy();
    return true;
  },
  calculateBounds: function() {
    var
      plotView = this.plotView || {},
      margins = plotView.decorMargin || null,
      chartHeight = this.chartHeight,
      chartWidth = this.chartWidth,
      bounds;
    if (margins === null) {
      return null;
    }
    
    bounds = {
      leftRegion: {
        left: 0,
        right: margins.left,
        top: margins.top,
        bottom: chartHeight - margins.bottom,
        width: margins.left,
        height: chartHeight - margins.top - margins.bottom
      },
      rightRegion: {
        left: chartWidth - margins.right,
        right: chartWidth,
        top: margins.top,
        bottom: chartHeight - margins.bottom,
        width: margins.right,
        height: chartHeight - margins.top - margins.bottom
      },
      bottomRegion: {
        left: margins.left,
        right: chartWidth - margins.right,
        top: chartHeight - margins.bottom,
        bottom: chartHeight,
        width: chartWidth - margins.left - margins.right,
        height: margins.bottom
      },
      dataRegion: {
        left: margins.left,
        right: chartWidth - margins.right,
        top: margins.top,
        bottom: chartHeight - margins.bottom,
        width: chartWidth - margins.left - margins.right,
        height: chartHeight - margins.top - margins.bottom
      }
    };

    this.set("bounds", bounds);

    return bounds;
  },
  refresh: function() {
    var
      cursor = this.cursor,
      dataRegionBounds = this.bounds.dataRegion,
      ctx, zoom;

    if (!dataRegionBounds) { return; }
    
    ctx = this.$.dataRegion.node.getContext('2d');
    
    //clear off any old overlay data
    ctx.clearRect(0, 0, dataRegionBounds.width, dataRegionBounds.height);
    
    //draw zoom box if we are currently zooming
    if (zoom = this.zoomboxCoords) {
      ctx.save();
      ctx.strokeStyle = this.zoomboxColor;
      ctx.strokeRect(zoom.l, zoom.t, zoom.w, zoom.h);
      ctx.restore();
    }
    
    //draw crosshairs is they are supposed to be showing
    if (this.showCrosshairs && cursor && !cursor.outOfBounds) {
      ctx.save();
      ctx.strokeStyle = this.crosshairsColor;
      ctx.beginPath();
      ctx.moveTo(0, cursor.y);
      ctx.lineTo(dataRegionBounds.width, cursor.y);
      ctx.moveTo(cursor.x, 0);
      ctx.lineTo(cursor.x, dataRegionBounds.height);
      ctx.stroke();
      ctx.restore();
    }
  },
  activateCrosshairs: function() {
    var dataRegion = this.$.dataRegion;

    if(!this.showCrosshairs || !dataRegion) {
      return;
    }

    this.showCrosshairs = true;
  },
  deactivateCrosshairs: function(inSender, inEvent) {
        
    this.showCrosshairs = false;
    this.trendlineCoords = null;
    
    return true;
  },
  cursorMoved: function(inSender, inEvent) {
    var
      bounds = this.bounds,
      dataRegion = bounds.dataRegion,
      plotView = this.plotView,
      currentNode = plotView.node,
      x = inEvent.pageX - dataRegion.left,
      y = inEvent.pageY - dataRegion.top;
    
    if (!isFinite(x + y)) {
      return null;
    }
    
    //subtract and element offsets from the provided coordinates
    while (currentNode) {
      x -= currentNode.offsetLeft;
      y -= currentNode.offsetTop;
      currentNode = currentNode.offsetParent;
    }
    
    if (!isFinite(x + y)) {
      return null;
    }
    
    //make sure the resulting coordinates are within the plot area
    x = x < 0 ? 0 : x;
    x = x > dataRegion.width ? dataRegion.width : x;
    y = y < 0 ? 0 : y;
    y = y > dataRegion.width ? dataRegion.height : y;
    
    this.cursor = { x: x, y: y};
    
    if (this.zoomboxCoords) {
      this.zoomByBox(inSender, inEvent);
    }
    
    return true;
  },
  cursorEntered: function(inSender, inEvent) {
    //this.activateCrosshairs(inSender, inEvent);
    this.cursorMoved(inSender, inEvent);
    
    return true;
  },
  cursorLeft: function(inSender, inEvent) {
    //this.deactivateCrosshairs(inSender, inEvent);
    this.cursorMoved(inSender, inEvent);
    this.cursor.outOfBounds = true;
    return true;
  },
  markPlot: function(inSender, inEvent) {
    if (!this.trendlineCoords) {
      //no marks have been set yet
      this.trendlineCoords = {
        mark1: {
          x: this.cursor.x,
          y: this.cursor.y,
          value: this.plotView.invertCoordinates(this.cursor)
        }
      };
    } else if (this.trendlineCoords.mark1 && !this.trendlineCoords.mark2) {
      //save the second point of the trendline
      this.trendlineCoords.mark2 = {
        x: this.cursor.x,
        y: this.cursor.y,
        value: this.plotView.invertCoordinates(this.cursor)
      };
    } else {
      //both points were previously set, clear them
      this.trendlineCoords = null;
    }
    
    return true;
  },
  zoomByWheel: function(inSender, inEvent){
    var
      zoomRegion = inSender.name,
      cursorValue = this.cursor;

    if (!cursorValue) {
      return true;
    }

    this.doZoom({
      scaleX: zoomRegion !== "leftRegion" && zoomRegion !== "rightRegion" ?
        (inEvent.wheelDeltaY > 0 ? 0.9 : 1.1) : 1,
      scaleY: zoomRegion !== "bottomRegion" ?
        (inEvent.wheelDeltaY > 0 ? 0.9 : 1.1) : 1,
      centerValue: cursorValue
    });

    return true;
  },
  zoomByAxis: function(inSender, inEvent){
    var
      zoomRegion = inSender.name,
      regionAttributes = inSender.attributes,
      height = regionAttributes.height,
      width = regionAttributes.width,
      midX = width >> 1,
      midY = height >> 1,
      cursor = this.cursor,
      scaleX = 1,
      scaleY = 1;
    
    if (!cursor) {
      return;
    }

    if (zoomRegion === "leftRegion" && inEvent.ddy) {
      scaleY +=
        //direction and magnitude of scale factor
        ((cursor.y - inEvent.dy) > (height >> 1) ? -2 : 2) *
        //proportion of axis scale factor 
        (inEvent.ddy / height);
      
    } else if (zoomRegion === "bottomRegion" && inEvent.ddx) {
      scaleX +=
        ((cursor.x - inEvent.dx) > (width >> 1) ? -2 : 2) *
        ( inEvent.ddx / width);
    }
    
    //make sure we aren't just scaling eveything by 1
    if (scaleX != 1 || scaleY != 1) {
      this.doZoom({
        scaleX: scaleX,
        scaleY: scaleY,
        centerValue: this.plotView.invertCoordinates({x: midX, y: midY})  
      });
    }
    
    return true;
  },
  zoomByBox: function(inSender, inEvent) {
    var 
      ctx = this.$.dataRegion.node.getContext('2d'),
      cursor = this.cursor,
      plotView = this.plotView,
      start, end, xMin, xMax, yMin, yMax, t, l, w, h, dx, dy;

    if (!cursor) {
      return true;
    }

    if ("moveenterleave".indexOf(inEvent.type) > -1 ) {
      //set the new bounds to have the same t and l, but adjust the w and h
      this.zoomboxCoords = {
        t: this.zoomboxCoords.t,
        l: this.zoomboxCoords.l,
        w: cursor.x - this.zoomboxCoords.l,
        h: cursor.y - this.zoomboxCoords.t
      };
    } else if (inEvent.type === "holdpulse") {
      //create the box's top left corner at the cursor
      this.zoomboxCoords = {t: cursor.y, l: cursor.x, w: 0, h: 0};
    } else {
      this.holdPulseCount = 0;
      document.getElementById(this.id).style.cursor = "auto";
      
      dx = cursor.x - this.zoomboxCoords.l;
      dy = cursor.y - this.zoomboxCoords.t;
      
      //make sure the box is atleast 10px in one dimension
      if (dx > 10 || dy > 10) {
        t = this.zoomboxCoords.t;
        l = this.zoomboxCoords.l;
        w = this.zoomboxCoords.w;
        h = this.zoomboxCoords.h;
        
        //get the min and max coordinates form the box bounds
        xMin = xMax = l;
        if(this.zoomboxCoords.w > 0) {
          xMax += w;
        } else {
          xMin += w;
        }
        yMin = yMax = t;
        if(this.zoomboxCoords.h > 0) {
          yMin += h;
        } else {
          yMax += h;
        }

        start = plotView.invertCoordinates({
          x: xMin,
          y: yMin
        });
        
        end = plotView.invertCoordinates({
          x: xMax,
          y: yMax
        });

        this.doRange(
          {xMin: start.x, xMax: end.x, yMin: start.y, yMax: end.y}
        );
       
        //reset the box
        this.zoomboxCoords = null;
      }
    }
    
    return true;
  },
  handleDrag: function(inSender, inEvent) {
    this.cancelTap = true;
    //make sure there is movement in at least one direction
    if (!inEvent.ddx && !inEvent.ddy) {
      return true;
    }
    
    //dont drag if zooming
    if (this.zoomboxCoords) {
      return true;
    } 
    
    //not a zoom box so we must be panning
    this.doPan(inEvent);
    
    return true;
  },
  handleTap: function(inSender, inEvent) {
    //see if something happened to make us ignore this tap
    if (this.cancelTap) {
      this.cancelTap = false;
      return false;
    }
    
    if (this.zoomboxCoords) {
      this.zoomByBox(inSender, inEvent);
      return false;
    }
  
    if (this.showCrosshairs && inSender.name == "dataRegion") {
      
      this.markPlot(inSender, inEvent);
      this.$.dataRegion.doubleTapEnabled =
        !((this.trendlineCoods && (this.trendlineCoords.mark1 && !this.trendlineCoords.mark2)) || this.zoomboxCoords);
    }
  
    //let the tap fall through to the underlying plot
    return false;
  },
  handleDoubleTap: function(inSender, inEvent) {
    if (inSender.name === "dataRegion") {
      this.doSetAutorange(inEvent);
    } else {
      this.doSetAxisRange(inSender.name === "bottomRegion" ? "x" : "y");
    }
  },
  handlePulse: function(inSender, inEvent) {
    this.cancelTap = true;
    
    if (this.holdPulseCount == 1) {
      //we already had one pulse, this is the second
      this.zoomboxCoords = true;
      document.getElementById(this.id).style.cursor = "crosshair";
      this.zoomByBox(inSender, inEvent);
    }
    
    this.holdPulseCount++;
  }
});

enyo.kind({
  name: 'Overlay.Trendline',
  kind: 'enyo.canvas.Shape',
  published: {
		bounds: null,
    labelText: "",
    labelFont: '10pt "Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace',
    labelColor: "black",
    lineWidth: 1,
    lineColor: "balck"
	},
  constructor: function() {
    this.inherited(arguments);
    this.bounds = {
      width: 0, height: 0, //size of plot
      x1: 0, y1: 0,
      x2: 0, y2: 0
    };
  },
  equation: function () {
    var
      bounds = this.bounds || {},
      x1 = bounds.x1,
      x2 = bounds.x2,
      y1 = bounds.y1,
      y2 = bounds.y2,
      m, b;
      
      m = (x1 == x2) ? NaN : (y2 - y1) / (x2 - x1);
      b = y1 - (x1 * m);
      
      return {
        slope: m,
        yIntercept: b
      };
  },
  createLabel: {
    method: (function(coords) {
      return (
        "Δy: " + (coords.y2 - coords.y1).toPrecision(5) + ", " +
        "Δx: " + (coords.x2 - coords.x1).toPrecision(5)
      );
    }),
    context: this
  },
  renderSelf: function (ctx) {

    //cache some values
    var
      bounds = this.bounds || {},
      x1 = bounds.x1,
      y1 = bounds.y1,
      x2 = bounds.x2,
      y2 = bounds.y2,
      width = bounds.width,
      lineWidth = this.lineWidth,
      capWidth = lineWidth << 1,
      equation = this.equation() || {},
      slope = equation.slope,
      yIntercept = equation.yIntercept,
      textOffset;
    
    ctx.save();
		ctx.beginPath();
		ctx.strokeStyle = this.lineColor;
		ctx.lineWidth = lineWidth;
    
    //draw the endpoints
    ctx.moveTo(x1, y1); 
    ctx.arc(x1, y1, capWidth, 0, Math.PI * 2);
    ctx.moveTo(x2, y2);
    ctx.arc(x2, y2, capWidth, 0, Math.PI * 2);
    
    //draw the line binding the two points
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
    
    //draw the projection line
    if ((slope || slope !== 0) && (yIntercept || yIntercept !== 0) ) {
      ctx.moveTo(0, yIntercept);
		  ctx.lineTo(width, (slope * width) + yIntercept);
    }
    
		ctx.stroke();
    ctx.textAlign = "start";
    if (slope < 0) {
      textOffset = 10;
    } else {
      textOffset = -10;
    } 
    
    ctx.fillStyle = this.labelColor;
    ctx.font = this.labelFont;
	  ctx.fillText(
      this.createLabel.method.call(
        this.createLabel.context, {x1: x1, x2: x2, y1: y1, y2: y2}
      ),
      ((x2 - x1)>>1) + x1 + textOffset,
      ((y2 - y1)>>1) + y1 + textOffset
    );
  
  	ctx.restore();
	}
});

/* global enyo */
/* global btapsData */

enyo.kind({
  name: 'Overlay.Crosshairs',
  kind: 'enyo.canvas.Shape',
  published: {
		bounds: null,
    labelText: "",
    labelFont:'10pt "Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace',
    labelColor: "black",
    lineWidth: 1,
    lineColor: "balck"
	},
  constructor: function() {
    this.inherited(arguments);
    this.bounds = {
      w: 0, h: 0, //width and height of the cross
      x: 0, y: 0 //location of intersection
    };
  },
  observers: [
    {method: "renderSelf", path: ["labelText"]}
  ],
  componenets: [
    {kind: "enyo.canvas.Line", name: "v"},
    {kind: "enyo.canvas.Line", name: "h"},
    {kind: "enyo.canvas.Text", name: "label"}
  ],
	renderSelf: function (ctx) {
    //cache some values
    var
      bounds = this.bounds || {},
      width = bounds.w,
      height = bounds.h,
      x = (bounds.x >> 0) + 0.5,
      y = (bounds.y >> 0) + 0.5,
      text = this.labelText;
      
		ctx.save();
		ctx.beginPath();
		ctx.strokeStyle = this.lineColor;
		ctx.lineWidth = this.lineWidth;
    
    //draw the horizontal bar
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);

    //draw the vertical bar
		ctx.moveTo(x, 0);
		ctx.lineTo(x, height);
    
		ctx.stroke();
    
    //make sure label wont say "null" or "undefined" or some garbage like that
    if (text || text === 0) {
      ctx.fillStyle = this.labelColor;
      ctx.font = this.labelFont;
  	  ctx.fillText(text, x + 10, y - 10);
    }
    
		ctx.restore();
	}
});