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
  name: "LinearTicks",
  kind: "Ticks",
  published: {
    niceSteps: null
  },
  constructor: function (opts) {
    this.inherited(arguments);
    //If no step intervals are set, defalt to stepping by 1, 2, and 5
    this.niceSteps = opts.niceSteps || [1, 2, 5];
  },
  labelWidth: function() {
    return 
      Math.max(
        Math.abs(Math.log10(this.min)) || 0,
        Math.abs(Math.log10(this.max)) || 0
      ) + 1;
  },
  generateTicks: function() {
    var
      bestStep = {
        value: NaN,
        error: Number.POSITIVE_INFINITY,
        magnitude: NaN,
        multiplier: NaN
      },
      rawInterval, magnitude, multiplier, roundMin, roundMax,
      tickVal, tickLabel;
    
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
    roundMax = Math.ceil(this.max / multiplier) * multiplier;
    console.log(roundMax);
    //generate the tick labels and locations
    for (tickVal = roundMin; tickVal <= roundMax; tickVal += bestStep.value) {
      //truncate any erroneous digits due to floating point errors
      tickLabel =
        tickVal.toFixed(bestStep.magnitude < 0 ? (-bestStep.magnitude) : 0);
      tickVal = +tickLabel;
      
      this.ticks.push({
        value: tickVal,
        label: tickLabel
      });
      console.log(tickVal)
    }
  }
});

enyo.kind({
  name: "DateTicks",
  kind: "Ticks",
  published: {
    timeZone: 0,
    dateFormat: "%YYYY%-%MM%-%DD% %hh%:%mm%:%ss%.%ms% %AMPM% %T%"
  },
  constructor: function (opts) {
    this.inherited(arguments);
    
    this.formatChanged();
  },
  labelWidth: function() {
    return this.dateFormat.length;
  },
  formatCodes: {
    "ampm" : function(date) {
      return date.getUTCHours() > 12 ? "pm" : "am";
    },
    "AMPM" : function(date) {
      return date.getUTCHours() > 12 ? "PM" : "AM";
    },
    "ms": function(date) {
      return date.getUTCMilliseconds()
    },
    "ss": function(date) {
      var seconds = date.getUTCSeconds();
      return (seconds < 10 ? "0" : "") + seconds;
    },
    "mm": function(date) {
      var min = date.getUTCMinutes();
      return (min < 10 ? "0" : "") + min;
    },
    "HH": function(date) {
      var hours = date.getUTCHours();
      return (hours < 10 ? "0" : "") + hours;
    },
    "hh": function(date) {
      var hours = date.getUTCHours();
      hours -= (hours > 12 ? 12 : 0);
      return (hours < 10 ? "0" : "") + hours;
    },
    "DD": function(date) {
      var dom = date.getUTCDate();
      return (dom < 10 ? "0" : "") + dom;
    },
    "DOW": function(date) {
      return date.getUTCDay();
    },
    "DOY": function(date) {
      var ms, day, zeros;
      
      //find out how many milliseconds have elapsed since the start of the year
      ms = date - (+(new Date(date.getUTCFullYear(), 0, 0)));
  
      //convert ms to full days that have elapsed
      day = (ms / 86400000) >> 0;
  
      //get zeros for paddings
      zeros = day < 10 ? "00" : day < 100 ? "0" : "";
  
      return zeros + day;
    },
    "MM": function(date) {
      var month = date.getUTCMonth() + 1;
      return (month < 10 ? "0" : "") + month;
    },
    "YYYY": function(date) {
      return date.getUTCFullYear();
    },
    "YY": function(date) {
      return date.getUTCFullYear() % 2000;
    },
    "T": function() {
      return "GMT" + (this.timeZone < 0 ? "" : "+") + this.timeZone;
    } 
  },
  formatChanged: function() {
    //make sure format is a string because we are about
    //to do some really stringy stuff to it
    var format = ((this.dateFormat || "") + "");
    
    //split up the format string
    this._format = format.split("%");
  },
  
  dateToString: function(date) {
    var convertedDate = [];
    
    //adjust the date based on the time zone
    date.setUTCHours(date.getUTCHours() + this.timeZone);
    
    //convert any format codes to the date value
    this._format.forEach(function(fmtCode) {
      convertedDate.push(this.formatCodes[fmtCode] ?
        this.formatCodes[fmtCode].call(this, date) : fmtCode
      );
    }, this);
    
    return convertedDate.join("");
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
  generateTicks: function() {
    var
      bestStep = {
        name : "",
        size: NaN,
        error: Number.POSITIVE_INFINITY
      },
      stepName, countError, roundMin, roundMax, tickVal;
    
    if (!this.isValidRange()) {
      return false;
    }
    
    //calculate the number of tick marks we will get with each step size
    for (stepName in this.stepSizes) {
      countError = Math.abs(this.range / this.stepSizes[stepName] - this.count);
      
      if (countError < bestStep.error) {
        bestStep.name = stepName;
        bestStep.size = this.stepSizes[stepName];
        bestStep.error = countError;
      }
    }
    
    //round the min and max values to the selected step size
    roundMin = ((this.min / bestStep.size) >> 0) * bestStep.size;
    roundMax = (Math.ceil(this.max / bestStep.size)) * (bestStep.size);
    
    //generate converted date strings for each step between rounded min and max
    this.ticks = [];
    for (tickVal = roundMin; tickVal <= roundMax; tickVal += bestStep.size) {
      //only add the tick if it is in range
      if (tickVal >= this.min && tickVal <= this.max) {
        this.ticks.push({
          label: this.dateToString(new Date(tickVal)),
          value: tickVal
        });
      }
    }
    
    return this.ticks;
  }
});