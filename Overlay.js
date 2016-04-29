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
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0
  },
  components: [{
    name: "axisSettings", kind: "enyo.Popup",
    modal: true, centered: true, classes: "popup",
    components: [
      {tag: "label", components: [
        {content: "X-Axis:"},
        {
          name: "xMinInput", kind: "enyo.Input", type: "text",
          classes: "enyo-selectable"
        },
        {
          name: "xMaxInput", kind: "enyo.Input", type: "text",
          classes: "enyo-selectable"
        }
      ]},
      {tag: "label", components: [
        {content: "Y-Axis:"},
        {
          name: "yMinInput", kind: "enyo.Input", type: "text",
          classes: "enyo-selectable"
        },
        {
          name: "yMaxInput", kind: "enyo.Input", type: "text",
          classes: "enyo-selectable"
        }
      ]},
      {components:[
        {kind: "enyo.Button", content: "Set", ontap: "closeAxisSettings"}
      ]}
    ]
  }],
  observers: {
    resize: [
      "chartWidth", "chartHeight",
      "marginTop", "marginBottom", "marginLeft", "marginRight"
    ]
  },
  events: {
    onNewRange: ""
  },
  rendered: function() {
    this.inherited(arguments);
    this.holdPulseCount = 0;
    this.cancelTap = false;

    //get the associated plotView
    this.plotView = this.owner;

    this.resize();
    this.refresh();
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
    region.onmousewheel = "zoomByWheel";
    region.ondragfinish = "handleDrag";
    region.ondrag = "handleDrag";
    region.onholdpulse = "handlePulse";
    region.onrelease = "handleRelease";

    //create zoom margins
    region = this.createRegion(bounds.leftRegion, "leftRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    
    region = this.createRegion(bounds.rightRegion, "rightRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";

    region = this.createRegion(bounds.bottomRegion, "bottomRegion");
    region.ondrag = "zoomByAxis";
    region.onmousewheel = "zoomByWheel";
    region.ontap = "handleTap";
    
    return true;
  },
  createRegion: function(bounds, name) {
    var region;

    if (this.$[name]) {return;}

    //create a canvas that we can use to draw over the plot
    region = this.createComponent({
      kind: "enyo.Canvas", name: name,
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
      chartHeight = this.chartHeight,
      chartWidth = this.chartWidth,
      marginTop = this.marginTop,
      marginBottom = this.marginBottom,
      marginLeft = this.marginLeft,
      marginRight = this.marginRight,
      bounds;
    if (!isFinite(marginTop + marginBottom + marginLeft + marginRight)) {
      return null;
    }
    
    bounds = {
      leftRegion: {
        left: 0,
        right: marginLeft,
        top: marginTop,
        bottom: chartHeight - marginBottom,
        width: marginLeft,
        height: chartHeight - marginTop - marginBottom
      },
      rightRegion: {
        left: chartWidth - marginRight,
        right: chartWidth,
        top: marginTop,
        bottom: chartHeight - marginBottom,
        width: marginRight,
        height: chartHeight - marginTop - marginBottom
      },
      bottomRegion: {
        left: marginLeft,
        right: chartWidth - marginRight,
        top: chartHeight - marginBottom,
        bottom: chartHeight,
        width: chartWidth - marginLeft - marginRight,
        height: marginBottom
      },
      dataRegion: {
        left: marginLeft,
        right: chartWidth - marginRight,
        top: marginTop,
        bottom: chartHeight - marginBottom,
        width: chartWidth - marginLeft - marginRight,
        height: chartHeight - marginTop - marginBottom
      }
    };

    this.set("bounds", bounds);

    return bounds;
  },
  refresh: function() {
    var
      cursor = this.cursor,
      pointValue = this.plotView.invertCoordinates(cursor) || {x: NaN, y: NaN},
      dataRegionBounds = this.bounds.dataRegion,
      trendline = this.trendlineCoords,
      plotView = this.plotView,
      mark1Coords, mark2Coords, mark1Value, mark2Value,
      m, b, dx, dy, label, textOffset, ctx, zoom;

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
      
      //draw crosshair label
      //make sure label wont say "null" or "undefined" or some garbage like that
      ctx.fillStyle = this.crosshairsColor;
      ctx.font = plotView.fontSize + "px " + plotView.font;
      ctx.fillText(
        "x: " + plotView.$.xTicks.createLabel(pointValue.x) + ",",
        cursor.x + 10, cursor.y - (2 * plotView.fontSize)
      );
      ctx.fillText(
        "y: " + plotView.$.yLeftTicks.createLabel(pointValue.y),
        cursor.x + 10, cursor.y - plotView.fontSize
      );
      
      ctx.restore();
    }
    
    //draw the trendline if any points are set
    if (trendline) {
      ctx.save();
      
      //since the trendlineCoordinates object exists,
      //we know we at least have 1 point set
      mark1Coords = plotView.invertValue(trendline.mark1);
      mark1Value = trendline.mark1;
      
      //if there isnt a second point set, use the current cursor coordinates
      mark2Coords = plotView.invertValue(trendline.mark2) || cursor;
      mark2Value = trendline.mark2 || plotView.invertCoordinates(cursor);
      
      //calculat the line that connects the two points
      m = (mark2Coords.y - mark1Coords.y) / (mark2Coords.x - mark1Coords.x);
      b = mark1Coords.y - (mark1Coords.x * m);
      
      //draw the connecting line
      ctx.strokeStyle = ctx.fillStyle = this.trendlineColor;
      ctx.beginPath();
      ctx.moveTo(0, b);
      ctx.lineTo(dataRegionBounds.width, dataRegionBounds.width * m + b);
      ctx.stroke();
      
      //make a dot at eaech point
      ctx.beginPath();
      ctx.arc(mark1Coords.x, mark1Coords.y, ctx.lineWidth << 1, 0, Math.PI * 2);
      ctx.arc(mark2Coords.x, mark2Coords.y, ctx.lineWidth << 1, 0, Math.PI * 2);
      ctx.fill();
      
      //draw the trendline label
      ctx.textAlign = "start";
      ctx.font = plotView.fontSize + "px " + plotView.font;
      dx = mark2Value.x - mark1Value.x;
      dy = mark2Value.y - mark1Value.y;
      
      label =
        "Δy: " + plotView.$.yLeftTicks.createLabel(dy, {short: true}) + ", " +
        "Δx: " + plotView.$.xTicks.createLabel(dx, {short: true});
      
      textOffset = m < 0 ? 10 : -10;
      
      ctx.fillText(
        label,
        ((mark2Coords.x - mark1Coords.x) >> 1) + mark1Coords.x + textOffset,
        ((mark2Coords.y - mark1Coords.y) >> 1) + mark1Coords.y + textOffset
      );
      
      ctx.restore();
    }
    
    //do it again!
    window.requestAnimationFrame(this.refresh.bind(this));
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
    
    this.cursor = this.getRelativeCoords(inEvent);
    if (this.zoomboxCoords) {
      this.zoomByBox(inSender, inEvent);
    }
    
    return true;
  },
  getRelativeCoords: function(inEvent) {
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
    
    return {x: x, y: y};
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
        mark1: this.plotView.invertCoordinates(this.cursor)
      };
    } else if (this.trendlineCoords.mark1 && !this.trendlineCoords.mark2) {
      //save the second point of the trendline
      this.trendlineCoords.mark2 = this.plotView.invertCoordinates(this.cursor);
    } else {
      //both points were previously set, clear them
      this.trendlineCoords = null;
    }
    
    return true;
  },
  zoomByWheel: function(inSender, inEvent){
    var
      zoomRegion = inSender.name,
      cursorValue = this.plotView.invertCoordinates(
        this.getRelativeCoords(inEvent)
      );
    
    //scroll wheel should not actually scroll the page
    inEvent.preventDefault();

    if (!cursorValue) {
      return true;
    }

    this.rangeFromZoom({
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
      coords = this.getRelativeCoords(inEvent),
      scaleX = 1,
      scaleY = 1;
    
    if (!coords) {
      return;
    }

    if (zoomRegion === "leftRegion" && inEvent.ddy) {
      scaleY +=
        //direction and magnitude of scale factor
        ((coords.y - inEvent.dy) > (height >> 1) ? -2 : 2) *
        //proportion of axis scale factor 
        (inEvent.ddy / height);
      
    } else if (zoomRegion === "bottomRegion" && inEvent.ddx) {
      scaleX +=
        ((coords.x - inEvent.dx) > (width >> 1) ? -2 : 2) *
        ( inEvent.ddx / width);
    }
    
    //make sure we aren't just scaling eveything by 1
    if (scaleX != 1 || scaleY != 1) {
      this.rangeFromZoom({
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

        this.doNewRange(
          {xMin: start.x, xMax: end.x, yMin: start.y, yMax: end.y}
        );
       
        //reset the box
        this.zoomboxCoords = null;
      }
    }
    
    return true;
  },
  handleDrag: function(inSender, inEvent) {
    var trendline, mark1, mark2;
    
    this.cancelTap = true;
    
    //update the cursor position
    this.cursorMoved(inSender, inEvent);
    
    //make sure there is movement in at least one direction
    if (!(inEvent.ddx + inEvent.ddy)) {
      return true;
    }
    
    //dont drag if zooming
    if (this.zoomboxCoords) {
      return true;
    } 
    
    //not a zoom box so we must be panning
    this.rangeFromPan(inEvent);
    
    return true;
  },
  rangeFromZoom: function(zoom) {
    var
      range = {},
      scaleX = zoom.scaleX,
      scaleY = zoom.scaleY,
      plotView = this.plotView,
      center, min, max;

    //y axis value (not pixel coordinate) of the cursor
    if (scaleY != 1) {
      center = zoom.centerValue.y;
      min = (center - ((center - plotView.yMin) * scaleY)) || 0;
      max = (center + ((plotView.yMax - center) * scaleY)) || 0;
    
      range.yMin = min;
      range.yMax = max;
    }

    if (scaleX != 1) {
      center = zoom.centerValue.x;
      min = center - ((center - plotView.xMin) * scaleX);
      max = center + ((plotView.xMax - center) * scaleX);
      
      if (min != plotView.xMin || max != plotView.xMax) {
        range.xMin = min;
        range.xMax = max;
      }
    }
    
    this.doNewRange(range);
  },
  rangeFromPan: function(pan) {
    var
      range = {},
      xDirection = pan.xDirection,
      yDirection = pan.yDirection,
      ddx = pan.ddx,
      ddy = pan.ddy,
      x = pan.pageX,
      y = pan.pageY,
      plotView = this.plotView,
      start = plotView.invertCoordinates(
        {x: (x - xDirection * ddx),y: (y - yDirection * ddy)}
      ),
      end = plotView.invertCoordinates(
        {x: x, y: y}
      ),
      deltaX, deltaY;

    deltaX = xDirection * (end.x - start.x);
    range.xMin = plotView.xMin - deltaX;
    range.xMax = plotView.xMax - deltaX;

    if (!this.autoranging) {
      deltaY = yDirection * (end.y - start.y);
      range.yMin = plotView.yMin - deltaY;
      range.yMax = plotView.yMax - deltaY;
    }

    this.doNewRange(range);
  },
  handleTap: function(inSender, inEvent) {
    var now = +(new Date());
    
    //see if something happened to make us ignore this tap
    if (this.cancelTap) {
      this.cancelTap = false;
      return false;
    }
    
    //check if this is a double tap
    if ((now - this.dblTapTmr) < 300) {
      this.handleDoubleTap(inSender, inEvent);
      return;
    } else {
      this.dblTapTmr = now;
    }
    
    if (this.zoomboxCoords) {
      this.zoomByBox(inSender, inEvent);
      return false;
    }
  
    if (this.showCrosshairs && inSender.name == "dataRegion") {
      this.markPlot(inSender, inEvent);
    }
  
    return true;
  },
  handleDoubleTap: function(inSender, inEvent) {
    //double tapping should trigger setting autoranging.
    //We should clear out any trendlines or zoomboxes
    this.zoomboxCoords = this.trendlineCoords = null;
    
    if (inSender.name === "dataRegion") {
      //double tapping the data region should trigger y axis autoranging.
      //do this by clearing any previously set y-axis range
      this.doNewRange({yMin: NaN, yMax: NaN});
    } else if (inSender.name === "bottomRegion") {
      this.openAxisSettings("x");
    } else if (inSender.name === "leftRegion") {
      this.openAxisSettings("yLeft");
    } else {
      this.openAxisSettings("yRight");
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
  },
  openAxisSettings: function() {
    var plotView = this.plotView;

    this.$.axisSettings.set("showing", true);
    this.$.xMinInput.set(
      "value", plotView.$.xTicks.createLabel(plotView.xMin)
    );
    this.$.xMaxInput.set(
      "value", plotView.$.xTicks.createLabel(plotView.xMax)
    );
    this.$.yMinInput.set(
      "value", plotView.$.yLeftTicks.createLabel(plotView.yMin)
    );
    this.$.yMaxInput.set(
      "value", plotView.$.yLeftTicks.createLabel(plotView.yMax)
    );
    
  },
  closeAxisSettings: function() {
    var plotView = this.plotView;

    this.doNewRange({
      xMin: plotView.$.xTicks.parseLabel(this.$.xMinInput.value),
      xMax: plotView.$.xTicks.parseLabel(this.$.xMaxInput.value),
      yMin: plotView.$.yLeftTicks.parseLabel(this.$.yMinInput.value),
      yMax: plotView.$.yLeftTicks.parseLabel(this.$.yMaxInput.value)
    });
    
    this.$.axisSettings.set("showing", false);
  }
});