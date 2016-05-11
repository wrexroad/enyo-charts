enyo.kind({
  name: "Ticks",
  kind: "Component",
  published: {
    min: null,
    max: null,
    range: null,
    type: "",
    ticks: null,
    tickCount: 10,
    minorTickCount: 5
  },
  constructor: function() {
    this.inherited(arguments);
    
    //make sure log10 is defined
    Math.log10 = Math.log10 || function(x) {
      return Math.log(x) / Math.LN10;
    };
    
    //create a place to store generated ticks
    this.ticks = [];
  },
  
  observers: [
    {path: ["tickCount", "minorTickCount"], method:"generateTicks"}
  ],
  
  setRange: function(min, max) {
    if(min == this.min && max == this.max) {
      //nothing has changed, dont regenerate
      return;
    }
    
    this.set("min", min);
    this.set("max", max);
    this.range = this.max - this.min;
    
    if (this.range) {
      this.generateTicks();
    }
  },
  
  //make sure min and max are set as Numbers
  minChanged: function() {
    this.min = +this.min;
  },
  maxChanged: function() {
    this.max = +this.max;
  },
  
  labelWidth: function() {
    return Math.max(
        Math.log10(Math.abs(this.min)) || 0,
        Math.log10(Math.abs(this.max)) || 0
      ) + 1;
  },
  
  generateTicks: function() {
    var step, roundMin, roundMax, tickVal, fractionalDigits, minor_i, minorVal;
    this.ticks = [];
    step = this.calculateStepSize();
    
    //round the min and max values to the selected step size
    roundMin = Math.floor(this.min / step.size) * step.size;
    roundMax = Math.ceil(this.max / step.size) * step.size;
   
    //make sure round min and max are different
    if (roundMin == roundMax) {
      roundMax++;
    } 
   
    //if the step size is less than 1,
    //we need to get the number of fractional digits we should preserve
    fractionalDigits = step.size < 1 ? Math.ceil(-(Math.log10(step.size))) : 0;
    for (tickVal = roundMin; tickVal <= roundMax; tickVal += step.size) {
      //truncate any unneeded digits to reduce floating point errors
      tickVal = +(tickVal.toFixed(fractionalDigits));
      
      //only add the tick if it is in range
      if (tickVal >= this.min && tickVal <= this.max) {
        this.ticks.push({
          label: this.createLabel(tickVal),
          value: tickVal
        });
      }
      
      //draw add 5 minor ticks between here and the next major tick
      if (this.minorTickCount) {
        for (minor_i = 1; minor_i < this.minorTickCount; minor_i++) {
          minorVal = tickVal + (minor_i * step.size / this.minorTickCount);
          if (minorVal >= this.min && minorVal <= this.max) {
           this.ticks.push({
              value: minorVal,
              minor: true
            });
          }
        }
      }
    }
  },
  createLabel: function(val, opts) {return (+val).toFixed(5)},
  parseLabel: function(val, opts) {return (+val)},
  calculateStepSize: function() {}
});

enyo.kind({
  name: "LinearTicks",
  kind: "Ticks",
  published: {
    niceSteps: null,
    magnitude: NaN,
    multiplier: NaN
  },
  constructor: function (opts) {
    this.inherited(arguments);
    //If no step intervals are set, defalt to stepping by 1, 2, and 5
    this.niceSteps = opts.niceSteps || [1, 2, 5];
  },
  
  calculateStepSize: function() {
    var
      bestStep = {
        size: NaN,
        error: Number.POSITIVE_INFINITY
      },
      rawInterval, magnitude, multiplier;
    
    function testStep(stepVal) {
      //scale the step value by the range magnitude 
      stepVal *= multiplier;
      var stepError = Math.abs(this.tickCount - (this.range / stepVal));

      if (stepError < bestStep.error) {
        bestStep.size = stepVal;
        bestStep.error = stepError;
        this.stepMultiplier = multiplier;
        this.stepMagnitude = magnitude;
      }
    }
    
    //make sure the niceSteps options are in an array
    this.niceSteps = [].concat(this.niceSteps);
    
    //get the range's approximate magnitude
    //and a multiplier to scale niceSteps to that range
    rawInterval = this.range / this.tickCount;
    magnitude = Math.log10(rawInterval) >> 0;
    multiplier = Math.pow(10, magnitude);

    //test each of the nice steps for this magnitude looking for the one
    //that creates an interval closest to the rawInterval value
    this.niceSteps.forEach(testStep, this);
    
    //we may have good luck with the previous and next order of magnitudes
    // so try them too
    magnitude--;
    multiplier /= 10;
    this.niceSteps.forEach(testStep, this);
    
    magnitude += 2;
    multiplier *= 100;
    this.niceSteps.forEach(testStep, this);
    
    //correct the multiplier if the rounding digit is fractional
    multiplier = this.stepMagnitude < 0 ?
      this.stepMultiplier * 10 : this.stepMultiplier;
      
    return bestStep;
  },
  
  createLabel: function(value, opts) {
    return (+value).toFixed(this.stepMagnitude < 0 ? (-this.stepMagnitude) : 0);
  }
});

