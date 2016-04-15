/* global enyo */
enyo.kind({
  name: "CartesianOverlay",
  published: {
    bounds: null,
    plotView: null,
    plotMargins: null,
    avtiveRegion: null,
    crosshairs: false,
    crosshairsActive: false,
    zoombox: false,
    chartHeight: 0,
    chartWidth: 0,
    offset: 0,
    mark1: 0,
    mark2: 0
  },
  observers: {
    resize: ["plotMargins"]
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

    //start the crosshair animation
    this.updateCrosshairs();
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
    region = this.createRegion(bounds.dataRegion, "dataRegion");
    region.onmove = "cursorMoved";
    region.onenter = "activateCrosshairs";
    region.onleave = "deactivateCrosshairs";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";
    region.onmousewheel = "zoomByWheel";
    region.ondragfinish = "handleDrag";
    region.ondrag = "handleDrag";
    region.onholdpulse = "handlePulse";
    region.onrelease = "handleRelease";
    region.render();
    
    //create crosshairs
    region.createComponent(
      {kind: "btaps.Crosshairs", name: "crosshairs"}
    );
    region.$.crosshairs.labelColor = "green";
    region.$.crosshairs.lineColor = "#330000"; 
    
    //create a zoom box canvas element in dataRegion
    region.createComponent({
      kind: "enyo.canvas.Rectangle", name: "zb",
      outlineColor: "#330000", color: "", bounds: {}
    });
    
    //create trendline stuff
    region.createComponent(
      {
        kind: "btaps.Trendline", name: "trendline",
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
    
    //create zoom margins
    region = this.createRegion(bounds.leftRegion, "leftRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";
    region.render();
    
    region = this.createRegion(bounds.leftRegion, "rightRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";
    region.render();

    region = this.createRegion(bounds.bottomRegion, "bottomRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    region.ondoubletap = "handleDoubleTap";
    region.render();
    
    //update the trendline
    this.needsUpdate = true;

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
        "top:" + bounds.top + "px;"
    });

    return region;
  },
  destroyRegions: function() {
    //either get the overlay or an empty but destroyable object
    (this.$.dataRegion || {destroy: function(){}}).destroy();
    (this.$.leftRegion || {destroy: function(){}}).destroy();
    (this.$.rightRegion || {destroy: function(){}}).destroy();
    (this.$.bottomRegion || {destroy: function(){}}).destroy();
    this.crosshairsActive = false;
    return true;
  },
  calculateBounds: function() {
    var
      plotView = this.plotView || {},
      margins = plotView.plotMargins || null,
      chartHeight = this.chartHeight,
      chartWidth = this.chartWidth,
      bounds;
      
    if(margins === null) {
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
  crosshairsChanged: function(inSender, inEvent) {
    if (!this.crosshairs && this.crosshairsActive) {
      this.deactivateCrosshairs();
    }
  },
  activateCrosshairs: function() {
    var dataRegion = this.$.dataRegion;

    if(!this.crosshairs || !dataRegion) {
      return;
    }

    this.crosshairsActive = true;
  },
  deactivateCrosshairs: function(inSender, inEvent) {
    var
      dataRegion = this.$.dataRegion || {},
      shapes = dataRegion.$;
      
    if (!shapes) {
      return true;
    }

    this.crosshairsActive = false;
    
    shapes.crosshairs.bounds = {x: 0, y: 0, w: 0, h: 0};

    //clear the trend line if it hasnt been anchored on both ends
    if (this.mark1 && !this.mark2) {
      this.mark1 = false;
      shapes.trendline.bounds = {x1: 0, y1: 0, x2: 0, y2: 0};
    }
    
    this.cursorX = 0;
    this.cursorY = 0;
    
    this.needsUpdate = true;    
    
    return true;
  },
  getRelativeCoords: function(x, y) {
    var
      owner = this.owner,
      ownerowner = owner.owner,
      ownerNode = owner.node,
      ownerownerNode = ownerowner.node,
      offset = this.offset,
      bounds = this.bounds;

    if (!offset) {
      return null;
    } else {
      return {
          x:
            x -
            bounds.leftRegion.right - offset.left -
            ownerownerNode.offsetLeft - ownerNode.offsetLeft,
          y:
            y - 20 - //20px for the menu button
            bounds.dataRegion.top - offset.top -
            ownerownerNode.offsetTop - ownerNode.offsetTop
      };
    }
  },
  cursorMoved: function(inSender, inEvent) {
    var coords;
    
    if(this.zoombox) {
      this.zoomByBox(inSender, inEvent);
    }
    
    if (this.crosshairs) {
      coords = this.getRelativeCoords(inEvent.pageX, inEvent.pageY);

      if (!coords) {
        return true;
      }

      //make sure the crosshairs are active for this plot
      this.crosshairsActive = true;
      this.cursorX = coords.x;
      this.cursorY = coords.y;
      this.needsUpdate = true;
    }
    return true;
  },
  updateCrosshairs: function(inSender, inEvent) {
    var
      trendlineObj, crosshairObj,
      bounds, left, right, width, top, bottom, height,
      plotView, margins, dataRegion, shapes,
      pointValue, x, y;

    if (this.needsUpdate) {
      x = this.cursorX;
      y = this.cursorY;
      bounds = (this.bounds || {}).dataRegion;
      if (!bounds) {return;}
      
      left   = bounds.left;
      right  = bounds.right;
      width  = bounds.width;
      top    = bounds.top;
      bottom = bounds.bottom;
      height = bounds.height;
      
      plotView = this.plotView;
      margins = this.plotMargins;
      dataRegion = this.$.dataRegion;
      shapes = dataRegion.$;
      crosshairObj = shapes.crosshairs;
      trendlineObj = shapes.trendline;
      pointValue = plotView.invertCoordinates({x: x, y: y});

      if(this.crosshairs) {
        crosshairObj.bounds = {
          w: this.crosshairsActive ? dataRegion.attributes.width : 0,
          h: dataRegion.attributes.height,
          x: x,
          y: y
        };
        crosshairObj.labelText =
          this.crosshairsActive ? 
          ("y: " + (+pointValue.y || 0).toPrecision(5) + ", " +
          "t: " + pointValue.x) : "";
      }

      if (this.mark1 && !this.mark2) {
        trendlineObj.bounds.x2 = x;
        trendlineObj.bounds.y2 = y;
      }
    
      dataRegion.update();
      this.needsUpdate = false;
    }

    window.requestAnimationFrame(this.updateCrosshairs.bind(this));
  },
  updateTrendline: function() {
    var
      dataRegion = this.$.dataRegion,
      coords;
    
    if (typeof this.mark1 == "object") {
      coords = this.plotView.invertValue(this.mark1);
      dataRegion.$.trendline.bounds.x1 = coords.x;
      dataRegion.$.trendline.bounds.y1 = coords.y;
    }
    if (typeof this.mark2 == "object") {
      coords = this.plotView.invertValue(this.mark2);
      dataRegion.$.trendline.bounds.x2 = coords.x;
      dataRegion.$.trendline.bounds.y2 = coords.y;
    }
    this.needsUpdate = true;
  },
  markPlot: function(inSender, inEvent) {
    var
      dataRegion = this.$.dataRegion,
      trendlineBounds = dataRegion.$.trendline.bounds,
      coords, pointValue;

    //clear the trend line if it is already fully set
    if (this.mark1 && this.mark2) {
      this.mark1 = false;
      this.mark2 = false;
      trendlineBounds.x1 = 0;
      trendlineBounds.y1 = 0;
      trendlineBounds.x2 = 0;
      trendlineBounds.y2 = 0;
    } else {
      //calulate the coordinates and value of this point
      coords = this.getRelativeCoords(inEvent.pageX, inEvent.pageY);

      if (!coords) {
        return false;
      }

      pointValue = 
        this.plotView.invertCoordinates({x: coords.x,  y: coords.y});
      if (!this.mark1) {
        //neither mark is net. Start the trend line
        this.mark1 = pointValue;
        trendlineBounds.x1 = coords.x;
        trendlineBounds.y1 = coords.y;
        //trendline.bounds = trendlineBounds;
      } else {
        //set the second mark to end the trendline
        this.mark2 = pointValue;
        trendlineBounds.x2 = coords.x;
        trendlineBounds.y2 = coords.y;
        //trendline.bounds = trendlineBounds;
      }
    }

    //fire the mousemove event to redraw the crosshair and trendline
    this.needsUpdate = true;

    return true;
  },
  zoomByWheel: function(inSender, inEvent){
    var
      zoomRegion = inSender.name,
      cursorValue = this.plotView.invertCoordinates(
        this.getRelativeCoords(inEvent.pageX, inEvent.pageY)
      );

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
      relativeCoords = this.getRelativeCoords(inEvent.pageX, inEvent.pageY),
      scaleX = 1,
      scaleY = 1;
    
    if (!relativeCoords) {
      return;
    }

    if (zoomRegion === "leftRegion" && inEvent.ddy) {
      scaleY +=
        //direction and magnitude of scale factor
        ((relativeCoords.y - inEvent.dy) > (height >> 1) ? -2 : 2) *
        //proportion of axis scale factor 
        (inEvent.ddy / height);
      
    } else if (zoomRegion === "bottomRegion" && inEvent.ddx) {
      scaleX +=
        ((relativeCoords.x - inEvent.dx) > (width >> 1) ? -2 : 2) *
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
      dataRegion = this.$.dataRegion,
      box = dataRegion.$.zb,
      coords = this.getRelativeCoords(inEvent.pageX, inEvent.pageY),
      plotView = this.plotView,
      bounds = box.bounds,
      start, end, xMin, xMax, yMin, yMax, t, l, w, h, dx, dy;

    if (!coords) {
      return true;
    }

    if (inEvent.type === "move") {
      //set the new bounds to have the same t and l, but adjust the w and h
      box.bounds = {
        t: bounds.t,
        l: bounds.l,
        w: coords.x - bounds.l,
        h: coords.y - bounds.t
      };
    } else if (inEvent.type === "holdpulse") {
      //create the box's top left corner at the cursor
      box.bounds = {t: coords.y, l: coords.x, w: 0, h: 0};
    } else {
      this.zoombox = false;
      this.holdPulseCount = 0;
      document.getElementById(this.id).style.cursor = "auto";
      
      dx = coords.x - bounds.l;
      dy = coords.y - bounds.t;
      
      //reset the box
      box.bounds = {t: 0, l: 0, w: 0, h: 0};

      //make sure the box is atleast 10px in one dimension
      if (dx > 10 || dy > 10) {
        t = bounds.t;
        l = bounds.l;
        w = bounds.w;
        h = bounds.h;
        
        //get the min and max coordinates form the box bounds
        xMin = xMax = l;
        if(bounds.w > 0) {
          xMax += w;
        } else {
          xMin += w;
        }
        yMin = yMax = t;
        if(bounds.h > 0) {
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
      }
    }

    dataRegion.update();

    return true;
  },
  handleDrag: function(inSender, inEvent) {
    this.cancelTap = true;
    //make sure there is movement in at least one direction
    if (!inEvent.ddx && !inEvent.ddy) {
      return true;
    }
    
    //dont drag if zooming
    if (this.zoombox) {
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
    
    if (this.zoombox) {
      this.zoomByBox(inSender, inEvent);
      return false;
    }
  
    if (this.crosshairs && inSender.name == "dataRegion") {
      
      this.markPlot(inSender, inEvent);
      this.$.dataRegion.doubleTapEnabled = !(this.mark1 && !this.mark2);
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
      this.zoombox = true;
      document.getElementById(this.id).style.cursor = "crosshair";
      this.zoomByBox(inSender, inEvent);
    }
    
    this.holdPulseCount++;
  }
});