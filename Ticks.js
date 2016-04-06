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

enyo.kind({
  name: "DateTicks",
  kind: "Ticks",
  published: {
    timeZone: 0,
    dateFormat: "$YYYY-$M-$D $h:$m:$s.$ms $AMPM $T"
  },
  constructor: function (opts) {
    this.inherited(arguments);
    
    this.formatChanged();
  },
  formatCodes: {
    "$ampm" : function(date) {
      return date.getUTCHours() > 12 ? "pm" : "am";
    },
    "$AMPM" : function(date) {
      return date.getUTCHours() > 12 ? "PM" : "AM";
    },
    "$ms": function(date) {
      return date.getUTCMilliseconds()
    },
    "$s": function(date) {
      var seconds = date.getUTCSeconds();
      return (seconds < 10 ? "0" : "") + seconds;
    },
    "$m": function(date) {
      var min = date.getUTCMinutes();
      return (min < 10 ? "0" : "") + min;
    },
    "$H": function(date) {
      var hours = date.getUTCHours();
      return (hours < 10 ? "0" : "") + hours;
    },
    "$h": function(date) {
      var hours = date.getUTCHours();
      hours -= (hours > 12 ? 12 : 0);
      return (hours < 10 ? "0" : "") + hours;
    },
    "$D": function(date) {
      var dom = date.getUTCDate();
      return (dom < 10 ? "0" : "") + dom;
    },
    "$DOW": function(date) {
      return date.getUTCDay();
    },
    "$DOY": function(date) {
      var ms, day, zeros;
      
      //find out how many milliseconds have elapsed since the start of the year
      ms = date - (+(new Date(date.getUTCFullYear(), 0, 0)));
  
      //convert ms to full days that have elapsed
      day = (ms / 86400000) >> 0;
  
      //get zeros for paddings
      zeros = day < 10 ? "00" : day < 100 ? "0" : "";
  
      return zeros + day;
    },
    "$M": function(date) {
      var month = date.getUTCMonth() + 1;
      return (month < 10 ? "0" : "") + month;
    },
    "$YYYY": function(date) {
      return date.getUTCFullYear();
    },
    "$YY": function(date) {
      return date.getUTCFullYear() % 2000;
    },
    "$T": function() {
      return "GMT" + (this.timeZone < 0 ? "" : "+") + this.timeZone;
    } 
  },
  formatChanged: function() {
    //make sure format is a string because we are about
    //to do some really stringy stuff to it
    var format = ((this.dateFormat || "") + "");
    
    //split up the format string
    this._format = format.match(/(\$[A-Za-z]+)/g);
    
    console.log(this._format)
  },
  
  dateToString: function(date) {
    var convertedDate = [];
    
    //adjust the date based on the time zone
    date.setUTCHours(-this.timeZone);
    
    //convert any format codes to the date value
    this._format.forEach(function(fmtCode) {
      convertedDate.push(
        this.formatCodes[fmtCode] ? this.formatCodes[fmtCode](date) : fmtCode
      );
    }, this);
    
    return convertedDate.join("");
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
    console.log("DSA", this.dateToString(new Date));
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
    
  }
});