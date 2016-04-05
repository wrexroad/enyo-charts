enyo.kind({
  name: "TicMarks",
  kind: "Component",
  published: {
    min: null,
    max: null,
    range: null,
    ticStep: null,
    fractionDigits: 0,
    roundingDigit: 0,
    type: "",
    tics: null,
    numTics: 10,
    niceSteps: null
  },
  constructor: function(opts) {
    this.inherited(arguments);
    
    //make sure log10 is defined
    Math.log10 = Math.log10 || function(x) {
      return Math.log(x) / Math.LN10;
    }; 
    
    //If no step intervals are set, defalt to stepping by 1, 2, and 5
    this.niceSteps = opts.niceSteps || [1, 2, 5];
    
    //create a place to store generated tics
    this.tics = [];
  },
  
  //make sure min and max are set as Numbers
  minChanged: function() {
    this.min = +this.min;
  },
  maxChanged: function() {
    this.max = +this.max;
  },
  
  generateLinearTics: function() {
    var
      bestStep = {
        value: NaN,
        error: Number.POSITIVE_INFINITY,
        magnitude: NaN,
        multiplier: NaN
      },
      range, rawInterval, magnitude, multiplier, roundMin, roundMax, ticVal;
    
    function testStep(stepVal) {
      //scale the step value by the range magnitude 
      stepVal *= multiplier;
      var stepError = Math.abs(this.numTics - (range / stepVal));

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
    
    //clear old tics and make sure the niceSteps options are in an array
    this.tics = [];
    this.niceSteps = [].concat(this.niceSteps);
    
    //get the range's approximate magnitude
    //and a multiplier to scale niceSteps to that range
    range = this.max - this.min; 
    rawInterval = range / this.numTics;
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
    
    //generate the tic labels and locations
    ticVal = roundMin;
    while (ticVal <= roundMax) {
      this.tics.push({
        location: ticVal,
        label:
          ticVal.toFixed(bestStep.magnitude < 0 ? (-bestStep.magnitude) : 0)
      });
      ticVal += bestStep.value;
    }
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
  }
});