enyo.kind({
  name: "Ticks",
  kind: "Component",
  published: {
    min: null,
    max: null,
    range: null,
    type: "",
    ticks: null,
    count: 10
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
  
  //make sure min and max are set as Numbers
  minChanged: function() {
    this.min = +this.min;
  },
  maxChanged: function() {
    this.max = +this.max;
  },
  
  isValidRange: function() {
    //make sure there is a valid min and max: two numbers that are not equal.
    if (this.min >= this.max) {
      return false;
    } else if (!Number.isFinite(this.min + this.max)) {
      return false;
    }
    
    this.range = this.max - this.min;
    
    return true;
  },
  
  generateTicks: function() {}
});

enyo.kind({
  name: "Ticks.Linear",
  kind: "Ticks",
  published: {
    niceSteps: null
  },
  constructor: function (opts) {
    this.inherited(arguments);
    //If no step intervals are set, defalt to stepping by 1, 2, and 5
    this.niceSteps = opts.niceSteps || [1, 2, 5];
  },
  generateTicks: function() {
    var
      bestStep = {
        value: NaN,
        error: Number.POSITIVE_INFINITY,
        magnitude: NaN,
        multiplier: NaN
      },
      rawInterval, magnitude, multiplier, roundMin, roundMax, tickVal;
    
    function testStep(stepVal) {
      //scale the step value by the range magnitude 
      stepVal *= multiplier;
      var stepError = Math.abs(this.count - (this.range / stepVal));

      if (stepError < bestStep.error) {
        bestStep.value = stepVal;
        bestStep.error = stepError;
        bestStep.multiplier = multiplier;
        bestStep.magnitude = magnitude;
      }
    }
    
    if (!this.isValidRange()) {
      return false;
    }
    
    //clear old ticks and make sure the niceSteps options are in an array
    this.ticks = [];
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
    multiplier = bestStep.magnitude < 0 ?
      bestStep.multiplier * 10 : bestStep.multiplier; 
   
    //round the min and max values to the nice step interval
    roundMin = ((this.min / multiplier) >> 0) * multiplier;
    roundMax = ((this.max / multiplier) >> 0) * multiplier;
    
    //generate the tick labels and locations
    tickVal = roundMin;
    while (tickVal <= roundMax) {
      this.ticks.push({
        location: tickVal,
        label:
          tickVal.toFixed(bestStep.magnitude < 0 ? (-bestStep.magnitude) : 0)
      });
      tickVal += bestStep.value;
    }
  }
});