enyo.kind({
  name: "DateTicks",
  kind: "Ticks",
  published: {
    timeZone: 0,
    timeStandard: "jsTime",
    dateFormat: "",
    shortDateFormat: ""
  },
  components: [
    {kind: "FormattedDate", name: "date"}
  ],
  bindings: [
    {from: "timeZone", to: "$.date.timeZone"},
    {from: "dateFormat", to: "$.date.format"}
  ],
  observers: [
    {path: "dateFormat", method: "generateTicks"}
  ],
  labelWidth: function() {
    return this.$.date.getConvertedStringLength();
  },
  
  stepSizes: {
    decade: 3.1536e+11,
    year: 3.1536e+10,
    halfyear: 1.5768e+10,
    season: 7.884e+9,
    month: 2.4192e+9,
    fortnight: 1.2096e+9,
    week: 6.048e+8,
    threeday: 2.592e+8,
    fullday: 8.64e+7,
    halfday: 4.32e+7,
    quartday: 2.16e+7,
    fullhour: 3.6e+6,
    halfhour: 1.8e+6,
    quarthour: 9.0e+5,
    fullMin: 60000,
    halfMin: 30000,
    quartMin: 15000,
    fullsec: 1000,
    halfsec: 500,
    quartsec: 250,
    millisec: 1
  },
  calculateStepSize: function() {
    var
      bestStep = {
        name : "",
        size: NaN,
        error: Number.POSITIVE_INFINITY
      },
      stepName, countError;
    
    //calculate the number of tick marks we will get with each step size
    for (stepName in this.stepSizes) {
      countError =
        Math.abs((this.range / this.stepSizes[stepName]) - this.tickCount);
      
      if (countError < bestStep.error) {
        bestStep.name = stepName;
        bestStep.size = this.stepSizes[stepName];
        bestStep.error = countError;
      }
    }
    return bestStep;
  },
  
  createLabel: function(value, opts) {
    var dateObj = this.$.date;
    
    if ((opts || {}).short) {
      dateObj.set("format", this.shortDateFormat || this.dateFormat); 
    }
    
    dateObj.set(this.timeStandard, value);

    dateObj.set("format", this.dateFormat);
    
    return dateObj.formattedText;
  },
  parseLabel: function(value, opts) {
    var timeScale = this.timeStandard == "unixTime" ? 1000 : 1;
    return this.$.date.stringToDateStamp(value) / timeScale;
  }
});

enyo.kind({
  name: "LocalDateTicks",
  kind: "DateTicks",
  constructor: function(opts) {
    this.timeZone = opts.timeZone || (-(new Date()).getTimezoneOffset() / 60);
    this.inherited(arguments);
  }
});

enyo.kind({
  name: "DiscreteTicks",
  kind: "Ticks",
  published: {
    minorTickCount: 0,
    stops: null
  },
  constructor: function(opts) {
    this.inherited(arguments);
    this.setStops(opts.stops);
  },
  setStops: function(newStops) {
    this.stops = [].concat(newStops || []);
    this.set("tickCount", this.stops.length);
  },
  labelWidth: function() {
    var maxWidth = 0;
    this.stops.forEach(function(stop_i) {
      var stopLabelLength = (stop_i.label || "").length;
      maxWidth = stopLabelLength > maxWidth ? stopLabelLength : maxWidth;
    }, this);
    return maxWidth;
  },
  generateTicks: function() {
    this.ticks = [];
    this.stops.forEach(function(stop_i) {
      if (this.min <= stop_i.value && this.max >= stop_i.value) {
       this.ticks.push({
         label: stop_i.label,
         value: stop_i.value,
         color: stop_i.color
       }); 
      }
    }, this);
  }
});