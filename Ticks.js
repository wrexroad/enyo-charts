enyo.kind({
  name: "Ticks",
  kind: "Component",
  published: {
    min: null,
    max: null,
    range: null,
    type: "",
    ticks: null,
    count: 10,
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
    {path: "count", method:"generateTicks"}
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
    return 
      Math.max(
        Math.abs(Math.log10(this.min)) || 0,
        Math.abs(Math.log10(this.max)) || 0
      ) + 1;
  },
  
  generateTicks: function() {
    var step, roundMin, roundMax, tickVal, fractionalDigits, minor_i, minorVal;
    this.ticks = [];
    step = this.calculateStepSize();
    
    //round the min and max values to the selected step size
    roundMin = ((this.min / step.size) >> 0) * step.size;
    roundMax = (Math.ceil(this.max / step.size)) * (step.size);
   
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
        for (minor_i = 0; minor_i < this.minorTickCount; minor_i++) {
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
        value: NaN,
        error: Number.POSITIVE_INFINITY
      },
      rawInterval, magnitude, multiplier;
    
    function testStep(stepVal) {
      //scale the step value by the range magnitude 
      stepVal *= multiplier;
      var stepError = Math.abs(this.count - (this.range / stepVal));

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
    rawInterval = this.range / this.count;
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
  
  createLabel: function(value) {
    return (+value).toFixed(this.stepMagnitude < 0 ? (-this.stepMagnitude) : 0);
  }
});

enyo.kind({
  name: "DateTicks",
  kind: "Ticks",
  published: {
    timeZone: 0,
    dateFormat: ""
  },
  components: [
    {kind: "FormattedDate", name: "fDate"}
  ],
  bindings: [
    {from: "timeZone", to: "$.fDate.timeZone"},
    {from: "dateFormat", to: "$.fDate.format"}
  ],
  labelWidth: function() {
    return this.dateFormat.length;
  },
  
  stepSizes: {
    fullday: 86400000,
    halfday: 43200000,
    quartday: 21600000,
    fullhour: 3600000,
    halfhour: 1800000,
    quarthour: 900000,
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
      countError = Math.abs(this.range / this.stepSizes[stepName] - this.count);
      
      if (countError < bestStep.error) {
        bestStep.name = stepName;
        bestStep.size = this.stepSizes[stepName];
        bestStep.error = countError;
      }
    }
    
    return bestStep;
  },
  
  createLabel: function(value) {
    this.$.fDate.set("jsTime", value);
    return this.$.fDate.formattedText;
  }
});